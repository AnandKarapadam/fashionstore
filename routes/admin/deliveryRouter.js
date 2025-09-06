const express = require("express");
const { adminAuth } = require("../../middlewares/auth");
const router = express.Router();
const deliveryController = require("../../controllers/admin/deliveryController");


router.get("/",adminAuth,deliveryController.loadDeliveryCharge);
router.post('/save',adminAuth,deliveryController.postDeliveryCharge);


module.exports = router;