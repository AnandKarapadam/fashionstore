const mongoose = require("mongoose");
const { file, ref } = require("pdfkit");

const {Schema} = mongoose;

const userSchema = new mongoose.Schema({
    name:{
            type:String,
            required:true
    },
    image:{
        type:String,
        default:"default-img.jpg"
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    googleId:{
        type:String,
        unique:true,
        sparse: true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0
    },
    orderHistory:{
        type:Schema.Types.ObjectId,
        ref:"Order"
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    referralCode:{
        type:String
    },
    referredBy:{
        type:String
    },
    redeemedUsers:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        searchOn:{
            type:Date,
            default:Date.now,
        }

    }]

})

const User = mongoose.model("User",userSchema);

module.exports = User