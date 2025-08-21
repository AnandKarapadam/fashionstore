const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/admin/categoryController");
const {adminAuth} = require("../../middlewares/auth");




router.get("/",adminAuth,categoryController.categoryInfo);
router.post("/add",adminAuth,categoryController.addCategory);
router.post("/add-offer/:id",adminAuth,categoryController.addOffer);
router.post("/remove-offer/:id",adminAuth,categoryController.removeOffer);
router.post("/toggle-status/:id",adminAuth,categoryController.toggleCategoryStatus);
router.get("/edit/:id",adminAuth,categoryController.loadEditCategory);
router.post("/edit/:id",adminAuth,categoryController.editCategory);
router.post("/delete/:id",adminAuth,categoryController.deleteCategory);


module.exports = router;