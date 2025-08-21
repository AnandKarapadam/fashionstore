const express = require("express");
const router = express.Router();
const {adminAuth} = require("../../middlewares/auth");
const customerController = require("../../controllers/admin/customerController");


router.get("/",adminAuth,customerController.customerInfo);
router.get("/block",adminAuth,customerController.customerBlocked);
router.get("/unblock",adminAuth,customerController.customerUnblocked);


module.exports = router;