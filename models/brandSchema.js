const mongoose = require("mongoose");
const Schema = mongoose.Schema;


let brandSchema = new Schema({
    brandName:{
        type:String,
        required:true
    },
    brandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

let Brand = mongoose.model("Brand",brandSchema)

module.exports = Brand;