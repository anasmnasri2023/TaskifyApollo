const ProjectModel = require("../models/projet");

/* Add Project */
const Add = async (req, res) => {
  try {
    const project = await ProjectModel.create(req.body);
    
    // Log activity for project creation
    if (req.logActivity) {
      req.logActivity(
        "Created Project",
        `Created project: ${project.name || 'New Project'}`,
        "project_created",
        project._id,
        "Project"
      ).catch(err => console.error("Error logging project creation activity:", err));
      
      console.log("✅ Activity logged for project creation:", project._id);
    }
    
    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

/* GetAll Projects */
const GetAll = async (req, res) => {
  try {
    const projects = await ProjectModel.find();
    res.status(200).json({
      length: projects.length,
      data: projects,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

/* GetOne Project */
const GetOne = async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    res.status(200).json(project);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

/* UpdateOne Project */
const UpdateOne = async (req, res) => {
  try {
    const project = await ProjectModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    // Log activity for project update
    if (req.logActivity) {
      req.logActivity(
        "Updated Project",
        `Updated project: ${project.name || 'Project'}`,
        "project_updated",
        project._id,
        "Project"
      ).catch(err => console.error("Error logging project update activity:", err));
      
      console.log("✅ Activity logged for project update:", project._id);
    }
    
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

/* DeleteOne Project */
const DeleteOne = async (req, res) => {
  try {
    // First get the project so we have the name for the activity log
    const project = await ProjectModel.findById(req.params.id);
    const projectName = project ? project.name : 'Unknown Project';
    
    // Delete the project
    await ProjectModel.findByIdAndDelete(req.params.id);
    
    // Log activity for project deletion
    if (req.logActivity) {
      req.logActivity(
        "Deleted Project",
        `Deleted project: ${projectName}`,
        "project_deleted",
        req.params.id,
        "Project"
      ).catch(err => console.error("Error logging project deletion activity:", err));
      
      console.log("✅ Activity logged for project deletion:", req.params.id);
    }
    
    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  Add,
  GetAll,
  GetOne,
  UpdateOne,
  DeleteOne,
};