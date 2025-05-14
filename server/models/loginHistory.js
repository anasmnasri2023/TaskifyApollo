const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  device: { type: String, required: true },
  location: { type: String }, 
  loginTime: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);
