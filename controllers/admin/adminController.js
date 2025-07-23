const user = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");
const session = require("express-session");


const loadLogin = async(req,res)=>{
    try {

        if(req.session.admin){
            return res.redirect("/admin/dashboard");
        }
        else{res.render("admin/login",{message:null,cssFile:"admin/login"});}
        
        
    } catch (error) {
        
    }
}
const login = async(req,res)=>{
    try {
        const {email,password}  = req.body;
        const adminData = await User.findOne({email,isAdmin:true});
        if(adminData){
            const passwordMatch = await bcrypt.compare(password,adminData.password);
            if(passwordMatch){
                req.session.admin = true;
                return res.redirect("/admin")
            }
            else{
                return res.render("admin/login",{message:"Wrong password"});
            }
        }
        else{
            return res.render("admin/login",{message:"Admin Not Found"})
        }
    } catch (error) {
        console.log("Login error",error.message);
        return res.redirect("/admin/pageerror");
    }
}

const loadDashboard = async(req,res)=>{
    try {
        if(req.session.admin){
           return res.render("admin/dashboard",{cssFile:"admin/dashboard"});
        }
        else {
      return res.redirect("/admin/login");
    }
    } catch (error) {
        res.redirect("/pageerror");
    }
}


const pageError = async(req,res)=>{
    res.render("admin/admin-error",{cssFile:"admin/dashboard"});
}

const adminLogout = async(req,res)=>{
    try {

        const id = req.session.user;

        const adminData = await User.find({_id:id,isAdmin:true});

        if(adminData){
            req.session.destroy((err)=>{
                if(err){
                    console.error("Error in logout: ",err.message);
                    return res.redirect("/admin/pageerror");
                }

                res.clearCookie("connect.id");
                return res.redirect("/admin/login");
            })
        }
        
        
    } catch (error) {
        res.redirect("/admin/pageerror");
        console.error("Error:",error.message);
    }
}
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    adminLogout
}









