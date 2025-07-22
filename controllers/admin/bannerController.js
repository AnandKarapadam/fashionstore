const Banner = require("../../models/bannerSchema");
const path = require("path");
const fs = require("fs");


const getBannerPage = async(req,res)=>{
    try {
        
        const banners = await Banner.find();
        res.render("admin/banner",{search:"",banners,currentPage:1,totalPages:1})
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in loading banner page",error.message);
    }
}

const getAddBanner = async (req,res)=>{
    try {
        res.render("admin/addbanner");
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in rendering addbanner page",error.message);
    }
}

const addBanner = async (req,res)=>{
    try {

        const data = req.body;
        const image = req.file;
        const newBanner = new Banner({
            image:image.filename,
            title:data.title,
            description:data.description,
            startDate:new Date(data.startdate+"T00:00:00"),
            endDate:new Date(data.enddate+"T23:59:59"),
            link:data.link
        })

        await newBanner.save().then((data)=>console.log(data)); 

        res.redirect("/admin/banner");
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in positing banner",error.message);
    }
}

const delBanner = async(req,res)=>{
    try {
        const id = req.query.id;

        await Banner.deleteOne({_id:id}).then((data)=>console.log(data));
        res.redirect("/admin/banner");


    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Cant delete Banner!",error.message);
    }
}


module.exports = {
    getBannerPage,
    getAddBanner,
    addBanner,
    delBanner
}










