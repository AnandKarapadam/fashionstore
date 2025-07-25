const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{  
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
        default:0
    }
},{timestamps:true})

const Category = mongoose.model("Category",categorySchema);

module.exports = Category