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




router.get("/product_details",userController.loadProductdetails);
router.get("/pageNotFound",userController.loadPageNotFound);
router.get("/logout",userController.logout);

//Profile Management
router.get("/forget-password",profileController.loadForgetpage);
router.post("/forget-email-valid",profileController.forgetEmailValid);





module.exports = router