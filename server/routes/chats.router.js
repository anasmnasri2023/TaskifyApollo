const express = require('express');
const router = express.Router();
const passport = require("passport");

const {
  getOverviewStats,
  getRoomStats,
  getUserChatStats,
  generateCustomReport
 } = require('../controllers/ChatAdminStatistics');
const {
  getAllChatRooms,
  deactivateChatRoom,
  archiveChatRoom,
  forceAddUserToRoom,
  deleteMessages,
  exportChatData
} = require('../controllers/ChatAdminManagment');



// Import controllers
const { 
  createChatRoom, 
  getChatRooms, 
  getChatRoomById, 
  updateChatRoom, 
  deleteChatRoom,
  getChatMembers,
  addChatMember,
  removeChatMember,
  clearChatMessages 
} = require('../controllers/ChatRoom');

const { 
  sendMessage, 
  getMessages, 
  markAsRead, 
  deleteMessage,
  getTeamMessages
} = require('../controllers/ChatMessage');


// Chat Room routes
router.post('/rooms', passport.authenticate("jwt", { session: false }), createChatRoom);
router.get('/rooms', passport.authenticate("jwt", { session: false }) , getChatRooms);
router.get('/rooms/:roomId', passport.authenticate("jwt", { session: false }), getChatRoomById);
router.put('/rooms/:roomId',  passport.authenticate("jwt", { session: false }), updateChatRoom);
router.delete('/rooms/:roomId', passport.authenticate("jwt", { session: false }), deleteChatRoom);

// Chat Members routes
router.get('/rooms/:roomId/members', passport.authenticate("jwt", { session: false }), getChatMembers);
router.post('/rooms/:roomId/members', passport.authenticate("jwt", { session: false }), addChatMember);
router.delete('/rooms/:roomId/members/:memberId', passport.authenticate("jwt", { session: false }), removeChatMember);

// Chat Message routes
router.post('/messages',  passport.authenticate("jwt", { session: false }), sendMessage);
router.get('/messages/:chatRoomId',  passport.authenticate("jwt", { session: false }), getMessages);
router.put('/messages/:chatRoomId/read',  passport.authenticate("jwt", { session: false }), markAsRead);
router.delete('/messages/:messageId',  passport.authenticate("jwt", { session: false }), deleteMessage);
router.get('/messages/team/:chatRoomId', 
  passport.authenticate("jwt", { session: false }), 
  getTeamMessages
);

// Clear all messages in a chat
router.delete('/messages/:chatRoomId/all', passport.authenticate("jwt", { session: false }), clearChatMessages);





// Statistics Routes
router.get('/admin/stats/overview',passport.authenticate("jwt", { session: false }), getOverviewStats);
router.get('/admin/stats/room/:roomId',passport.authenticate("jwt", { session: false }), getRoomStats);
router.get('/admin/stats/user/:userId',passport.authenticate("jwt", { session: false }), getUserChatStats);
router.post('/admin/reports/generate',passport.authenticate("jwt", { session: false }), generateCustomReport);

// Chat Management Routes
router.get('/admin/rooms',passport.authenticate("jwt", { session: false }), getAllChatRooms);
router.patch('/admin/rooms/:roomId/deactivate',passport.authenticate("jwt", { session: false }), deactivateChatRoom);
router.patch('/admin/rooms/:roomId/archive',passport.authenticate("jwt", { session: false }), archiveChatRoom);
router.post('/admin/rooms/:roomId/force-add-user',passport.authenticate("jwt", { session: false }), forceAddUserToRoom);
router.delete('/admin/rooms/:roomId/messages',passport.authenticate("jwt", { session: false }), deleteMessages);
router.get('/admin/rooms/:roomId/export',passport.authenticate("jwt", { session: false }), exportChatData) ;

module.exports = router;