const express = require("express");
const router = express.Router();
const bannerController = require("../../controllers/admin/bannerController");
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});
const {adminAuth} = require("../../middlewares/auth");


router.get("/",adminAuth,bannerController.getBannerPage);
router.get("/add",adminAuth,bannerController.getAddBanner);
router.post("/add",adminAuth,uploads.single("image"),bannerController.addBanner);
router.get("/deleteBanner",adminAuth,bannerController.delBanner);


module.exports = router;