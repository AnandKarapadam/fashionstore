let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController");
let {userAuth} = require("../middlewares/auth");
const passport = require("passport");


router.get("/",userAuth,userController.loadHomepage);
router.get("/landingpage",userController.loadLandingPage)

router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);



router.post("/verify-otp",userController.verifyOTP);
router.post("/resend-otp",userController.resendOTP);

router.get("/logout",userController.logout)

router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));

router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect("/")
});

router.get("/forgot-password",userController.loadForgetpage);
router.get("/product_details",userController.loadProductdetails);
router.get("/pageNotFound",userController.loadPageNotFound);






module.exports = router