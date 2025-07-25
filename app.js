const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const db = require("./config/db");
const session = require("express-session");
const passport = require("./config/passport");
const MongoStore = require("connect-mongo");

const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter");

db()

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    store:MongoStore.create({
        mongoUrl:'mongodb://127.0.0.1:27017/session-storage',
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

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));;

app.use(express.static(path.join(__dirname,"public")));
console.log(__dirname);

app.use("/",userRouter);
app.use("/admin",adminRouter);

app.listen(process.env.PORT,(err)=>{
    console.log("Server running port:",process.env.PORT);
})


module.exports = app;
