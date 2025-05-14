const mongoose = require('mongoose');
const UserModel = require('../models/users');
require('dotenv').config();

// Email de l'utilisateur pour lequel désactiver la 2FA
const userEmail = 'example@example.com'; // Remplacez par l'email souhaité

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Update the specific user to disable 2FA
      const result = await UserModel.updateOne(
        { email: userEmail },
        { $set: { twoFactorEnabled: false } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`2FA disabled for user: ${userEmail}`);
      } else if (result.matchedCount > 0) {
        console.log(`User ${userEmail} found but no changes were made (2FA might already be disabled)`);
      } else {
        console.log(`User ${userEmail} not found`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
