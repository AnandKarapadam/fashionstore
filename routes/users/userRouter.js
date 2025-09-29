let express = require("express");
let router = express.Router()
let userController = require("../../controllers/users/userController");
let {userAuth} = require("../../middlewares/auth");
const passport = require("passport");
let profileController = require("../../controllers/users/profileController");
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});
const walletController = require("../../controllers/users/walletController");


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

router.get("/pageNotFound",userController.loadPageNotFound);
router.get("/logout",userController.logout);
router.get("/delete-account",userController.loadDeleteAccount);
router.post("/delete-account",userController.deleteAccount);

//Profile Management
router.get("/forget-password",profileController.loadForgetpage);
router.post("/forget-email-valid",profileController.forgetEmailValid);

router.post("/verify-passForgot-otp",userAuth,profileController.verifyForgotPassOtp);
router.get("/reset-password",userAuth,profileController.getResetPasswordPage);
router.post("/resend-forgot-otp",userAuth,profileController.resendforgotOTP);
router.post("/reset-password",userAuth,profileController.postNewPassword);
router.get("/profile",userAuth,profileController.loadProfile);
router.get("/edit-profile",userAuth,profileController.loadEditProfile);
router.post("/profile/update",userAuth,uploads.single('image'),profileController.postProfile);
router.get("/change-password",userAuth,profileController.loadChangePassword);
router.post("/change-password",userAuth,profileController.postEmailForOtp);
router.post("/change-password/verify-otp",userAuth,profileController.verifyChangeOTP);
router.post("/change-password/resend-otp",userAuth,profileController.resendChangePassOTP);
router.get("/password-change",userAuth,profileController.loadPasswordChangePage);
router.post("/password-change",userAuth,profileController.postPasswordChangePage);
router.get("/change-email",userAuth,profileController.changeEmailPage);
router.post("/change-email",userAuth,profileController.varifyEmailChangeOTP);
router.post("/change-email/otp",userAuth,profileController.changeEmailOTPVerify);
router.post("/change-email/resend-otp",userAuth,profileController.changeEmailResendOTP);
router.get("/profile/refer&earn",userAuth,profileController.loadReferAndEarn);

router.get("/profile/wallet",userAuth,walletController.loadWalletPage);
router.get("/profile/wallet/transactions",userAuth,walletController.loadTransactionPage);
router.get("/profile/wallet/add",userAuth,walletController.loadWalletAddMoney);
router.post("/profile/wallet/pay",userAuth,walletController.createWalletOrder);
router.post('/profile/wallet/verify',userAuth,walletController.verifyWalletPayment);

router.get("/terms&conditions",userController.loadTermsAndConditions);
router.get("/privacy-policy",userController.loadPrivacyPolicy);
router.get("/return-policy",userController.loadReturnPolicy);
router.get("/about-us",userController.loadAboutUs);


module.exports = router
