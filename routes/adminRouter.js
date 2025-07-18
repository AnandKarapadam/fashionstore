const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");

router.get("/pageerror",adminController.pageError);

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);

router.get("/",adminAuth,adminController.loadDashboard);

//CUSTOMER/USER MANAGEMENT//
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/block-customer",adminAuth,customerController.customerBlocked);
router.get("/unblock-customer",adminAuth,customerController.customerUnblocked);


// CATEGORY MANAGEMENT//
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategory/add-offer/:id",adminAuth,categoryController.addOffer);
router.post("/addCategory/remove-offer/:id",adminAuth,categoryController.removeOffer);
router.post("/category/toggle-status/:id",adminAuth,categoryController.toggleCategoryStatus);
router.get("/category/edit/:id",adminAuth,categoryController.loadEditCategory);
router.post("/category/edit/:id",adminAuth,categoryController.editCategory);
router.post("/category/delete/:id",adminAuth,categoryController.deleteCategory);

//BRAND MANAGEMENT//
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("logo"),brandController.addNewBrand);
router.post("/brand/toggle-status/:id",brandController.toggleBrandStatus);
router.get("/brand/edit/:id",adminAuth,brandController.loadeditBrand);
router.post("/brand/edit/:id",adminAuth,uploads.single("logo"),brandController.editBrand);
router.post("/brand/delete/:id",adminAuth,brandController.deleteBrand);

//PRODUCT MANAGEMENT//
router.get("/add-product",adminAuth,productController.getProductAddPage);
router.post("/add-product",adminAuth,uploads.array("images",4),productController.addproduct);

module.exports = router;