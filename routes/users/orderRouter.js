const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/users/ordersController");
const {userAuth} = require("../../middlewares/auth");

router.get("/",userAuth,orderController.loadOrderPage);
router.get("/order-details/:orderId",userAuth,orderController.loadOrderDetails);
router.get("/invoice/download/:orderId/:productId",userAuth,orderController.invoiceDownload);
router.post("/return/item",userAuth,orderController.postReturnRequest);
router.post("/cancel/item",userAuth,orderController.postCancelOrder);
router.post("/cancel/:orderId",userAuth,orderController.postCancelWholeOrder);
router.post("/return/:orderId",userAuth,orderController.postWholeReturnOrder);



module.exports = router;