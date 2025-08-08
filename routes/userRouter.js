let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController");
let {userAuth} = require("../middlewares/auth");
const passport = require("passport");
let profileController = require("../controllers/users/profileController");
let addressController = require("../controllers/users/addressController");
let cartController = require("../controllers/users/cartController");




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


// Address Management
router.get("/address",addressController.loadAddressPage);
router.get("/add-address",addressController.loadNewAddressPage);
router.post("/add-address",addressController.postAddress);
router.get("/edit-address/:id",addressController.loadEditAddressPage);
router.post("/edit-address/:id",addressController.postEditAddress);
router.delete("/delete-address/:id",addressController.deleteAddress);

// Cart Management
router.get("/cart",userAuth,cartController.loadCartPage);
router.post("/cart/add/:id",userAuth,cartController.addToCart);
router.get("/select-address",cartController.loadSelectAddress);
router.get("/payment",cartController.loadPaymentPage);
router.post("/update-cart-quantity",cartController.updateCartQuantity);
router.delete("/remove-from-cart/:cartItemId",cartController.removeCartItem);

// Wishlist Management
router.get("/wishlist",userAuth,userController.loadWishlistPage);
router.post("/wishlist/add/:productId",userAuth,userController.addToWishlist);
router.post("/wishlist/move-to-cart/:id",userAuth,userController.moveToCart);
router.delete("/remove-from-wishlist/:id",userAuth,userController.removeWishlistItem)

module.exports = router