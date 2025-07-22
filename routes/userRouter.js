let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController");
let {userAuth} = require("../middlewares/auth");
const passport = require("passport");
let profileController = require("../controllers/users/profileController");




router.get("/",userAuth,userController.loadHomepage);
router.get("/landingpage",userController.loadLandingPage)

router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOTP);
router.post("/resend-otp",userController.resendOTP);



router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect("/")
});



router.get("/all-products",userAuth,userController.loadAllProductsPage);
router.get("/product_details",userController.loadProductdetails);
router.get("/pageNotFound",userController.loadPageNotFound);
router.get("/logout",userController.logout);
router.get("/product-details/:id",userController.getProductDetails);
router.post("/product/:id/review",userAuth,userController.postReview);


//Profile Management
router.get("/forget-password",profileController.loadForgetpage);
router.post("/forget-email-valid",profileController.forgetEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPasswordPage);
router.post("/resend-forgot-otp",profileController.resendOTP);
router.post("/reset-password",profileController.postNewPassword);





module.exports = router