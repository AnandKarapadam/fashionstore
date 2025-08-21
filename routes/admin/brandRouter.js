const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});
const brandController = require("../../controllers/admin/brandController");
const {adminAuth} = require("../../middlewares/auth");


router.get("/",adminAuth,brandController.getBrandPage);
router.post("/add",adminAuth,uploads.single("logo"),brandController.addNewBrand);
router.post("/toggle-status/:id",brandController.toggleBrandStatus);
router.get("/edit/:id",adminAuth,brandController.loadeditBrand);
router.post("/edit/:id",adminAuth,uploads.single("logo"),brandController.editBrand);
router.post("/delete/:id",adminAuth,brandController.deleteBrand);


module.exports = router;