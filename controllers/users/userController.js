const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require("../../models/bannerSchema");
const Review = require("../../models/reviewSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");

let loadHomepage = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const findBanner = await Banner.findOne({
      startDate: { $lt: new Date(today) },
      endDate: { $gt: new Date(today) },
    });
    const userId = req.session.user;

    if (userId) {
      const userData = await User.findOne({ _id: userId });
      if (!userData.isBlocked) {
        const category = await Category.find({}).lean();

        for (let cat of category) {
          const product = await Product.findOne({
            category: cat._id,
            status: "Available", // matching your enum value
            isBlocked: false,
          }).lean();

          cat.image = product?.productImage?.[0]
            ? `/uploads/product-images/${product.productImage[0]}`
            : "/images/default-category.jpg";
        }
        const products = await Product.find().sort({ quantity: 1 });
        return res.render("user/home", {
          category,
          user: userData,
          banner: findBanner,
          products,
        });
      } else {
        req.session.destroy(() => {
          return res.redirect("/login");
        });
      }
    } else {
      return res.redirect("/landingpage");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
};

let loadLandingPage = async (req, res) => {
  try {
    if (!req.session.user) {
      const today = new Date().toISOString();
      const findBanner = await Banner.findOne({
        startDate: { $lt: new Date(today) },
        endDate: { $gt: new Date(today) },
      });
      const products = await Product.find().sort({ quantity: 1 });
      const category = await Category.find({}).lean();

      for (let cat of category) {
        const product = await Product.findOne({
          category: cat._id,
          status: "Available",
          isBlocked: false,
        }).lean();

        cat.image = product?.productImage?.[0]
          ? `/uploads/product-images/${product.productImage[0]}`
          : "/images/default-category.jpg";
      }
      res.render("user/landingpage", {
        category,
        banner: findBanner,
        products,
      });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.log(error.message);
  }
};

let loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      

      return res.render("user/login");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.log(error.message);
    res.redirect("/pageNotFound");
  }
};

let login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: false, email });

    if (!findUser) {
      return res.render("user/login", { message: "User not found!" });
    }
    if (findUser.isBlocked) {
      return res.render("user/login", { message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/login", { message: "Incorrect password" });
    }

    req.session.user = findUser._id;
    req.session.save(() => {
      res.redirect("/");
    });
  } catch (error) {
    console.error("login error", error);
    res.render("user/login", {
      message: "Login failed Please try again later..",
    });
  }
};
let loadSignup = async (req, res) => {
  try {
    return res.render("user/signup");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
};

function generateOtp() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP : ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
}

let signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("user/signup", { message: "Password do not match" });
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("user/signup", {
        message: "User with this email already exists!",
      });
    }

    const otp = generateOtp();

    const emailSend = await sendVerificationEmail(email, otp);

    if (!emailSend) {
      return res.render("user/signup", {
        message: "Email sending failed, check network connection!",
      });
    }

    req.session.userOtp = otp;
    req.session.usersData = { name, phone, email, password };

    res.render("user/verify-otp");
    console.log("OTP Sent", otp);
  } catch (error) {
    console.log("Signup Error", error);
    res.redirect("/pageNotFound");
  }
};

let loadOtp = async (req, res) => {
  try {
    return res.render("user/verify-otp");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server error");
  }
};

let loadProductdetails = async (req, res) => {
  try {
    return res.render("user/product_details", { product: "hello" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};
let loadPageNotFound = async (req, res) => {
  try {
    return res.render("user/pageNotFound");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

let securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {}
};
let verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("Stored OTP:", req.session.userOtp);
    console.log("Entered OTP:", otp);

    if (Number(otp) === Number(req.session.userOtp)) {
      const user = req.session.usersData;

      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });

      await saveUserData.save();

      req.session.user = saveUserData._id;
      req.session.save((err) => {
        if (err) {
          console.error("error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Failed to save session." });
        }
        return res.json({ success: true, redirectUrl: "/login" });
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalied OTP, Please try again!" });
      console.log("error occured in otp sending");
    }
  } catch (error) {
    console.log("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};
const resendOTP = async (req, res) => {
  try {
    const { email } = req.session.usersData;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      console.log("Resend OTP", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to resend OTP please try again",
        });
    }
  } catch (error) {
    console.error("Error in resending OTP", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error Please try again.",
      });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("cannot destroy session", err.message);
        return res.redirect("/pageNotFound");
      }

      res.clearCookie("connect.sid");
      return res.redirect("/landingpage");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

const loadAllProductsPage = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 4;
    let skip = (page - 1) * limit;

    const {
      search = "",
      category = "",
      sort = "",
      minPrice = 0,
      maxPrice = 100000,
    } = req.query;

    let categoryName = null;

    if (category) {
      const categoryDoc = await Category.findById(category).lean();
      if (categoryDoc) {
        categoryName = categoryDoc.name;
      }
    }

    let query = {
      salePrice: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) },
      isBlocked: false,
    };
    if (search) {
      query.productName = { $regex: new RegExp(search, "i") };
    }
    if (category) {
      query.category = category;
    }

    let sortOption = {};
    if (sort === "priceHighLow") sortOption.salePrice = -1;
    else if (sort === "priceLowHigh") sortOption.salePrice = 1;
    else if (sort === "nameAsc") sortOption.productName = 1;
    else if (sort === "nameDesc") sortOption.productName = -1;

    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);
    const categories = await Category.find({ isListed: true });

    const matchedProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(matchedProducts / limit);

    res.render("user/allproducts", {
      products,
      search,
      category,
      sort,
      minPrice,
      maxPrice,
      currentPage: page,
      totalPages,
      categories,
      categoryName,
    });
  } catch (error) {
    console.error("Cannot render all products page", error.message);
    res.redirect("/pageNotFound");
  }
};

const getProductDetails = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({
      _id: id,
      isBlocked: false,
      status: { $ne: "Discontinued" },
    })
      .populate("category")
      .populate("brand")
      .lean();

    if (!product) {
      return res.redirect("/pageNotFound");
    }

    const reviews = await Review.find({ product: id })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isBlocked: false,
    })
      .populate("category")
      .lean();

    res.render("user/product_details", { product, relatedProducts, reviews });
  } catch (error) {
    res.redirect("/pageNotFound");
    console.error("Error while rendering product details:", error.message);
  }
};
const postReview = async (req, res) => {
  try {
    const id = req.params.id;
    const user = req.session.user;

    if (!user) {
      return res.redirect("/login");
    }

    const { rating, comment } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.redirect("/pageNotFound");
    }

    const newReview = new Review({
      user: user,
      product: id,
      rating: Number(rating),
      comment: comment,
    });

    await newReview.save();

    const reviews = await Review.find({ product: id });

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(id, {
      "ratings.average": averageRating,
      "ratings.count": reviews.length,
    });

    const updatedProduct = await Product.findOne({ _id: id })
      .populate("category")
      .populate("brand")
      .lean();

    const updateReview = await Review.find({ product: id })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isBlocked: false,
    })
      .populate("category")
      .lean();

    res.render("user/product_details", {
      product: updatedProduct,
      reviews: updateReview,
      relatedProducts,
    });
  } catch (error) {
    res.redirect("/pageNotFound");
    console.error("Error in adding Review: ", error.message);
  }
}


const addToCart = async(req,res)=>{
  try {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity)||1;
    const id = req.session.user;

    let product = await Product.findById({_id:productId})

    if(!product||product.isBlocked||product.quantity<=0){
      return res.render("user/product_details",{error:"Product is not available"});
    }

    const price = product.salePrice || product.regularPrice;
    const totalPrice = price*quantity;

    let cart = await Cart.findOne({userId:id})

    if(!cart){
      cart = new Cart({
        userId:id,
        items:[{productId,quantity,price,totalPrice}]
      })
    }else{
      const itemIndex = cart.items.findIndex((item)=>item.productId.toString() === productId.toString());

      if(itemIndex >-1){
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * cart.items[itemIndex].quantity;
        
      }
      else{
        cart.items.push({productId,quantity,price,totalPrice});
      }
    }
    await cart.save();
    
    res.redirect("/cart");


  } catch (error) {
    console.error("Error :",error.message);
  }
}
// CART Page
const loadCartPage = async(req,res)=>{
  try {

    const id = req.session.user;
    const page = parseInt(req.query.page)||1;
    const search = req.query.search||"";
    const limit = 4;
    const skip = (page-1)*limit;

    const cart  = await Cart.findOne({userId:id}).populate("items.productId");
    

    if(!cart || cart.items.length === 0){
      return res.render("user/cart",{
        currentPage:1,
        totalPages:1,
        search:"",
        items:[],
        subtotal:0});
    }

    const filterItems = search?cart.items.filter(item=>{
       const name = item.productId.productName.toLowerCase();
      const regex = new RegExp(search.toLowerCase(), 'i'); // 'i' for case-insensitive
      return regex.test(name);
    }):cart.items;

    const totalItems = filterItems.length;
    const totalPages = Math.ceil(totalItems/limit);

    const paginateItems = filterItems.slice(skip,skip+limit);

    const subtotal = paginateItems.reduce((acc,item)=>{
      return acc+item.totalPrice;
    },0);   

    

    
    res.render("user/cart",{
      currentPage:page,
      totalPages,
      items:paginateItems,
      subtotal,
      search
    })

  } catch (error) {
    console.error("Error:",error.message);
  }
}

const updateCartQuantity = async(req,res)=>{
  try {

  const { productId, quantity } = req.body;
  const userId = req.session.user;


    const cart = await Cart.findOne({ userId });

    const item = cart.items.find(i => i.productId.equals(productId));
    if (!item) return res.json({ success: false, message: 'Item not found' });

    item.quantity = quantity;
    item.totalPrice = item.price * quantity;

    await cart.save();

    res.json({ success: true });
  } 
   catch (error) {
    console.error("Error:",error.message);
  }
}

const removeCartItem = async(req,res)=>{
  try {

    const cartItemId = req.params.cartItemId;
    const userId = req.session.user;

    console.log(cartItemId);

    const result = await Cart.updateOne({userId},{$pull:{items:{_id:cartItemId}}})

    if(result.modifiedCount === 0){
      return res.status(404).json({success:false,message:"Item not found in cart"});
    }

    res.status(200).json({success:true,message:"Item removed successfully from cart."});
    
  } catch (error) {
    console.log(error.message);
  }
}

const addToWishlist = async(req,res)=>{
  try {

    const productId = req.params.productId;
    const userId = req.session.user;

    if(!mongoose.Types.ObjectId.isValid(productId)){
      return res.json({message:"Invalid Product ID!"});
    }

    let wishlist = await Wishlist.findOne({userId});

    if(!wishlist){
      wishlist = new Wishlist({
        userId,
        products:[{productId}]
      })
    }
    else{
      const alreadyExists = wishlist.products.some(item=>{
        const id = item.productId;
        return item.productId.toString() === productId;
      })
      if(alreadyExists){
      return res.status(409).json({message:"Product is already in wishlist."});
    }
      wishlist.products.push({productId});
    }

    await wishlist.save();  

    return res.status(200).json({message:"Product added to wishlist."})

    
    
  } catch (error) {
    console.error("Error:",error.message);
  }
}


const loadWishlistPage = async(req,res)=>{
  try {

    const userId = req.session.user;
    const search = req.query.search||"";
    const page = parseInt(req.query.page)||1;
    const limit = 3;
    const skip = (page-1)*3;
    
    const wishlist = await Wishlist.findOne({userId}).populate("products.productId");

    let allproducts = [];

    if(wishlist && wishlist.products.length>0){
      const sorted = wishlist.products.slice().sort((a,b)=>b.addedOn-a.addedOn);

      allproducts = sorted.map(item=>({
        product:item.productId,
        addedOn:item.addedOn
      }));

      if(search.trim()!== ""){
        const regex = new RegExp(search,'i');
        allproducts = allproducts.filter(item=> regex.test(item.productName))
      }
    }

    const totalProducts = allproducts.length;
    const totalPages = Math.ceil(totalProducts/limit);
    const paginateItems = allproducts.slice(skip,skip+limit);
    
    res.render("user/wishlist",{
      search,
      products:paginateItems,
      totalPages,
      currentPage:page,
    });
  } catch (error) {
    console.log(error.message);
  }
}

const moveToCart = async(req,res)=>{
  try {

    const userId = req.session.user;
    const productId = req.params.id;

    await Wishlist.updateOne(
      {userId},
      {$pull:{products:{productId}}}
    )

    const product = await Product.findById(productId);

    const price = product.salePrice;
    const totalPrice = price;

    let usercart = await Cart.findOne({userId});

    if(!usercart){
      usercart = new Cart({
        userId,
        items:[{productId,quantity:1,price,totalPrice}]
      })
    }else{

      if (!Array.isArray(usercart.items)) {
        usercart.items = [];
      }
      const existingProduct = usercart.items.find(p=>p.productId.equals(productId));


      if(existingProduct){
        existingProduct.quantity+=1;
        existingProduct.totalPrice = existingProduct.quantity*existingProduct.price;
        usercart.markModified("items");
      }
      else{
        usercart.items.push({productId,quantity:1,price,totalPrice})
      }
    }

    await usercart.save();

    res.redirect("/wishlist");

    
  } catch (error) {
    console.error("Error",error.message);
  }
}

const removeWishlistItem = async (req,res)=>{
  try {

    const productId = req.params.id;
    const userId = req.session.user;

    const result = await Wishlist.updateOne({userId},{$pull:{products:{productId}}})

    if(result.modifiedCount === 0){
      return res.status(404).json({success:false,message:"Cannot find the product from wishlist!"});
    }

    res.status(200).json({success:true,message:"Item removed from wishlist."})
    
  } catch (error) {
    console.error("Error:",error.message);
  }
}

const loadSelectAddress = async(req,res)=>{
  try {
    
    res.render("user/selectAddress");

  } catch (error) {
    console.error("Error",error.message);
  }
}

const loadPaymentPage = async(req,res)=>{
  try {
     res.render("user/payment");
  } catch (error) {
    console.error("Error:",error.message);
  }
}
module.exports = {
  loadHomepage,
  loadLogin,
  loadSignup,
  loadOtp,
  loadProductdetails,
  loadPageNotFound,
  signup,
  verifyOTP,
  resendOTP,
  login,
  logout,
  loadLandingPage,
  loadAllProductsPage,
  getProductDetails,
  postReview,
  loadCartPage,
  loadSelectAddress,
  loadPaymentPage,
  addToCart,
  updateCartQuantity,
  removeCartItem,
  loadWishlistPage,
  addToWishlist,
  moveToCart,
  removeWishlistItem
};
