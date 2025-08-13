// models/Wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: mongoose.Schema.Types.Decimal128, default: 0.00 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
