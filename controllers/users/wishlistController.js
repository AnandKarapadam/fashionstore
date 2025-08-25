const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const logger = require("../../utils/logger");

const loadWishlistPage = async(req,res)=>{
  try {

    const userId = req.session.user;
    const search = req.query.search||"";
    const page = parseInt(req.query.page)||1;
    const limit = 3;
    const skip = (page-1)*3;

    let user
            if(userId){
                 user = await User.findById(userId);
            }        
    
    
    const wishlist = await Wishlist.findOne({userId}).populate("products.productId");

    let allproducts = [];

    if(wishlist && wishlist.products.length>0){
      const sorted = wishlist.products.slice().sort((a,b)=>b.addedOn-a.addedOn);

      allproducts = sorted.map(item=>({
        product:item.productId,
        addedOn:item.addedOn
      }));

      if(search.trim()!== ""){
        const regex = new RegExp(search.toLowerCase(),'i');
        allproducts = allproducts.filter(item=> regex.test(item.product.productName))
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
      user,
      cssFile:"wishlist.css"
    });
  } catch (error) {
    console.log(error.message);
  }
}

const addToWishlist = async(req,res)=>{
  try {

    const productId = req.params.productId;
    const userId = req.session.user;

    if(!userId){
      logger.warn("Wishlist add attempt without login");
      return res.status(401).json({message:"Please login to your account"})
    }

    if(!mongoose.Types.ObjectId.isValid(productId)){
      return res.status(401).json({message:"Invalid Product ID!"});
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
        logger.error("product is already in wishlist.")
      return res.status(409).json({message:"Product is already in wishlist."});
    }
      wishlist.products.push({productId});
    }

    await wishlist.save();  

    return res.status(200).json({message:"Product added to wishlist."})

    
    
  } catch (error) {
    logger.error(`Error in addToWishlist: ${error.message}`, { stack: error.stack });
    res.status(500).json({ success: false, message: "Server error" });

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
      logger.error("Cannot find the product from wishlist!");
      return res.status(404).json({success:false,message:"Cannot find the product from wishlist!"});
    }

    res.status(200).json({success:true,message:"Item removed from wishlist."})
    
  } catch (error) {
    console.error("Error:",error.message);
  }
}

const toggleAddToWishlist = async(req,res)=>{
  try {
    const userId = req.session.user;
    const {productId} = req.body;

    if(!userId){
      logger.warn("Please login to your accout");
      return res.json({success:false,message:"Please login to your account"});
    }
    let wishlist = await Wishlist.findOne({userId});

    if(!wishlist){
      wishlist = new Wishlist({userId,products:[{productId}]});
    }
    else{
      if(!wishlist.products.includes(productId)){
        wishlist.products.push({productId});
      }
    }

    await wishlist.save();
    res.json({success:true,message:"Added"});
    
  } catch (error) {
    console.log("Error:",error.message);
  }
}
const toggleRemoveFromWishlist = async (req,res)=>{
  try {

    const userId = req.session.user;
    const {productId} = req.body;

    if(!userId){
      return res.json({success:false,message:"Please login to your account"});
    }

    let wishlist = await Wishlist.findOne({userId});
    if(!wishlist){
      return res.json({success:false,message:"Wishlist not found"});
    }

    wishlist.products = wishlist.products.filter(
      (item)=>item.productId.toString()!==productId
    )
    await wishlist.save();

    res.json({success:true,message:"Product removed form wishlist"})
    
  } catch (error) {
    console.log("Error:",error.message);
  }
}
module.exports = {
    loadWishlistPage,
    addToWishlist,
    moveToCart,
    removeWishlistItem,
    toggleAddToWishlist,
    toggleRemoveFromWishlist
}