// scripts/seedRoles.js
/*const mongoose = require("mongoose");
const Role = require("../models/roles");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("MongoDB connected..."))
  .catch(err => console.log(err));

// Default roles
const defaultRoles = [
  {
    title: "ADMIN",
    description: "Has full system access and manages system settings, user accounts, and overall platform configuration.",
    permissions: ["Create Task", "View Tasks", "Edit Tasks", "Delete Tasks", "Manage Users", "View Reports", "Manage Projects"],
    avatar: "A",
    isDefault: true
  },
  {
    title: "PROJECT MANAGER",
    description: "Manages projects, tasks, and team members. Can create and assign tasks, view reports, and manage project settings.",
    permissions: ["Create Task", "View Tasks", "Edit Tasks", "View Reports", "Manage Projects"],
    avatar: "P",
    isDefault: true
  },
  {
    title: "ENGINEER",
    description: "Works on assigned tasks and can update task progress. Limited access to project settings.",
    permissions: ["View Tasks", "Edit Tasks"],
    avatar: "E",
    isDefault: true
  }
];

// Seed the database with default roles
const seedRoles = async () => {
  try {
    for (const role of defaultRoles) {
      // Check if the role already exists
      const existingRole = await Role.findOne({ title: role.title });
      
      if (existingRole) {
        console.log(`Role '${role.title}' already exists, updating...`);
        await Role.findOneAndUpdate({ title: role.title }, { ...role, isDefault: true });
      } else {
        console.log(`Creating role '${role.title}'...`);
        await Role.create(role);
      }
    }
    
    console.log("Default roles have been seeded!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding roles:", error);
    process.exit(1);
  }
};

seedRoles();*/