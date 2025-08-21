const express = require("express");
const router = express.Router();
const {adminAuth} = require("../../middlewares/auth");
const couponController = require("../../controllers/admin/couponController");


router.get("/",adminAuth,couponController.loadCouponPage);
router.post("/createCoupon",adminAuth,couponController.createCoupon);
router.post("/toggle-list/:id",adminAuth,couponController.toggleList);
router.get("/edit/:id",adminAuth,couponController.loadEditCoupon);
router.post("/edit/:id",adminAuth,couponController.editCoupon);
router.post("/delete/:id",adminAuth,couponController.deleteCoupon);







module.exports = router;