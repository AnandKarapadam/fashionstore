const User = require("../../models/userSchema")
const nodemailer = require("nodemailer");
const env  = require("dotenv").config();
const bcrypt = require("bcrypt");

let loadHomepage = async (req,res)=>{
    try {
        const userId = req.session.user;
        
        if(userId){
            const userData = await User.findOne({_id:userId});
            if(!userData.isBlocked){
                return res.render("user/home",{search : "Anand",sort:"low to high",category:"pants",minPrice:1000,maxPrice:2000,products:["p1","p2","p3"],totalPages:3,currentPage:4,user:userData});
            }
            else{
                return res.redirect("/signup");
            }
            
        }
        else{
             return res.redirect("/landingpage");
        }
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server error");
    }
}

let loadLandingPage = async(req,res)=>{
    try {
        if(!req.session.user){
            res.render("user/landingpage",{search:"",sort:"low to high",category:"pants",minPrice:1000,maxPrice:2000,products:["p1","p2","p3"],totalPages:3,currentPage:4});
        }
        else{
            res.redirect("/");
        }
    } catch (error) {
        console.log(error.message)
    }
}

let loadLogin = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render("user/login");
        }
        else{
            return res.redirect("/");
        }
        
    } catch (error) {
        console.log(error.message);
        res.redirect("/pageNotFound");
    }
}

let login = async(req,res)=>{
    try {

        const {email,password} = req.body;
        const findUser = await User.findOne({isAdmin:false,email});

        if(!findUser){
            return res.render("user/login",{message:"User not found!"});
        }
        if(findUser.isBlocked){
            return res.render("user/login",{message:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("user/login",{message:"Incorrect password"});
        }

        
         req.session.user = findUser._id;
         req.session.save(() => {
         res.redirect("/"); 
         });

    } catch (error) {
        console.error("login error",error);
        res.render("user/login",{message:"Login failed Please try again later.."});
    }
}
let loadSignup = async(req,res)=>{
    try {
        
        return res.render("user/signup");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}
 
function generateOtp(){
    return Math.floor(10000 + Math.random()*90000).toString()
}

 async function sendVerificationEmail(email,otp){
    try {

        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP : ${otp}</b>`
        })

        return info.accepted.length > 0
        
    } catch (error) {
        console.log("Error sending email",error);
        return false;
    }
 }

let signup = async (req,res)=>{
    try {

        const {name,email,phone,password,confirmPassword} = req.body;

        if(password !== confirmPassword){
           return res.render("/signup",{message:"Password do not match"})
        }
        const findUser = await User.findOne({email});
        if(findUser){
            return res.render("user/signup",{message:"User with this email already exists!"})
        }

        const otp = generateOtp();

        const emailSend = sendVerificationEmail(email,otp);

        if(!emailSend){
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.usersData = {name,phone,email,password};

        res.render("user/verify-otp");
        console.log("OTP Sent",otp);

    } catch (error) {
        console.log("Signup Error",error);
        res.redirect("../../views/user/pageNotFound");
    }
}

let loadOtp = async (req,res)=>{
    try {
        return res.render("user/otp");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}
let loadForgetpage = async (req,res)=>{
    try {

        return res.render("user/forgot-password");
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send("server error");
    }
}

let loadProductdetails = async(req,res)=>{
    try {
        
        return res.render("user/product_details",{product:"hello"});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error",);
    }
}
let loadPageNotFound = async(req,res)=>{
    try {
        
        return res.render("user/pageNotFound");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error")
    }
}

let securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;
    } catch (error) {
        
    }
}
let verifyOTP = async (req,res)=>{
    try {
        const {otp} =   req.body;
        
        console.log("Stored OTP:", req.session.userOtp);
        console.log("Entered OTP:", otp);

        if(Number(otp) === Number(req.session.userOtp)){
            const user = req.session.usersData;

            const passwordHash = await securePassword(user.password);

            const saveUserData  = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
            })

            await saveUserData.save();

            req.session.user = saveUserData._id; 
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalied OTP, Please try again!"})
        }
        
    } catch (error) {
        console.log("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"});   
    }
}
const resendOTP = async(req,res)=>{
    try {
        const {email} = req.session.usersData;

        if(!email){
            res.status(400).json({success:false,message:"Email found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSend = await sendVerificationEmail(email,otp);

        if(emailSend){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:"OTP Resend successfully"});
        }
        else{
            res.status(500).json({success:false,message:"Failed to resend OTP please try again"});
        }
        
    } catch (error) {
        console.error("Error in resending OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error Please try again."});
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("cannot destroy session",err.message);
                return res.redirect("/pageNotFound")
            }

            res.clearCookie("connect.sid");
            return res.redirect("/landingpage")

        })
    } catch (error) {
        console.log("Logout error",error);
        res.redirect("/pageNotFound");
    }
}
module.exports = {
    loadHomepage,
    loadLogin,
    loadSignup,
    loadOtp,
    loadForgetpage,
    loadProductdetails,
    loadPageNotFound,
    signup,
    verifyOTP,
    resendOTP,
    login,
    logout,
    loadLandingPage
}