const user = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");


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
                return res.redirect("/login");
            }
        }
        else{
            return res.redirect("/login")
        }
    } catch (error) {
        console.log("Login error",error.message);
        return res.redirect("/pageerror");
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
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError
}









