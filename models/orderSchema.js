const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {v4:uuidv4} = require("uuid");

let orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
        ref:"Product",
        required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"Address",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:["Pending","Processing","Shipped","Delivered","Cancelled","Return Request","Returned"]
    },
    createOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
})


let Order = mongoose.model("Order",orderSchema);

module.exports = Order;