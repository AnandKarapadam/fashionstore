const express = require("express");
const router = express.Router();
const wishlistController = require("../../controllers/users/wishlistController");
const {userAuth} = require("../../middlewares/auth");

router.get("/",userAuth,wishlistController.loadWishlistPage);
router.post("/add/:productId",userAuth,wishlistController.addToWishlist);
router.post("/move-to-cart/:id",userAuth,wishlistController.moveToCart);
router.delete("/remove-from-wishlist/:id",userAuth,wishlistController.removeWishlistItem);
router.post("/add",wishlistController.toggleAddToWishlist);
router.post("/remove",wishlistController.toggleRemoveFromWishlist);


module.exports = router;

