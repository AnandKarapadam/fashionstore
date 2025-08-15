const mongoose = require("mongoose");
const Schema = mongoose.Schema;


let couponSchema = new Schema({
    name:{
        type:String,
        unique:true,
        required:true
    },
    createOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }]
})


let Coupon = mongoose.model("Coupon",couponSchema);

module.exports=Coupon;