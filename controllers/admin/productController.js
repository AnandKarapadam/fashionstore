const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { options } = require("../../app");


const getProductAddPage = async(req,res)=>{
    try {
        const categorys = await Category.find({isListed:true});
        const brands = await Brand.find({isBlocked:false});
        res.render("admin/addProduct",{cssFile:"admin/dashboard",categorys,brands},);
    } catch (error) {
        res.redirect("/admin/pageerror"); 
    }
}

const addproduct = async(req,res)=>{
    try {

        const products = req.body;
        const productExisting = await Product.find({productName:products.productName});

       

            if(productExisting.length === 0){
                const images = [];

                if(req.files && req.files.length>0){
                    for(let i=0;i<req.files.length;i++){
                        const originalImagePath = req.files[i].path;

                        const resizedImagePath = path.join("public","uploads","product-images",req.files[i].filename);

                        await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                        images.push(req.files[i].filename);
                    }
                }
                const categoryId = await Category.findOne({name:products.category});

                if(!categoryId){
                    res.status(400).json("Invalid Category name");
                }

                let roundedOffer = '';
                if(products.actualPrice && products.discountPrice){
                    const offer = ((products.actualPrice -products.discountPrice) / products.actualPrice) * 100;
                    roundedOffer = Math.round(offer);
                }

                const newProduct = new Product({
                    productName:products.productName,
                    description:products.description,
                    brand:products.brands,
                    category:products.category,
                    regularPrice:products.actualPrice,
                    salePrice:products.discountPrice,
                    quantity:products.quantity,
                    productOffer:roundedOffer||"",
                    color:products.color,
                    productImage:images,
                    status:"Available",
                })
                await newProduct.save();

                return res.redirect("/admin/add-product");
            }
        else{
            return res.status(400).json("Product already exists");
        }
        
    } catch (error) {
        console.log("Error in saving new Product");
        return res.redirect("/admin/pageerror");
        
    }
}

const loadProductsPage = async(req,res)=>{
    try {
        const search = req.query.search||"";
        const page = req.query.page||1;

        const limit = 4;
        const skip = (page-1)*limit;
        const brandMatch = await Brand.find({
               brandName: { $regex: new RegExp(search, "i") }
                       }).select("_id");

        const brandIds = brandMatch.map(b => b._id);
        const query = {
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$in:brandIds}}
            ]
        }
        const productData = await Product.find(query).limit(limit).skip(skip).populate("category").populate("brand").exec();

        const count = await Product.find(query).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category&&brand){
            res.render("admin/products",{
                products:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brands:brand,
                cssFile:'admin/dashboard',
                search

            })
        }
        else{
            res.redirect("/admin/pageerror")
        }
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.log("Error in loading the product page",error.message);
    }
}

const removeOffer = async(req,res)=>{
    try {
        const id = req.params.id;

        await Product.findByIdAndUpdate(id,{salePrice:"",productOffer:""});

        res.redirect("/admin/products");
        
    } catch (error) {
        console.log("Error removing offer:",error.message);
        res.redirect("/admin/pageerror");
    }
}

const addOffer = async(req,res)=>{
    try {
        const id = req.params.id;
        const offerPrice = parseFloat(req.body.offerPrice);
        const productData = await Product.findById(id);
        


        if(productData){
            const realPrice = productData.regularPrice;
            const offer = ((realPrice-offerPrice)/realPrice)*100;
            await Product.findByIdAndUpdate(id,{
                salePrice:offerPrice,
                productOffer:Math.round(offer)});
                
        }
        res.redirect("/admin/products");
        
    } catch (error) {
        console.error("Error in add offer:",error.message);
        res.redirect("/admin/pageerror");
    }
}

const toggleIsBlocked = async(req,res)=>{
    try {
        const id  = req.params.id;
       // await Product.findByIdAndUpdate(id, { $bit: { isBlocked: { xor: 1 } } }); simpler version//
        const productData = await Product.findById(id);
        if (!productData) {
            return res.redirect("/admin/pageerror");
        }
        productData.isBlocked = !productData.isBlocked;

        await productData.save();

        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in updating status",error.message);
    }
}

const productDelete = async (req,res)=>{
    try {
        const id = req.params.id;

        await Product.findByIdAndDelete(id);

        res.redirect("/admin/products");

    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in deleting product!",error.message);
    }
}

const loadEditProduct = async(req,res)=>{
    try {
        const id = req.params.id;
        const productData = await Product.findById(id);
        
        if(!productData){
            return res.redirect("/admin/pageerror");
        }

        const category = await Category.find();
        const brand = await Brand.find();

        res.render("admin/editProduct",{cssFile:"admin/dashboard",product:productData,categories:category,brands:brand});
    } catch (error) {
        console.error("Error in rendering edit page",error.message);
        res.redirect("/admin/pageerror");
    }
}


const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      return res.redirect("/admin/pageerror");
    }

    
    existingProduct.productName = req.body.name;
    existingProduct.description = req.body.description;
    existingProduct.brand = req.body.brand;
    existingProduct.category = req.body.category;
    existingProduct.color = req.body.color;
    existingProduct.regularPrice = req.body.actualPrice;
    existingProduct.salePrice = req.body.discountPrice;
    existingProduct.quantity = req.body.quantity;

    
    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map(file => file.filename);

      
      uploadedImages.forEach((img, index) => {
        if (existingProduct.productImage[index]) {
          const oldImagePath = path.join("public", "uploads", "product-images", existingProduct.productImage[index]);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
          existingProduct.productImage[index] = img;
        } else {
          
          existingProduct.productImage.push(img);
        }
      });
    }

    await existingProduct.save();
    res.redirect("/admin/products");

  } catch (error) {
    console.error("Error while editing product:", error.message);
    res.redirect("/admin/pageerror");
  }
}


module.exports = {
    getProductAddPage,
    addproduct,
    loadProductsPage,
    removeOffer,
    addOffer,
    toggleIsBlocked,
    productDelete,
    loadEditProduct,
    editProduct
}