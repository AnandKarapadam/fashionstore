const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/users/cartController");
const {userAuth} = require("../../middlewares/auth");


router.get("/",userAuth,cartController.loadCartPage);
router.post("/add/:id",userAuth,cartController.addToCart);
router.get("/buy-now/:id",userAuth,cartController.buyNowSingleProduct);
router.delete("/remove/:cartItemId",userAuth,cartController.removeCartItem);
router.post("/update-quantity",userAuth,cartController.updateCartQuantity);
router.get("/select-address",cartController.loadSelectAddress);
router.post("/select-address",cartController.postSelectedAddress);
router.get("/checkout/payment",cartController.loadPaymentPage);
router.post("/checkout/payment",cartController.postPaymentMethod);
router.get("/checkout/confirm",userAuth,cartController.getConfirmOrderPage);
router.post("/checkout/confirm",userAuth,cartController.postConfirmation);
router.get("/order-success",userAuth,cartController.loadSuccessPage);
router.post("/apply-coupon",userAuth,cartController.applyCoupon);





module.exports = router;