const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const { findById } = require("../../models/userSchema");

const getBrandPage = async(req,res)=>{
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page)||1;
        const limit = 4;
        const skip = (page-1)*limit;

        const query = search?{brandName:{$regex:search,$options:"i"}}:{};

        const brandData = await Brand.find(query).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments(query);
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrands  = brandData.reverse();

        res.render("admin/brands",{
            search,
            data:reverseBrands,
            totalPages:totalPages,
            totalBrands:totalBrands,
            currentPage:page,
            brands:reverseBrands,
            cssFile:"admin/dashboard"

        })

    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error",error.message);
    }
}

let addNewBrand = async(req,res)=>{
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brandName:brand});
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName:brand,
                brandImage:image
            })

            await newBrand.save();
            res.redirect("/admin/brands");
        }
        

    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const toggleBrandStatus = async(req,res)=>{
    try {
        const id = req.params.id;

        const findBrand = await Brand.findById(id);
        if(!findBrand){
            res.redirect("/admin/brands");
        }

        findBrand.isBlocked = !findBrand.isBlocked;
        await findBrand.save();

        await Product.updateMany(
            {brand:id},
            {$set:{isBlocked:findBrand.isBlocked}}
        )
        res.redirect("/admin/brands");

    } catch (error) {
        res.redirect("/admin/pageerror");
    }
}

const loadeditBrand = async(req,res)=>{
    try {
        const id = req.params.id;
        const brand = await Brand.findById(id);
        if(!id){
            return res.redirect("/amdin/brands");
        }
        res.render("admin/editBrand",{brand});

    } catch (error) {
        res.redirect("/admin/pageerror");
    }
}
const editBrand = async(req,res)=>{
    try {
        const id = req.params.id;
        const name = req.body.name;
        const updateData = {brandName:name};

        if(req.file){
            updateData.brandImage = req.file.filename;
        }
        
        await Brand.findByIdAndUpdate(id,updateData);

        res.redirect("/admin/brands");
        
    } catch (error) {

        console.error(error);
        res.redirect("/admin/pageerror");
        
    }
}

const deleteBrand = async(req,res)=>{
    try {
        const id = req.params.id;

        await Brand.findByIdAndDelete(id);

        res.redirect("/admin/brands");
    } catch (error) {
        
    }
}
module.exports = {
    getBrandPage,
    addNewBrand,
    toggleBrandStatus,
    editBrand,
    loadeditBrand,
    deleteBrand
}
