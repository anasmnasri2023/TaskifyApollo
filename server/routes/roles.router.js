// routes/roles.router.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roles'); // Changed to match your actual controller file

// Routes with controllers
router.route('/roles')
  .post(roleController.createRole)
  .get(roleController.getRoles);

router.route('/roles/:id')
  .get(roleController.getRole)
  .put(roleController.updateRole)
  .delete(roleController.deleteRole);

// Add description generation endpoint
router.post("/roles/generate-description", async (req, res) => {
  try {
    const { roleName } = req.body;
    
    if (!roleName) {
      return res.status(400).json({ error: "Role name is required" });
    }
    
    // Map of common role descriptions
    const roleDescriptions = {
      "project manager": "Responsible for planning, executing, and closing projects. Oversees team members, manages schedules, and ensures projects are completed on time and within budget.",
      "product manager": "Responsible for the product throughout its lifecycle. Defines the product vision, gathers requirements, and works with development teams to deliver user value.",
      "developer": "Responsible for writing, testing, and maintaining code. Works on software features and fixes bugs.",
      "admin": "Has full system access and manages system settings, user accounts, and overall platform configuration.",
      "team lead": "Manages a team of developers or other staff members. Provides technical guidance and ensures team productivity.",
      "qa tester": "Responsible for testing software, identifying bugs, and ensuring quality standards are met.",
      "hr manager": "Responsible for managing human resources, including hiring, onboarding, employee relations, and ensuring compliance with labor laws.",
      "product owner": "Represents stakeholders and is responsible for maximizing the value of the product by creating and managing the product backlog.",
      "scrum master": "Facilitates Scrum processes and removes impediments for the development team."
    };
    
    const lowercaseName = roleName.toLowerCase();
    
    // Return the matching description or a generic one
    const description = roleDescriptions[lowercaseName] 
      ? roleDescriptions[lowercaseName]
      : `Responsible for ${lowercaseName} related activities in the system.`;
    
    res.status(200).json({ description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;