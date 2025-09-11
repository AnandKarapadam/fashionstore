
const Coupon = require("../../models/couponSchema");


const loadCouponPage = async(req,res)=>{
    try {

        const search = req.query.search ||"";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const query = search?{name:{$regex:search,$options:"i"}}:{};
        const coupons = await Coupon.find(query).skip(skip).limit(limit);
        const count = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(count/limit)||1;

        
        res.render("admin/coupon",{
            search,
            coupons,
            currentPage:page,
            totalPages
        });

    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error",error.message)
    }
}

const createCoupon = async(req,res)=>{
    try {

        const data = {
            couponName:req.body.name,
            startDate:new Date(req.body.startdate+"T00:00:00"),
            endDate: new Date(req.body.enddate+"T00:00:00"),
            offerPrice:Number(req.body.offerprice),
            minimumPrice:parseInt(req.body.minimumprice)
        }

        const existingCoupon  = await Coupon.findOne({name:data.couponName});

        if(existingCoupon){
            return res.redirect("/admin/coupon?error=CouponAlreadyExist");
        }

        const newCoupon = new Coupon({
            name:data.couponName,
            createOn:data.startDate,
            expireOn:data.endDate,
            offerPrice:data.offerPrice,
            minimumPrice:data.minimumPrice
        })

        await newCoupon.save();

        return res.redirect("/admin/coupon");
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error",error.message);
    }
}

const toggleList = async(req,res)=>{
    try {

        const id = req.params.id;

        const coupon = await Coupon.findById(id);
        if(!coupon){
            return res.redirect("/admin/pageerror");
        }

        coupon.isList = !coupon.isList;

        coupon.save();

        res.redirect("/admin/coupon");
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in toggling",errro.message);
    }
}

const loadEditCoupon = async (req,res)=>{
    try {
        const id = req.params.id;
        

        const coupon = await Coupon.findById(id);

        res.render("admin/editCoupon",{coupon});
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error in getting the edit page: ",error.message);
    }
}

const editCoupon = async(req,res)=>{
    try {

        const id = req.params.id;
        const {
            name,
            startdate,
            enddate,
            offerprice,
            minimumprice
        } = req.body;
        
        const data = await Coupon.findByIdAndUpdate(id,{
            name:name,
            createOn:startdate,
            expireOn:enddate,
            offerPrice:offerprice,
            minimumPrice:minimumprice
        })

        if(data){
            res.redirect("/admin/coupon");
        }
        else{
            res.redirect("/admin/pageerror");
        }
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error : ",error.message);
    }
}
const deleteCoupon = async(req,res)=>{
    try {

        const id = req.params.id;

        const delCoupon = await Coupon.findByIdAndDelete(id);

        if(delCoupon){
            res.redirect("/admin/coupon");
        }
        else{
            res.redirect("/admin/pageerror");
        }
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error",error.message);
    }
}

module.exports = {
    loadCouponPage,
    createCoupon,
    toggleList,
    loadEditCoupon,
    editCoupon,
    deleteCoupon
}