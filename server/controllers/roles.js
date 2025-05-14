const Role = require("../models/roles");
const rolesValidation = require("../validation/rolesValidation.js");

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    // Create new role
    const role = new Role({
      name,
      description,
      permissions
    });
    
    await role.save();
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single role
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Find and update role
    const role = await Role.findByIdAndUpdate(
      req.params.id, 
      { name, description, permissions },
      { new: true, runValidators: true }
    );
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    await Role.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};