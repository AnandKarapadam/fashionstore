const User = require("../../models/userSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");


function generateOtp(){
    const digits = "1234567890";
    let otp="";
    for(let i=0;i<5;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp;
}
const sendVerificationEmail = async (email,otp)=>{
    try {

        const transporter = nodeMailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        
        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is:${otp}`,
            html:`<h4>Your OTP: <strong>${otp}</strong></h4><br>`
        }
        
        const info = await transporter.sendMail(mailOptions);
        console.log("Email Send",info.messageId);
        return true

    } catch (error) {
        console.error("Sending Email Error",error.message);
        return false;
    }
}

const loadForgetpage = async(req,res)=>{
    try {
        
        res.render("user/forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
        console.error("Error in loading forget page",error.message);
    }
}
const forgetEmailValid = async(req,res)=>{
    try {

        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("user/forgotOTP");
                console.log("OTP",otp);
            }else{
                res.json({success:false,message:"Failed to send OTP!"})
            }

        }
        else{
            res.render("user/forgot-password",{message:"User with this email doesnot exist"});
        }
        
    } catch (error) {
        res.redirect("/pageNotFound");
        console.error("Error ",error.message);

    }
}

module.exports = {
    loadForgetpage,
    forgetEmailValid
}