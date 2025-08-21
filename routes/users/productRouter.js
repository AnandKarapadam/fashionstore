const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/userController");



//Product Management//
router.get("/all",userController.loadAllProductsPage);
router.get("/details/:id",userController.getProductDetails);
router.post("/:id/review",userController.postReview);


module.exports = router;


