let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController")


router.get("/",userController.loadHomepage)
router.get("/login",userController.loadLogin);
router.get("/signup",userController.loadSignup);
router.get("/otp-verification",userController.loadOtp);
router.get("/forgot-password",userController.loadForgetpage);
router.get("/product_details",userController.loadProductdetails);
router.get("/pageNotFound",userController.loadPageNotFound);






module.exports = router