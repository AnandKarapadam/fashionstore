const User = require("../models/userSchema");



const userAuth = async (req, res, next) => {
  try {
    let user = req.user;

    if (!user && req.session.user) {
      user = await User.findById(req.session.user);
    }

    if (user) {
      if (!user.isBlocked) {
        req.user = user; // make sure to attach it for later use
        return next();
      } else {
        req.session.destroy((err) => {
          if (err) console.log("Session destroy error:", err);
          res.clearCookie("connect.sid");
          return res.redirect("/login?error=blocked");
        });
      }
    } else {
      return res.redirect("/landingpage");
    }
  } catch (error) {
    console.log("userAuth error:", error);
    return res.redirect("/landingpage");
  }
};

const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then((data)=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    }).catch((error)=>{
        console.log("Error in admin auth middleware");
        res.status(500).send("Internal Server Error");
    })
}

const cartAuth = (req,res,next)=>{
  if(!req.session.user){
    return res.json({success:false,message:"Please Login To Your Account"});
  }
  next();
}

module.exports = {
    userAuth,
    adminAuth,
    cartAuth
}




