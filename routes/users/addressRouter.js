const express = require("express");
const router = express.Router();
const addressController = require("../../controllers/users/addressController");


// Address Management
router.get("/",addressController.loadAddressPage);
router.get("/add",addressController.loadNewAddressPage);
router.post("/add",addressController.postAddress);
router.get("/edit/:id",addressController.loadEditAddressPage);
router.post("/edit/:id",addressController.postEditAddress);
router.delete("/delete/:id",addressController.deleteAddress);







module.exports = router;