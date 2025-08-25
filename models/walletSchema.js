const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  type: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  balanceAfter: {
    type: Number,
  }
}, { _id: false }); // no separate _id for each transaction unless you need it


const walletSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0.00 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active' },
  transactions: [transactionSchema],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
