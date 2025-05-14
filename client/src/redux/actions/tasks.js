import axios from "axios";
import swal from "sweetalert";
import { setRefresh } from "../reducers/commons";
import { setErrors } from "../reducers/errors";
import {
  _AddTask,
  _DeleteTasks,
  _FindOneTask,
  _FindTasks,
} from "../reducers/tasks";
import { MOCK_PRIORITY, MOCK_STATUS, MOCK_TYPE } from '../../data/mock';

// Updated Add Task Action with file upload support
export const AddTaskAction = (form, files, setPopupOpen) => async (dispatch) => {
  dispatch(setRefresh(true));
  
  // Check if files are provided
  if (files && files.length > 0) {
    // Create FormData object for file upload
    const formData = new FormData();
    
    // Add all form fields to FormData
    for (const key in form) {
      if (key === 'assigns' || key === 'project' || key === 'priority' || key === 'status' || key === 'type') {
        formData.append(key, JSON.stringify(form[key]));
      } else {
        formData.append(key, form[key]);
      }
    }
    
    // Add file
    formData.append('attachment', files[0]);
    
    await axios
      .post("/api/tasks", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then((res) => {
        dispatch(_AddTask(res.data.data));
        setPopupOpen(false);
        dispatch(setRefresh(false));
        dispatch(setErrors({}));
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
        dispatch(setRefresh(false));
      });
  } else {
    // No files, use regular JSON request
    await axios
      .post("/api/tasks", form)
      .then((res) => {
        dispatch(_AddTask(res.data.data));
        setPopupOpen(false);
        dispatch(setRefresh(false));
        dispatch(setErrors({}));
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
        dispatch(setRefresh(false));
      });
  }
};

// Updated Update Task Action with file upload support
export const UpdateTaskAction = (form, id, files, setPopupOpen) => async (dispatch) => {
  dispatch(setRefresh(true));
  
  // Check if files are provided
  if (files && files.length > 0) {
    // Create FormData object for file upload
    const formData = new FormData();
    
    // Add all form fields to FormData
    for (const key in form) {
      if (key === 'assigns' || key === 'project' || key === 'priority' || key === 'status' || key === 'type') {
        formData.append(key, JSON.stringify(form[key]));
      } else {
        formData.append(key, form[key]);
      }
    }
    
    // Add file
    formData.append('attachment', files[0]);
    
    await axios
      .put(`/api/tasks/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then((res) => {
        dispatch(_FindOneTask(id));
        dispatch(FindTaskAction());
        setPopupOpen(false);
        dispatch(setRefresh(false));
        dispatch(setErrors({}));
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
        dispatch(setRefresh(false));
      });
  } else {
    // No files, use regular JSON request
    await axios
      .put(`/api/tasks/${id}`, form)
      .then((res) => {
        dispatch(_FindOneTask(id));
        dispatch(FindTaskAction());
        setPopupOpen(false);
        dispatch(setRefresh(false));
        dispatch(setErrors({}));
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
        dispatch(setRefresh(false));
      });
  }
};

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

// Update your AddCommentAction in your tasks.js Redux file
export const AddCommentAction = (form, id) => async (dispatch) => {
  dispatch(setRefresh(true));
  
  try {
    let formData;
    let config;
    
    // Check if we have a file to upload
    if (form.file && form.file instanceof File) {
      console.log("Processing file for upload:", form.file.name);
      
      // Create FormData for multipart file upload
      formData = new FormData();
      formData.append('comment', form.comment);
      formData.append('file', form.file);
      
      // Set proper content type for multipart/form-data
      config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Make API call with FormData
      const response = await axios.post(`/api/tasks/${id}/comments`, formData, config);
      dispatch(setErrors({}));
      dispatch(setRefresh(false));
      return response;
    } else {
      // No file, just send JSON
      const response = await axios.post(`/api/tasks/${id}/comments`, { 
        comment: form.comment
      });
      dispatch(setErrors({}));
      dispatch(setRefresh(false));
      return response;
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    
    if (error.response && error.response.data) {
      dispatch(setErrors(error.response.data));
    } else {
      dispatch(setErrors({ comment: "Failed to add comment" }));
    }
    
    dispatch(setRefresh(false));
    throw error;
  }
};

// Helper function to resize image before upload
const resizeImage = (file, maxWidth, maxHeight) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to lower quality JPEG
        const resizedImage = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
        resolve(resizedImage);
      };
    };
  });
};

export const DeleteCommentAction = (id, id_c) => async (dispatch) => {
  await axios
    .delete(`/api/tasks/${id}/comments/${id_c}`)
    .then((res) => {
      dispatch(FindOneTaskAction(id));
      dispatch(setErrors({}));
    })
    .catch((error) => {
      dispatch(setErrors(error.response.data));
    });
};

export const FindTaskAction = (userId) => async (dispatch) => {
  await axios
    .get(`/api/tasks?userId=${userId}`)
    .then((res) => {
      dispatch(_FindTasks(res.data.data));
    })
    .catch((error) => {
      dispatch(setErrors(error.response.data));
    });
};

export const FindOneTaskAction = (id) => async (dispatch) => {
  console.log('FindOneTaskAction called with ID:', id);
  dispatch(setRefresh(true));
  
  try {
    const response = await axios.get(`/api/tasks/${id}`);
    console.log('FindOneTaskAction response:', response.data);
    
    dispatch(_FindOneTask(response.data));
    
    setTimeout(() => {
      dispatch(setRefresh(false));
    }, 300);
    
    dispatch(setErrors({}));
    
    return response;
  } catch (error) {
    console.error('FindOneTaskAction error:', error);
    console.error('Error response:', error.response?.data);
    
    if (error.response?.status === 404) {
      console.log('Task not found');
    }
    
    if (error.response?.status === 500) {
      console.error('Server error when fetching task. Check your backend logs!');
    }
    
    dispatch(setErrors(error.response?.data || { message: 'Failed to fetch task' }));
    dispatch(setRefresh(false));
    
    throw error;
  }
};

export const DeleteTaskAction = (id) => async (dispatch) => {
  if (window.confirm("Do you want to delete this task?")) {
    await axios
      .delete(`/api/tasks/${id}`)
      .then((res) => {
        dispatch(_DeleteTasks(id));
        swal("Success", "Task deleted successfully", "success");
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
      });
  }
};

// Add new action to delete attachment
export const DeleteAttachmentAction = (id) => async (dispatch) => {
  if (window.confirm("Do you want to delete this attachment?")) {
    await axios
      .delete(`/api/tasks/${id}/attachment`)
      .then((res) => {
        dispatch(FindOneTaskAction(id));
        dispatch(FindTaskAction());
      })
      .catch((error) => {
        dispatch(setErrors(error.response.data));
      });
  }
};

// Action to reschedule task via drag and drop
export const RescheduleTaskAction = (id, newDates) => async (dispatch) => {
  console.log("RescheduleTaskAction called with:", { id, newDates });
  dispatch(setRefresh(true));
  
  try {
    const formattedDates = {
      start_date: typeof newDates.start_date === 'string' 
        ? newDates.start_date 
        : new Date(newDates.start_date).toISOString(),
      end_date: typeof newDates.end_date === 'string' 
        ? newDates.end_date 
        : new Date(newDates.end_date).toISOString(),
      is_all_day: newDates.is_all_day
    };
    
    console.log("Making API call with formatted dates:", formattedDates);
    
    const response = await axios.patch(`/api/tasks/${id}/reschedule`, formattedDates);
    
    if (response.data && response.data.success) {
      console.log("Reschedule successful:", response.data);
      
      dispatch(_FindOneTask(response.data.data));
      
      dispatch(FindTaskAction());
      
      swal("Success", "Task rescheduled successfully", "success");
    } else {
      console.error("API returned success: false", response.data);
      swal("Error", response.data?.error || "Failed to reschedule task", "error");
    }
  } catch (error) {
    console.error("Reschedule error:", error);
    console.error("Error details:", error.response?.data);
    
    swal("Error", error.response?.data?.error || "Failed to reschedule task", "error");
    
    dispatch(setErrors(error.response?.data || { error: "Failed to reschedule task" }));
  } finally {
    setTimeout(() => {
      dispatch(setRefresh(false));
    }, 500);
  }
};

// Action to fetch task comments
export const GetTaskCommentsAction = (taskId) => async (dispatch) => {
  console.log('GetTaskCommentsAction called with task ID:', taskId);
  dispatch(setRefresh(true));
  
  try {
    const response = await axios.get(`/api/tasks/${taskId}/comments`);
    console.log('Comments fetched successfully:', response.data);
    
    dispatch(setRefresh(false));
    dispatch(setErrors({}));
    
    return response.data.comments || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    
    if (error.response) {
      console.error('Error response:', error.response.data);
      dispatch(setErrors(error.response.data));
    } else {
      dispatch(setErrors({ message: 'Network error when fetching comments' }));
    }
    
    dispatch(setRefresh(false));
    
    return [];
  }
};
// Add this to your activityActions.js file

export const fetchSmartTaskPriorities = (userId) => async (dispatch) => {
  try {
    // First try to fetch real tasks
    const response = await axios.get(`/api/tasks`, {
      params: {
        userId: userId,
        // Get all tasks assigned to user
        assignedTo: userId,
      }
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      // If we have real tasks, return them
      return { tasks: response.data.data };
    }
    
    // If no real tasks or error, generate mock tasks
    const mockTasks = generateMockTasks(userId);
    return { tasks: mockTasks };
  } catch (error) {
    console.error('Error fetching tasks for prioritization:', error);
    // On error, return mock tasks
    const mockTasks = generateMockTasks(userId);
    return { tasks: mockTasks };
  }
};

// Generate mock tasks for demonstration
const generateMockTasks = (userId) => {
  const taskTitles = [
    "Fix Critical Security Vulnerability",
    "Implement Two-Factor Authentication",
    "Database Migration to PostgreSQL",
    "Optimize API Performance",
    "Deploy New User Dashboard",
    "Write Tests for Payment Module",
    "Update SSL Certificates",
    "Refactor Authentication Service",
    "Implement Redis Caching",
    "Fix Memory Leak in Worker Service",
    "Update API Documentation",
    "Configure CI/CD Pipeline",
    "Implement WebSocket Notifications",
    "Migrate to Microservices",
    "Setup Monitoring Dashboard"
  ];
  
  const mockTasks = [];
  
  for (let i = 0; i < 15; i++) {
    // Create realistic dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 10));
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 30) - 10);
    
    // Select random mock data
    const priority = MOCK_PRIORITY[Math.floor(Math.random() * MOCK_PRIORITY.length)];
    const status = MOCK_STATUS.filter(s => s.value !== "3")[Math.floor(Math.random() * (MOCK_STATUS.length - 1))];
    const type = MOCK_TYPE[Math.floor(Math.random() * MOCK_TYPE.length)];
    
    mockTasks.push({
      _id: `task_${i + 1}`,
      id: `task_${i + 1}`,
      title: taskTitles[i] || `Task ${i + 1}`,
      description: `This is a ${priority.label} priority ${type.label || 'general'} task that needs attention.`,
      assignedTo: userId,
      assigns: [{ _id: userId }], // Make sure it matches your data structure
      priority: priority,
      status: status,
      type: type,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      dueDate: endDate.toISOString(),
      project: {
        name: "Taskify Development",
        _id: "project_1"
      }
    });
  }
  
  return mockTasks;
};