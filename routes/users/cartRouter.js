const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/users/cartController");
const {userAuth,cartAuth} = require("../../middlewares/auth");


router.get("/",userAuth,cartController.loadCartPage);
router.post("/add/:id",cartAuth,cartController.addToCart);
router.get("/buy-now/:id/:size",userAuth,cartController.buyNowSingleProduct);
router.delete("/remove/:cartItemId",userAuth,cartController.removeCartItem);
router.post("/update-quantity",userAuth,cartController.updateCartQuantity);
router.get("/select-address",cartController.loadSelectAddress);
router.post("/select-address",cartController.postSelectedAddress);
router.get("/checkout/payment",cartController.loadPaymentPage);
router.post("/checkout/payment",cartController.postPaymentMethod);
router.get("/checkout/confirm",userAuth,cartController.getConfirmOrderPage);
router.post("/checkout/confirm",userAuth,cartController.postConfirmation);
router.get("/order-success",userAuth,cartController.loadSuccessPage);
router.get("/order-failed",userAuth,cartController.loadFailedPage);
router.post("/apply-coupon",userAuth,cartController.applyCoupon);
router.post("/check-stock",userAuth,cartController.checkStock);
router.get("/payment/check-stock",userAuth,cartController.checkPaymentStock);


router.get("/checkout/razorpay",userAuth,cartController.getRazorpayOrder);
router.post("/checkout/validate",userAuth,cartController.cartCheckoutValidate);
router.post("/checkout/validate-stock", userAuth, cartController.validateStock);
router.post("/checkout/razorpay/verify",userAuth,cartController.verifyRazorPayment);
router.get("/checkout/wallet",userAuth,cartController.loadWalletPayment);
router.post("/checkout/wallet",userAuth,cartController.postWalletPayment);





module.exports = router;