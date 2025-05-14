const teamsModel = require("../models/teams");
const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");
const ProjectModel = require("../models/projet");
const TaskModel = require("../models/tasks");
const socket = require("../socket");
const { addNotification } = require("./notifications");
const teamsValidation = require("../validation/teamsValidation.js");



/* Create Team */
const CreateTeam = async (req, res) => {
    console.log('Received team creation request with body:', JSON.stringify(req.body));
    console.log('Members array received:', JSON.stringify(req.body.members));
    
    const { errors, isValid } = teamsValidation(req.body);
    try {
      if (!isValid) {
        console.log('Validation errors:', errors);
        return res.status(400).json(errors);
      }
  
      const mongoose = require('mongoose');
      
      // Validate and prepare members array
      const members = [{
        user: req.user._id,
        role: "ADMIN",
        joinedAt: new Date()
      }];
  
      console.log('Initial members array (creator only):', JSON.stringify(members));
  
      // Extract member IDs for chat room participants
      const chatParticipants = [req.user._id]; // Start with creator
  
      if (req.body.members && Array.isArray(req.body.members)) {
        console.log('Processing additional members. Count:', req.body.members.length);
        
        for (const memberId of req.body.members) {
          try {
            // Skip invalid members
            if (!memberId) {
              console.log('Skipping null/undefined member ID');
              continue;
            }
            
            console.log('Processing member ID:', memberId);
            
            // Convert to ObjectId for comparison
            const memberObjectId = new mongoose.Types.ObjectId(memberId);
            const creatorObjectId = new mongoose.Types.ObjectId(req.user._id.toString());
            
            // Avoid duplicate creator
            if (!memberObjectId.equals(creatorObjectId)) {
              console.log('Adding member to team:', memberId);
              members.push({
                user: memberObjectId,
                role: "ENGINEER",
                joinedAt: new Date()
              });
              
              // Add to chat participants
              chatParticipants.push(memberObjectId);
            } else {
              console.log('Skipping creator duplicate:', memberId);
            }
          } catch (error) {
            console.error(`Invalid member ID: ${memberId}`, error);
            continue; // Skip invalid IDs
          }
        }
      }
  
      console.log('Final members array before saving:', JSON.stringify(members));
      console.log('Chat participants:', JSON.stringify(chatParticipants));
  
      const newTeam = {
        Name: req.body.Name,
        description: req.body.description,
        creatorid: req.user._id,
        pictureprofile: req.body.pictureprofile || null,
        members: members
      };
  
      console.log('Attempting to save team:', JSON.stringify(newTeam));
      const data = await teamsModel.create(newTeam);
      console.log('Team created successfully with ID:', data._id);
      
      // Create chat room for this team
      try {
        console.log('Creating chat room for team:', data.Name);
        
        const chatRoom = new ChatRoom({
          name: data.Name,
          description: `Team chat for ${data.Name}`,
          participants: chatParticipants,
          createdBy: req.user._id,
          isPrivate: false,
          isDirectMessage: false
        });
        
        const savedChatRoom = await chatRoom.save();
        console.log('Chat room created successfully with ID:', savedChatRoom._id);
        
        // Update the team with the chat room reference
        data.chatRoom = savedChatRoom._id;
        await data.save();
        
        console.log('Team updated with chat room reference');
        
        // Notify team members about the new team and chat
        try {
          // Exclude the creator from notifications (they already know they created it)
          const memberIdsWithoutCreator = members
            .filter(m => !m.user.equals(req.user._id))
            .map(m => m.user);
          
          if (memberIdsWithoutCreator.length > 0) {
            const notification = await addNotification({
              receivers: memberIdsWithoutCreator,
              link: `/teams/${data._id}`,
              text: `You've been added to the team "${data.Name}" with its dedicated chat room`
            });
            
            const sockets = memberIdsWithoutCreator.reduce((t, n) => (
              t = [...t, ...socket.methods.getUserSockets(n)]
            ), []);
            
            if (sockets.length > 0) {
              socket.io.to(sockets).emit("notification", notification);
              
              // Also emit a silent refresh for chat rooms
              socket.io.to(sockets).emit('silent-refresh', {
                type: 'new-chat-room',
                roomId: savedChatRoom._id
              });
            }
          }
        } catch (notifyError) {
          console.error("Error sending notifications:", notifyError);
          // Don't fail the entire operation if notifications fail
        }
        
      } catch (chatError) {
        console.error('Error creating chat room:', chatError);
        
        // Delete the team if chat room creation fails
        await teamsModel.findByIdAndDelete(data._id);
        
        return res.status(500).json({
          success: false,
          message: 'Team created but chat room creation failed. Team has been removed.',
          error: chatError.message
        });
      }
      
      // Respond with created team (now including chat room reference)
      res.status(201).json({
        success: true,
        data: {
          ...data.toObject(),
          chatRoom: data.chatRoom
        }
      });
  
    } catch (error) {
      console.error('Complete team creation error:', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      res.status(500).json({ 
        success: false,
        error: error.message, 
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          receivedData: req.body
        } : undefined
      });
    }
};

/* Get All Teams */
const GetAllTeams = async (req, res) => {
  try {
    const data = await teamsModel.find()
      .populate({
        path: "creatorid",
        select: "-password"
      })
      .populate({
        path: "members.user",
        select: "-password"
      })
      .populate({
        path: "chatRoom",
        select: "name description"
      });

    res.status(200).json({
      length: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Get Single Team */
const GetTeam = async (req, res) => {
  try {
    const data = await teamsModel.findById(req.params.id)
      .populate({
        path: "creatorid",
        select: "-password"
      })
      .populate({
        path: "members.user",
        select: "-password"
      })
      .populate({
        path: "chatRoom",
        select: "name description participants"
      });

    if (!data) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Get All Teams for Current User */
const GetUserTeams = async (req, res) => {
    try {
      const userId = req.user._id; // Authenticated user's ID
      
      // Teams where user is the creator
      const createdTeams = await teamsModel.find({ creatorid: userId })
        .populate({
          path: "creatorid",
          select: "-password"
        })
        .populate({
          path: "members.user",
          select: "-password"
        })
        .populate({
          path: "chatRoom",
          select: "name description"
        });
  
      // Teams where user is a member (but not creator)
      const joinedTeams = await teamsModel.find({
        "members.user": userId,
        creatorid: { $ne: userId } // Exclude teams where user is creator
      })
      .populate({
        path: "creatorid",
        select: "-password"
      })
      .populate({
        path: "members.user",
        select: "-password"
      })
      .populate({
        path: "chatRoom",
        select: "name description"
      });
  
      res.status(200).json({
        success: true,
        data: {
          createdTeams: createdTeams,
          joinedTeams: joinedTeams,
          allTeams: [...createdTeams, ...joinedTeams] // Combined list
        }
      });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
};

/* Update Team */
const UpdateTeam = async (req, res) => {
  try {
    const { errors, isValid } = teamsValidation(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    // Find the team first
    const team = await teamsModel.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Prepare update object
    const updates = {
      Name: req.body.Name,
      description: req.body.description
    };
    
    // Only update picture if provided
    if (req.body.pictureprofile) {
      updates.pictureprofile = req.body.pictureprofile;
    }
    
    // Store old participants for chat room update
    const oldParticipants = team.members.map(m => m.user.toString());
    
    // Handle members update if provided
    if (req.body.members && Array.isArray(req.body.members)) {
      // Process members - Convert to proper format for MongoDB
      const members = [];
      
      // Add creator as admin if not in members list
      const creatorIncluded = req.body.members.some(m => 
        m.toString() === team.creatorid.toString() || 
        (typeof m === 'object' && m.user && m.user.toString() === team.creatorid.toString())
      );
      
      if (!creatorIncluded) {
        members.push({
          user: team.creatorid,
          role: "ADMIN",
          joinedAt: new Date()
        });
      }
      
      // Process the rest of the members
      for (const member of req.body.members) {
        const userId = typeof member === 'object' ? member.user : member;
        const role = typeof member === 'object' ? member.role : "ENGINEER";
        
        // Skip duplicate entries
        if (members.some(m => m.user.toString() === userId.toString())) {
          continue;
        }
        
        members.push({
          user: userId,
          role: role || "ENGINEER",
          joinedAt: new Date()
        });
      }
      
      updates.members = members;
      
      // Update chat room participants if team has a chat room
      if (team.chatRoom) {
        try {
          const newParticipants = members.map(m => m.user);
          
          // Update chat room participants
          await ChatRoom.findByIdAndUpdate(
            team.chatRoom,
            { 
              participants: newParticipants,
              name: req.body.Name || team.Name, // Update chat name if team name changes
              description: req.body.description || team.description
            }
          );
          
          console.log('Chat room participants updated successfully');
        } catch (chatError) {
          console.error('Error updating chat room participants:', chatError);
          // Continue with team update even if chat update fails
        }
      }
    }

    const data = await teamsModel.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate({
      path: "members.user",
      select: "-password"
    }).populate({
      path: "chatRoom",
      select: "name description"
    });

    // Notify all team members about the update
    const memberIds = data.members.map(m => m.user._id || m.user);
    
    try {
      const notification = await addNotification({
        receivers: memberIds,
        link: `/teams/${data._id}`,
        text: `Team ${data.Name} has been updated`
      });

      const sockets = memberIds.reduce((t, n) => (
        t = [...t, ...socket.methods.getUserSockets(n)]
      ), []);

      if (sockets.length > 0) {
        socket.io.to(sockets).emit("notification", notification);
        
        // Emit silent refresh for chat if needed
        if (team.chatRoom) {
          socket.io.to(sockets).emit('silent-refresh', {
            type: 'chat-room-update',
            roomId: team.chatRoom
          });
        }
      }
    } catch (notifyError) {
      console.error("Error sending notifications:", notifyError);
      // Continue processing - don't fail the update if notifications fail
    }

    res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error("Team update error:", error);
    res.status(500).json({ error: error.message });
  }
};

/* Delete Team */
const DeleteTeam = async (req, res) => {
  try {
    const team = await teamsModel.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Delete associated chat room if exists
    if (team.chatRoom) {
      try {
        // First delete all messages in the chat room
        await ChatMessage.deleteMany({ chatRoom: team.chatRoom });
        
        // Then delete the chat room
        await ChatRoom.findByIdAndDelete(team.chatRoom);
        
        console.log('Associated chat room deleted successfully');
      } catch (chatError) {
        console.error('Error deleting chat room:', chatError);
        // Continue with team deletion even if chat deletion fails
      }
    }
    
    // Delete the team
    await teamsModel.findByIdAndDelete(req.params.id);

    // Notify members
    const memberIds = team.members.map(m => m.user);
    const notification = await addNotification({
      receivers: memberIds,
      text: `Team ${team.Name} has been deleted`
    });

    // Send notifications
    const sockets = memberIds.reduce((acc, id) => 
      [...acc, ...socket.methods.getUserSockets(id)], []);

    if (sockets.length > 0) {
      socket.io.to(sockets).emit("notification", notification);
      
      // Emit silent refresh for chat rooms
      socket.io.to(sockets).emit('silent-refresh', {
        type: 'delete-chat-room',
        roomId: team.chatRoom
      });
    }

    res.status(200).json({ 
      success: true,
      message: "Team and associated chat room deleted successfully" 
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/* Add Member to Team */
const AddMember = async (req, res) => {
  try {
    const team = await teamsModel.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if user is already a member
    const isMember = team.members.some(m => m.user.equals(req.body.userId));
    if (isMember) {
      return res.status(400).json({ message: "User is already a team member" });
    }

    team.members.push({
      user: req.body.userId,
      role: req.body.role || "ENGINEER"
    });

    const updatedTeam = await team.save();

    // Add member to chat room if team has one
    if (team.chatRoom) {
      try {
        const chatRoom = await ChatRoom.findById(team.chatRoom);
        if (chatRoom) {
          // Check if user isn't already in chat room
          if (!chatRoom.participants.includes(req.body.userId)) {
            chatRoom.participants.push(req.body.userId);
            await chatRoom.save();
            
            // Emit socket event for chat member addition
            if (req.io) {
              req.io.to(team.chatRoom.toString()).emit('chat-member-update', {
                roomId: team.chatRoom,
                action: 'add',
                userId: req.body.userId
              });
            }
          }
        }
      } catch (chatError) {
        console.error('Error adding member to chat room:', chatError);
        // Continue even if chat update fails
      }
    }

    // Send notification to new member
    const notification = await addNotification({
      receiver: req.body.userId,
      link: `/teams/${team._id}`,
      text: `You've been added to team: ${team.Name}`
    });

    const sockets = socket.methods.getUserSockets(req.body.userId);
    if (sockets.length > 0) {
      socket.io.to(sockets).emit("notification", notification);
      
      // Also emit silent refresh for chat rooms
      socket.io.to(sockets).emit('silent-refresh', {
        type: 'new-chat-room',
        roomId: team.chatRoom
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTeam
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Remove Member from Team */
const RemoveMember = async (req, res) => {
  try {
    const team = await teamsModel.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Can't remove the creator
    if (team.creatorid.equals(req.body.userId)) {
      return res.status(400).json({ message: "Cannot remove team creator" });
    }

    team.members = team.members.filter(
      m => !m.user.equals(req.body.userId)
    );

    const updatedTeam = await team.save();

    // Remove member from chat room if team has one
    if (team.chatRoom) {
      try {
        const chatRoom = await ChatRoom.findById(team.chatRoom);
        if (chatRoom) {
          chatRoom.participants = chatRoom.participants.filter(
            p => !p.equals(req.body.userId)
          );
          await chatRoom.save();
          
          // Emit socket event for chat member removal
          if (req.io) {
            req.io.to(team.chatRoom.toString()).emit('chat-member-update', {
              roomId: team.chatRoom,
              action: 'remove',
              userId: req.body.userId
            });
          }
        }
      } catch (chatError) {
        console.error('Error removing member from chat room:', chatError);
        // Continue even if chat update fails
      }
    }

    // Notify removed user
    const notification = await addNotification({
      receiver: req.body.userId,
      text: `You've been removed from team: ${team.Name}`
    });

    const sockets = socket.methods.getUserSockets(req.body.userId);
    if (sockets.length > 0) {
      socket.io.to(sockets).emit("notification", notification);
      
      // Also emit silent refresh for chat rooms
      socket.io.to(sockets).emit('silent-refresh', {
        type: 'remove-chat-room',
        roomId: team.chatRoom
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTeam
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* Update Member Role */
const UpdateMemberRole = async (req, res) => {
  try {
    const team = await teamsModel.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const member = team.members.find(
      m => m.user.equals(req.body.userId)
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found in team" });
    }

    member.role = req.body.role;
    const updatedTeam = await team.save();

    // Notify member about role change
    const notification = await addNotification({
      receiver: req.body.userId,
      link: `/teams/${team._id}`,
      text: `Your role in team ${team.Name} has been changed to ${req.body.role}`
    });

    const sockets = socket.methods.getUserSockets(req.body.userId);
    if (sockets.length > 0) {
      socket.io.to(sockets).emit("notification", notification);
    }

    res.status(200).json({
      success: true,
      data: updatedTeam
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// In controllers/teams.js
const getTeamChatDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Find the team and populate its chat room
    const team = await teamsModel.findById(teamId)
      .populate({
        path: 'chatRoom',
        populate: [
          { 
            path: 'participants', 
            select: 'fullName email picture' 
          },
          { 
            path: 'createdBy', 
            select: 'fullName email'
          }
        ]
      })
      .populate({
        path: 'members.user',
        select: 'fullName email picture'
      });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is a member of the team
    const isMember = team.members.some(
      member => member.user._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }
    
    // Get latest messages for the team chat room (optional)
    const latestMessages = await ChatMessage.find({ chatRoom: team.chatRoom._id })
      .populate('sender', 'fullName email picture')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.status(200).json({
      success: true,
      team: {
        _id: team._id,
        Name: team.Name,
        description: team.description,
        chatRoom: team.chatRoom,
        members: team.members,
        creatorid: team.creatorid
      },
      latestMessages
    });
  } catch (error) {
    console.error('Error getting team chat details:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve team chat details',
      error: error.message
    });
  }
};

// controllers/teams.js - Add this function
const GetTeamStats = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;
    
    // Find the team
    const team = await teamsModel.findById(teamId);
    if (!team) {
      return res.status(404).json({ 
        success: false, 
        message: "Team not found" 
      });
    }
    
    // Check if user is a member
    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this team" 
      });
    }
    
    // Get projects for this team
    const projects = await ProjectModel.find({ team: teamId })
      .populate('created_by', 'fullName picture')
      .sort({ createdAt: -1 });
    
    // Get task IDs for all team projects
    const projectIds = projects.map(p => p._id.toString());
    
    // Get tasks for these projects
    const tasks = await TaskModel.find({ 
      project: { $in: projectIds }
    })
    .populate('assigns', 'fullName picture')
    .sort({ createdAt: -1 });
    
    // Calculate statistics
    const stats = {
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'in progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on hold').length
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === '4').length,
        inProgress: tasks.filter(t => t.status === '2' || t.status === '3').length,
        todo: tasks.filter(t => t.status === '1').length,
        overdue: tasks.filter(t => {
          return t.end_date && t.status !== '4' && new Date(t.end_date) < new Date();
        }).length
      },
      recent: {
        projects: projects.slice(0, 3),
        tasks: tasks.slice(0, 4)
      }
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting team stats:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};




module.exports = {
  CreateTeam,
  GetAllTeams,
  GetTeam,
  GetUserTeams,
  UpdateTeam,
  DeleteTeam,
  AddMember,
  RemoveMember,
  UpdateMemberRole,
  getTeamChatDetails,
  GetTeamStats
};