const mongoose = require("mongoose");
const { strike } = require("pdfkit");
const Schema = mongoose.Schema;


let orderSchema = new Schema({
  orderId: {
    type: String,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      size:{
        type:String
      },
      orderItemId: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
      totalPrice: {
        type: Number,
        default: 0,
      },
      returnReason: {
        type: String,
        trim: true,
        default: null,
      },
      status: {
        type: String,
        required: true,
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Return Request",
          "Returned",
        ],
      },
      cancelReason: {
        type: String,
        trim: true,
        default: null,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  overAllStatus: {
    type: String,
  },
  cancelReason: {
    type: String,
    trim: true,
    default: null,
  },
  deliveryCharge:{
    type:Number,
    default:0,
  }
  ,
  returnReason: {
    type: String,
    trim: true,
    default: null,
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  invoiceDate: {
    type: Date,
  },
  createOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "wallet", "razorpay", "card", "upi"],
  },
  couponName:{
    type:String
  }
});

orderSchema.pre("save",async function (next) {
  if (!this.orderId) {
    let isUinque = false;
    let newOrderId;
    while(!isUinque){
      const randomNum = Math.floor(1000000 + Math.random() * 9000000);
      newOrderId = `ORID${randomNum}`;

      const existingOrder = await mongoose.models.Order.findOne({orderId:newOrderId});

      if(!existingOrder){
        isUinque = true;
      }
    }
    this.orderId = newOrderId;
  }
  
  next();
})

let Order = mongoose.model("Order", orderSchema);

module.exports = Order;
