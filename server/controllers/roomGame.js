// controllers/roomController.js
const Room = require("../models/RoomGame");
  
exports.createRoom = async (req, res) => {
 const { roomName, gameType } = req.body;

 if (!roomName || !gameType) {
   return res.status(400).json({ message: "Room name and game type are required" });
 }

 try {
   const room = new Room({ roomName, gameType });
   await room.save();
   res.status(201).json({ message: "Room created", room });
 } catch (err) {
   if (err.code === 11000) {
     return res.status(409).json({ message: "Room name already exists" });
   }
   res.status(500).json({ message: "Server error", error: err.message });
 }
};
exports.getAllRooms = async (req, res) => {
   try {
     const rooms = await Room.find();
     res.json(rooms);
   } catch (err) {
     res.status(500).json({ message: "Error fetching rooms", error: err.message });
   }
 };
 
exports.saveScore = async (req, res) => {
   const { roomName, username, score } = req.body;
 
   try {
     const room = await Room.findOne({ roomName });
 
     if (!room) {
       return res.status(404).json({ message: 'Room not found' });
     }
 
     // Add new score to leaderboard array
     room.leaderboard.push({ username, score });
 
     // Sort by score descending and keep only top 5
     room.leaderboard.sort((a, b) => b.score - a.score);
     room.leaderboard = room.leaderboard.slice(0, 5);
 
     await room.save();
 
     res.status(200).json({
       message: 'Score saved and leaderboard updated',
       leaderboard: room.leaderboard
     });
   } catch (error) {
     console.error('Error saving score:', error);
     res.status(500).json({ message: 'Server error' });
   }
 };