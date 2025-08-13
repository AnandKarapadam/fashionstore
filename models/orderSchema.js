const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const {v4:uuidv4} = require("uuid");

let orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",   
        required: true
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        orderItemId: {           
           type: String,
           required:true,
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        returnReason: {
        type: String,
        trim: true,
        default: null
        },
        status:{
        type:String,
        required:true,
        enum:["Pending","Processing","Shipped","Delivered","Cancelled","Return Request","Returned"]
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
    overAllStatus:{
        type:String,
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"Address",
        required:true
    },
    invoiceDate:{
        type:Date,
    },
    createOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    paymentMethod:{
        type:String,
        enum:['cod', 'wallet', 'razorpay', 'card','upi'],
    }
    
})


let Order = mongoose.model("Order",orderSchema);

module.exports = Order;