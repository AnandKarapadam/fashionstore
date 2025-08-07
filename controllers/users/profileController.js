const User = require("../../models/userSchema");
const nodeMailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const Address = require("../../models/addressSchema");

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

const securePassword = async(password)=>{
    try {
        
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
        
    } catch (error) {
        console.log("Cannot hash password..!");
        console.error("error:",error.message);
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
const verifyForgotPassOtp = async(req,res)=>{
    try {

        const enteredOTP = req.body.otp;
        console.log(req.session.userOtp);
        console.log(req.body.otp);
        if(String(enteredOTP) === String(req.session.userOtp)){
             res.json({success:true,redirectUrl:"/reset-password"});
             
        }
        else{
            res.json({success:false,message:"OTP Not Matching"});
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"Error in OTP verification!"})
        res.redirect("/pageNotFound");
        console.error("Error",error.message);
    }
}

const getResetPasswordPage = async(req,res)=>{
    try {

        res.render("user/resetpassword");
        
    } catch (error) {
        res.redirect("/pageNotFound");
        console.error("Error",error.message);
    }
}

const resendforgotOTP = async (req,res)=>{
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending otp to email:",email);
        const emailSent = await sendVerificationEmail(email,otp);

        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP Successful"});
            
        }else{
             res.status(500).json({success:false,message:"Cannot send OTP to this email!"});
        }

    } catch (error) {
        console.error("Error in resend OTP",error);
        res.redirect("/pageNotFound"); 
    }
}

const postNewPassword = async(req,res)=>{
    try {
        const {passOne,passTwo} = req.body;
        const email = req.session.email;

        if(passOne === passTwo){
            const passwordHash  = await securePassword(passOne);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
           return res.json({success:true,message:"Password Updated Successfully."})
        }
        else{
             return res.json({ success: false, message: "Passwords do not match!" });
        }
        
    } catch (error) {
        console.error("Error in Reseting Password",error)
         res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const postAddress = async(req,res)=>{
    try {

        const userId = req.session.user;
        const {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
            locality,
            address
        } = req.body;


        const userAddressDoc = await Address.findOne({userId});

        const newAddress = {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone:altPhone||"",
            locality:locality||"",
            address
        }

        if(userAddressDoc){
            userAddressDoc.address.push(newAddress);
            await userAddressDoc.save();
        }
        else{
            const newDoc = new Address({
                userId,
                address:[newAddress]
            })
            await newDoc.save();
        }

        res.redirect("/address");
    } catch (error) {
        console.error("Error-",error.message);
    }
}

const loadEditProfile = async(req,res)=>{
    try {
        res.render("user/editProfile",{search:"",category:"",sort:"",})
    } catch (error) {
        console.log(error.message);
        res.redirect("/pageNotFound");
    }
}

const loadAddressPage = async(req,res)=>{
    try {

        const search = req.query.search||"";
        const page = parseInt(req.query.page)||1;
        const limit = 2;
        const skip = (page-1)*limit;
        const userId = req.session.user;
        const regex = new RegExp(search,"i");

        const addressDoc = await Address.findOne({userId});

        if(!addressDoc){
            return res.render("user/manageAddress", {
               currentPage: 1,
               totalPages: 1,
               search,
            addresses: [{ address: [] }],
            userId
            });
        }

        const filtered = addressDoc.address.filter(addr =>
            regex.test(addr.name) ||
            regex.test(addr.city) ||
            regex.test(addr.landMark)
        );

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const paginated = filtered.slice(skip, skip + limit);

      
        


        res.render("user/manageAddress",{
            currentPage:page,
            totalPages,
            search,
            addresses:paginated,
            userId
        });
        
    } catch (error) {
        console.error(error.message);
    
    }
}
const loadProfile = async(req,res)=>{
    try {
        res.render("user/profile",{search:''})
    } catch (error) {
        console.error(error.message);
    }
}

const loadNewAddressPage = async(req,res)=>{
    try {

        res.render("user/addAddress",{})
        
    } catch (error) {
        console.error("Error: ",error.message);
    }
}

const loadEditAddressPage = async(req,res)=>{
    try {
        const userId = req.session.user;
        const addressId = req.params.id;

        const addressDoc = await Address.findOne({userId})
        
        const selectedAddress =await addressDoc.address.find(a=>a._id.toString() === addressId);

        if(!selectedAddress){
            return res.redirect("/manage-address");
        }

        res.render("user/editAddress",{address:selectedAddress});
    } catch (error) {
        console.error("Error:",error.message);
    }
}

const postEditAddress = async(req,res)=>{
    try {
        const addressId = req.params.id;
        const userId  = req.session.user;

        const {
            name,
            phone,
            pincode,
            locality,
            address,
            city,
            state,
            landMark,
            altPhone,
            addressType
        } = req.body;

        const updated  = await Address.updateOne(
            {userId,"address._id":addressId},{
                $set:{
                    "address.$.name":name,
                    "address.$.phone":phone,
                    "address.$.pincode":pincode,
                    "address.$.locality":locality,
                    "address.$.address":address,
                    "address.$.city":city,
                    "address.$.state":state,
                    "address.$.landMark":landMark,
                    "address.$.altPhone":altPhone,
                    "address.$.addressType":addressType
                }
            }
        )

        if(updated.modifiedCount === 0){
        const addressDoc = await Address.findOne({userId})
        
        const selectedAddress =await addressDoc.address.find(a=>a._id.toString() === addressId);

        return res.render("user/editAddress",{address:selectedAddress,message:"Address Not found!"});
        }
        
        res.redirect("/address");

    } catch (error) {
        console.error("Error:",error.message);
    }
}

const deleteAddress = async(req,res)=>{
    try {

        const addressId = req.params.id;
        const userId = req.session.user;

       const updated =  await Address.updateOne({userId},
            {$pull:{address:{_id:addressId}}}
        )

        if(updated.modifiedCount === 0){
           return res.status(404).send("Cannot delete address");
        }

        res.status(200).send("Deleted successfully");
        
    } catch (error) {
        console.error("Error:",error.message);
    }
}

module.exports = {
    loadForgetpage,
    forgetEmailValid,
    verifyForgotPassOtp,
    getResetPasswordPage,
    resendforgotOTP,
    postNewPassword,
    loadEditProfile,
    loadAddressPage,
    loadProfile,
    loadNewAddressPage,
    loadEditAddressPage,
    postAddress,
    postEditAddress,
    deleteAddress
}