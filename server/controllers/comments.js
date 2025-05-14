const tasksModel = require("../models/tasks");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dtn7sr0k5",
  api_key: process.env.CLOUDINARY_API_KEY || "218928741933615",
  api_secret: process.env.CLOUDINARY_API_SECRET || "4Q5w13NQb8CBjfSfgosna0QR7ao",
});

/**
 * Add a comment to a task with better error handling and response
 */
const AddComment = async (req, res) => {
  console.log('Add Comment Request:', {
    taskId: req.params.id,
    userId: req.user?.id,
    commentText: req.body.comment,
    hasFile: !!req.body.file
  });

  try {
    // Validate task ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid task ID provided"
      });
    }

    // Validate comment
    if (!req.body.comment || req.body.comment.trim() === '') {
      return res.status(400).json({ 
        success: false,
        comment: "Comment text is required" 
      });
    }
    
    // Validate user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "User authentication required" 
      });
    }
    
    let imageUrl = null;
    
    // Handle file upload if provided
    if (req.body.file && req.body.file.trim() !== '') {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${req.body.file}`,
          {
            folder: "comment_images"
          }
        );
        
        imageUrl = result.secure_url;
        console.log('Image uploaded to Cloudinary:', imageUrl);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        // Continue with comment creation even if image upload fails
      }
    }
    
    // Create new comment object
    const newComment = {
      content: req.body.comment,
      by: req.user.id,
      image: imageUrl,
      createdAt: new Date()
    };
    
    // Find the task and add the comment
    const updatedTask = await tasksModel.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: newComment } },
      { 
        new: true, // Return the updated document
        runValidators: true 
      }
    ).populate({
      path: 'assigns',
      select: 'fullName email picture'
    }).populate({
      path: 'comments.by',
      select: 'fullName email picture'
    });
    
    // Check if task exists
    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    // Log activity for comment addition
    if (req.logActivity) {
      req.logActivity(
        "Added Comment",
        `Added comment on task: ${updatedTask.title || "Unknown Task"}`,
        "comment_added",
        newComment._id,
        "Comment",
        { taskId: req.params.id }
      ).catch(err => console.error("Error logging comment activity:", err));
      
      console.log("✅ Activity logged for comment:", newComment._id);
    }
    
    // Return success with the full updated task
    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: updatedTask
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message
    });
  }
};

/**
 * Delete a comment from a task with authorization
 */
const DeleteComment = async (req, res) => {
  console.log('Delete Comment Request:', {
    taskId: req.params.id,
    commentId: req.params.c_id,
    userId: req.user?.id
  });

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid task ID" 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.params.c_id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid comment ID" 
      });
    }
    
    // First get the task to check comment ownership
    const task = await tasksModel.findById(req.params.id)
      .populate({
        path: 'comments.by',
        select: 'fullName email picture'
      });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    // Find the comment
    const comment = task.comments.find(c => 
      c._id.toString() === req.params.c_id
    );
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }
    
    // Check authorization - only allow comment creator or admin to delete
    const isCommentCreator = comment.by && 
      comment.by._id && 
      comment.by._id.toString() === req.user.id;
    
    const isAdmin = req.user.roles && 
      req.user.roles.includes('ADMIN');
    
    if (!isCommentCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this comment"
      });
    }
    
    // Delete the comment
    const updatedTask = await tasksModel.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          comments: { _id: req.params.c_id }
        }
      },
      { 
        new: true, // Return the updated document
        runValidators: true 
      }
    ).populate({
      path: 'assigns',
      select: 'fullName email picture'
    }).populate({
      path: 'comments.by',
      select: 'fullName email picture'
    });
    
    // Return success with the full updated task
    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: updatedTask
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message
    });
  }
};

/**
 * Get comments for a task
 */
const GetComments = async (req, res) => {
  console.log('Get Comments Request:', {
    taskId: req.params.id
  });

  try {
    // Validate task ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid task ID provided"
      });
    }
    
    // Find the task and return just the comments
    const task = await tasksModel.findById(req.params.id)
      .select('comments') // Only select the comments field
      .populate({
        path: 'comments.by',
        select: 'fullName email picture'
      });
    
    // Check if task exists
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    
    // Return success with the comments
    return res.status(200).json({
      success: true,
      comments: task.comments || []
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message
    });
  }
};

module.exports = {
  AddComment,
  DeleteComment,
  GetComments
};