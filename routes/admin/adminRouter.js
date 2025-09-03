const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../../middlewares/auth");
const customerController = require("../../controllers/admin/customerController");
const categoryController = require("../../controllers/admin/categoryController");
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});
const brandController = require("../../controllers/admin/brandController");
const productController = require("../../controllers/admin/productController");
const bannerController = require("../../controllers/admin/bannerController");
const couponController = require("../../controllers/admin/couponController");
const orderController = require("../../controllers/admin/orderController");

router.get("/pageerror",adminController.pageError);

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);

router.get("/",adminAuth,adminController.loadDashboard);
router.get("/sales-report/download",adminAuth,adminController.salesReportDownload);


// Order Management //
router.get("/orders",adminAuth,orderController.loadOrderPage);
router.post("/orders/update-status",adminAuth,orderController.updateOverallStatus);
router.get("/orders/order-details/:orderId",adminAuth,orderController.loadOrderDetailsPage);
router.post("/orders/order-details/:orderId/update-status",adminAuth,orderController.postOrderItemStatus);



//ADMIN LOGOUT//

router.get("/logout",adminAuth,adminController.adminLogout);

module.exports = router;