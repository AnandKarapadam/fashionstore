const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const db = require("./config/db");
const session = require("express-session");
const passport = require("./config/passport");
const MongoStore = require("connect-mongo");

const userRouter = require("./routes/users/userRouter")
const productRouter = require("./routes/users/productRouter");
const addressRouter = require("./routes/users/addressRouter");
const cartRouter = require("./routes/users/cartRouter");
const orderRouter = require("./routes/users/orderRouter");
const wishlistRouter = require("./routes/users/wishlistRouter");

const adminRouter = require("./routes/admin/adminRouter");
const adminProductRouter = require("./routes/admin/productRouter");
const adminCouponRouter = require("./routes/admin/couponRouter");
const adminCategoryRouter = require("./routes/admin/categoryRouter");
const adminBrandRouter = require("./routes/admin/brandRouter");
const adminBannerRouter = require("./routes/admin/bannerRouter");
const adminUserRouter = require("./routes/admin/userRouter");
const adminOrderRouter = require("./routes/admin/orderRouter");

const Cart = require("./models/cartSchema");

db()

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    store:MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName:"sessions"
    }),
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }

}))

app.use(passport.initialize()); 
app.use(passport.session());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.get("/cart/count", async (req, res) => {
  if (!req.session.user) return res.json({ count: 0 });

  const cart = await Cart.findOne({ userId: req.session.user });
  res.json({ count: cart ? cart.items.length : 0 });
});

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));;

app.use(express.static(path.join(__dirname,"public")));
console.log(__dirname);

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});



app.use("/admin/products",adminProductRouter);
app.use("/admin/coupon",adminCouponRouter);
app.use("/admin/category",adminCategoryRouter);
app.use("/admin/brands",adminBrandRouter);
app.use("/admin/banner",adminBannerRouter);
app.use("/admin/users",adminUserRouter);
app.use("/admin/orders",adminOrderRouter);
app.use("/admin",adminRouter);

app.use("/product",productRouter);
app.use("/address",addressRouter);
app.use("/cart",cartRouter);
app.use("/orders",orderRouter);
app.use("/wishlist",wishlistRouter);
app.use("/",userRouter);

app.listen(process.env.PORT,(err)=>{
    console.log("Server running port:",process.env.PORT);
})


module.exports = app;
