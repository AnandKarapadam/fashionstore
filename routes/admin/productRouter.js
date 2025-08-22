const express = require("express")
const router = express.Router();
const productController = require("../../controllers/admin/productController");
const {adminAuth} = require("../../middlewares/auth");
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});


router.get("/add-product",adminAuth,productController.getProductAddPage);
router.post("/add-product",adminAuth,uploads.array("images",4),productController.addproduct);
router.get("/",adminAuth,productController.loadProductsPage);
router.post("/remove-offer/:id",adminAuth,productController.removeOffer);
router.post("/add-offer/:id",adminAuth,productController.addOffer);
router.post("/toggle-status/:id",adminAuth,productController.toggleIsBlocked);
router.post("/delete/:id",adminAuth,productController.productDelete);
router.get("/edit/:id",adminAuth,productController.loadEditProduct);
router.post("/edit/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.delete("/:id/delete-image",adminAuth,productController.deleteImage);





module.exports = router;