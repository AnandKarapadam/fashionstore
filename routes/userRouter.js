let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController");
let {userAuth} = require("../middlewares/auth");
const passport = require("passport");
let profileController = require("../controllers/users/profileController");
let addressController = require("../controllers/users/addressController");
let cartController = require("../controllers/users/cartController");
let wishlistController = require("../controllers/users/wishlistController");
let orderController = require("../controllers/users/ordersController");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});


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
router.post("/profile/update",uploads.single('image'),profileController.postProfile);
router.get("/change-password",profileController.loadChangePassword);
router.post("/change-password",profileController.postEmailForOtp);
router.post("/change-password/verify-otp",profileController.verifyChangeOTP);
router.post("/change-password/resend-otp",profileController.resendChangePassOTP);
router.get("/password-change",profileController.loadPasswordChangePage);
router.post("/password-change",profileController.postPasswordChangePage);
router.get("/change-email",profileController.changeEmailPage);
router.post("/change-email",profileController.varifyEmailChangeOTP);
router.post("/change-email/otp",profileController.changeEmailOTPVerify);
router.post("/change-email/resend-otp",profileController.changeEmailResendOTP);



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
router.get("/buy-now/:id",userAuth,cartController.buyNowSingleProduct);
router.get("/select-address",cartController.loadSelectAddress);
router.post("/select-address",cartController.postSelectedAddress);
router.get("/checkout/payment",cartController.loadPaymentPage);
router.post("/checkout/payment",cartController.postPaymentMethod);
router.get("/checkout/confirm",userAuth,cartController.getConfirmOrderPage);
router.post("/checkout/confirm",userAuth,cartController.postConfirmation);
router.post("/update-cart-quantity",userAuth,cartController.updateCartQuantity);
router.delete("/remove-from-cart/:cartItemId",userAuth,cartController.removeCartItem);
router.get("/order-success",userAuth,cartController.loadSuccessPage);


// Order Management
router.get("/orders",userAuth,orderController.loadOrderPage);
router.get("/order-details/:orderId",userAuth,orderController.loadOrderDetails);
router.get("/invoice/download/:orderId/:productId",userAuth,orderController.invoiceDownload);
router.post("/orders/return",userAuth,orderController.postReturnRequest);
router.post("/orders/cancel",userAuth,orderController.postCancelOrder)


// Wishlist Management
router.get("/wishlist",userAuth,wishlistController.loadWishlistPage);
router.post("/wishlist/add/:productId",userAuth,wishlistController.addToWishlist);
router.post("/wishlist/move-to-cart/:id",userAuth,wishlistController.moveToCart);
router.delete("/remove-from-wishlist/:id",userAuth,wishlistController.removeWishlistItem)

module.exports = router