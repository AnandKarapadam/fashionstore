const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


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




module.exports = {
    getProductAddPage,
    addproduct
}