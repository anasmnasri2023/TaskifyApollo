// models/Room.js
const mongoose = require('mongoose');
const leaderboardEntrySchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, required: true }
}, { _id: false });
const roomGameShame = new mongoose.Schema({
  roomName: { type: String, required: true, unique: true },
  gameType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  leaderboard: {
    type: [leaderboardEntrySchema],
    validate: [arrayLimit, '{PATH} exceeds the limit of 5']
  }
});

// Custom validator to limit the leaderboard to 5 entries
function arrayLimit(val) {
  return val.length <= 5;
}
 module.exports = mongoose.model('RoomGame', roomGameShame);
