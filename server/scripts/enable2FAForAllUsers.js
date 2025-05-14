const mongoose = require('mongoose');
const UserModel = require('../models/users');
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Update ALL users to enable 2FA (even those who already have the field)
      const result = await UserModel.updateMany(
        {}, // Find all users
        { $set: { twoFactorEnabled: true } } // Set twoFactorEnabled to true
      );
      
      console.log(`Updated ${result.modifiedCount} users to enable 2FA`);
      
      // List all users with 2FA enabled
      const users = await UserModel.find({ twoFactorEnabled: true }, { email: 1, _id: 0 });
      console.log('Users with 2FA enabled:');
      users.forEach(user => console.log(` - ${user.email}`));
      console.log(`Total: ${users.length} users`);
    } catch (error) {
      console.error('Error updating users:', error);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
