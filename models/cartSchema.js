const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:"inCart"
        },
        cancellationReason:{
            type:String,
            default:"none"
        }
    }]
})


let Cart = mongoose.model("Cart",cartSchema);

module.exports = Cart;