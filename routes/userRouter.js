let express = require("express");
let router = express.Router()
let userController = require("../controllers/users/userController")


router.get("/",userController.loadHomepage)






module.exports = router