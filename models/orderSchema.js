const mongoose = require("mongoose");
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
});

orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    this.orderId = `ORID${randomNum}`;
  }
  next();
});

let Order = mongoose.model("Order", orderSchema);

module.exports = Order;
