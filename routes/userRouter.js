let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController");
let {userAuth} = require("../middlewares/auth");
const passport = require("passport");
let profileController = require("../controllers/users/profileController");




router.get("/",userAuth,userController.loadHomepage);
router.get("/landingpage",userController.loadLandingPage);

router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOTP);
router.post("/resend-otp",userController.resendOTP);


router.get("/auth/google",(req,res,next)=>{
    req.session.authType = req.query.authType||"login";
    
     req.session.save(err => {
        if (err) {
            console.error("Session save error:", err);
            return res.redirect("/login?error=session");
        }
        next(); // Now it goes to passport.authenticate
    });
},passport.authenticate("google",{scope:['profile','email'],prompt: "select_account", }));

router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: '/signup' }), async (req, res) => {
  
  const user = req.user;
  
  if (user.isBlocked) {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/login");
      });
    });
  } else {
    req.session.user = user._id;
    const authType = req.session.authType;
    if (authType == "signup") {
      return res.redirect("/login");
    } else {
      return res.redirect("/");
    }
  }
});


router.get("/all-products",userController.loadAllProductsPage);
router.get("/product_details",userController.loadProductdetails);
router.get("/pageNotFound",userController.loadPageNotFound);
router.get("/logout",userController.logout);
router.get("/product-details/:id",userController.getProductDetails);
router.post("/product/:id/review",userController.postReview);


//Profile Management
router.get("/forget-password",profileController.loadForgetpage);
router.post("/forget-email-valid",profileController.forgetEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPasswordPage);
router.post("/resend-forgot-otp",profileController.resendforgotOTP);
router.post("/reset-password",profileController.postNewPassword);
router.get("/profile",profileController.loadProfile);
router.get("/edit-profile",profileController.loadEditProfile);
router.get("/address",profileController.loadAddressPage);
router.get("/add-address",profileController.loadNewAddressPage);
router.get("/edit-address",profileController.loadEditAddressPage);

router.get("/cart",userAuth,userController.loadCartPage);
router.post("/cart/add/:id",userAuth,userController.addToCart);
router.get("/select-address",userController.loadSelectAddress);
router.get("/payment",userController.loadPaymentPage);
router.post("/update-cart-quantity",userController.updateCartQuantity);
router.delete("/remove-from-cart/:cartItemId",userController.removeCartItem);
router.get("/wishlist",userAuth,userController.loadWishlistPage);
router.post("/wishlist/add/:productId",userAuth,userController.addToWishlist);
router.post("/wishlist/move-to-cart/:id",userAuth,userController.moveToCart);
router.delete("/remove-from-wishlist/:id",userAuth,userController.removeWishlistItem)

module.exports = router