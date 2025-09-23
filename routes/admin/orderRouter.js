const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/admin/orderController");
const {adminAuth} = require("../../middlewares/auth");

router.get("/",adminAuth,orderController.loadOrderPage);
router.post("/update-status",adminAuth,orderController.updateOverallStatus);
router.get("/order-details/:orderId",adminAuth,orderController.loadOrderDetailsPage);
router.post("/order-details/:orderId/update-status",adminAuth,orderController.postOrderItemStatus);
router.get("/item/details/:orderId/:itemId",orderController.loadItemDetailsPage);
router.get("/return-requests",adminAuth,orderController.loadReturnRequestPage);

module.exports = router;