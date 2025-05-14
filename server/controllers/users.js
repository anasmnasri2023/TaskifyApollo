const usersModel = require("../models/users");
const profileValidation = require("../validation/profileValidation");
// Enhanced CreateUser method
exports.CreateUser = async (req, res) => {
  try {
    console.log("[Backend] CreateUser request received");
    console.log("[Backend] Create data:", req.body);
    
    // Validate the incoming data
    if (!req.body.fullName || !req.body.email || !req.body.password) {
      console.log("[Backend] Missing required fields");
      return res.status(400).json({ 
        message: "Required fields missing",
        requiredFields: ["fullName", "email", "password"] 
      });
    }

    // Check if user with this email already exists
    const existingUser = await usersModel.findOne({ email: req.body.email });
    if (existingUser) {
      console.log(`[Backend] User with email ${req.body.email} already exists`);
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }

    // Create a new user
    const newUser = new usersModel(req.body);
    
    // Save the user to the database
    const savedUser = await newUser.save();
    console.log(`[Backend] User created: ${savedUser.fullName}`);

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    // Return success
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse
    });
  } catch (error) {
    console.error("[Backend] Error in CreateUser:", error);
    res.status(500).json({ error: error.message });
  }
};
// GetAll users with improved error handling
exports.GetAll = async (req, res) => {
  try {
    console.log("[Backend] GetAll users request received");
    const data = await usersModel.find();
    console.log(`[Backend] Found ${data.length} users`);
    res.status(200).json({
      length: data.length,
      data: data,
    });
  } catch (error) {
    console.error("[Backend] Error in GetAll:", error);
    res.status(500).json({ error: error.message });
  }
};

// GetOne user with improved error handling
exports.GetOne = async (req, res) => {
  try {
    console.log(`[Backend] GetOne user request for ID: ${req.params.id}`);
    const data = await usersModel.findOne({ _id: req.params.id });
    
    if (!data) {
      console.log(`[Backend] User with ID ${req.params.id} not found`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[Backend] Found user: ${data.fullName}`);
    res.status(200).json(data);
  } catch (error) {
    console.error(`[Backend] Error in GetOne for ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// UpdateOne user with improved error handling
exports.UpdateOne = async (req, res) => {
  try {
    console.log(`[Backend] UpdateOne user request for ID: ${req.params.id}`);
    console.log(`[Backend] Update data:`, req.body);
    
    const data = await usersModel.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!data) {
      console.log(`[Backend] User with ID ${req.params.id} not found for update`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[Backend] User updated: ${data.fullName}`);
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data,
    });
  } catch (error) {
    console.error(`[Backend] Error in UpdateOne for ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// UpdateProfile
exports.UpdateProfile = async (req, res) => {
  try {
    console.log('Update Profile Request:', req.body);
    console.log('User ID:', req.user.id);

    // Validate input if needed
    const { errors, isValid } = profileValidation(req.body);
    
    if (!isValid) {
      return res.status(400).json(errors);
    }

    // Find and update user
    const updatedUser = await usersModel.findOneAndUpdate(
      { _id: req.user.id },
      req.body,
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: userResponse
    });

  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ 
      message: 'Server error occurred',
      error: error.message 
    });
  }
};

// DeleteOne user with improved error handling
exports.DeleteOne = async (req, res) => {
  try {
    console.log(`[Backend] DeleteOne user request for ID: ${req.params.id}`);
    
    const result = await usersModel.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      console.log(`[Backend] User with ID ${req.params.id} not found for deletion`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[Backend] User deleted successfully`);
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error(`[Backend] Error in DeleteOne for ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Additional methods if needed
exports.UpdateRole = async (req, res) => {
  try {
    const data = await usersModel.updateOne(
      { _id: req.params.id },
      { $push: { roles: req.body.role } }
    );
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.DeleteRole = async (req, res) => {
  try {
    const data = await usersModel.updateOne(
      { _id: req.params.id },
      { $pull: { roles: req.body.role } }
    );
    res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.calculateUsersBySkills = async (req, res) => {
  try {
    const data = await usersModel.find();
    const m = new Map();

    for (const user of data) {
      const skills = user.skills || [];
      for (const skill of skills) {
        if (!m.has(skill)) {
          m.set(skill, 1);
        } else {
          m.set(skill, m.get(skill) + 1);
        }
      }
    }

    // Convertir la Map en objet pour envoi en JSON
    const result = Object.fromEntries(m);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};