import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone cannot be more than 20 characters'],
  },
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an amount'],
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot be more than 500 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'pending_verification', 'successful', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['upi_qr', 'bank_transfer'],
    default: 'upi_qr',
  },
  upiReference: {
    type: String,
    maxlength: [120, 'UPI reference cannot be more than 120 characters'],
  },
  confirmedAmount: {
    type: Number,
  },
  manualReviewStatus: {
    type: String,
    enum: ['pending', 'successful', 'unsuccessful', 'wrong_amount'],
    default: 'pending',
  },
  manualReviewReason: {
    type: String,
    maxlength: [300, 'Review reason cannot be more than 300 characters'],
  },
  transactionId: {
    type: String,
    maxlength: [120, 'Transaction ID cannot be more than 120 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  verifiedAt: {
    type: Date,
  },
  receiptSentAt: {
    type: Date,
  },
});

if (mongoose.models.Donation) {
  delete mongoose.models.Donation;
}

export default mongoose.model('Donation', DonationSchema);
