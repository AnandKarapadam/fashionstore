const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();
const crypto = require("crypto");

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.GOOGLE_CALLBACK_URL
},  

    async (accessToken,refreshToken,profile,done)=>{
    try {
        
        const email = profile.emails[0].value;
        let user = await User.findOne({email});
        let referralCode;
        let exists;
        do {
          referralCode = "REF" + crypto.randomBytes(3).toString("hex");
          exists = await User.findOne({ referralCode });
        } while (exists);
       

        if(user){
            if(!user.googleId){
                user.googleId=profile.id;
            }
            if(!user.referralCode){
                user.referralCode = referralCode;
            }
            await user.save()
            return done(null,user);
        }
        else{
            user = new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
                referralCode:referralCode
            })

            await user.save();
            return done(null,user)
        }
    } catch (error) {
        return done(error,null);
    }
}

))

passport.serializeUser((user,done)=>{

    done(null,user.id)
})

passport.deserializeUser((id,done)=>{

    User.findById(id)
    .then((user)=>{
        done(null,user)
    })
    .catch((err)=>{
        done(err,null)
    })
})


module.exports = passport;