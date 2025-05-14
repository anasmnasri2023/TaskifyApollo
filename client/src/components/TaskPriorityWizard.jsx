// components/TaskPriorityWizard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MOCK_PRIORITY, MOCK_STATUS, MOCK_TYPE } from '../data/mock';
import CommentPopup from './CommentPopup';
import { FindOneTaskAction } from '../redux/actions/tasks';

const TaskPriorityWizard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(4); // 4 tasks per page
  
  // Comment popup states
  const [popupOpenComment, setPopupOpenComment] = useState(false);
  const [commentTaskId, setCommentTaskId] = useState(null);
  const [selectedTaskForComment, setSelectedTaskForComment] = useState(null);
  const popupComment = useRef(null);
  
  // Get user ID
  const userId = user?._id || user?.id;
  
  // Generate mock tasks
  const generateMockTasks = () => {
    const taskTitles = [
      "Fix Critical Security Vulnerability in Auth System",
      "Implement Two-Factor Authentication",
      "Database Migration to PostgreSQL 14",
      "Optimize API Response Times",
      "Deploy New User Dashboard",
      "Write Tests for Payment Processing",
      "Update SSL Certificates (Expiring Soon)",
      "Refactor User Service Architecture",
      "Implement Redis Caching Layer",
      "Fix Memory Leak in Background Worker",
      "Create API Documentation",
      "Setup Kubernetes Cluster",
      "Implement WebSocket for Real-time Updates",
      "Migrate to Microservices Architecture",
      "Configure Monitoring Dashboard"
    ];
    
    const mockTasks = [];
    
    for (let i = 0; i < 12; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 10));
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 30) - 10);
      
      const priority = MOCK_PRIORITY[Math.floor(Math.random() * MOCK_PRIORITY.length)];
      const status = MOCK_STATUS.filter(s => s.value !== "3")[Math.floor(Math.random() * (MOCK_STATUS.length - 1))];
      const type = MOCK_TYPE[Math.floor(Math.random() * MOCK_TYPE.length)];
      
      mockTasks.push({
        _id: `task_${i + 1}`,
        id: `task_${i + 1}`,
        title: taskTitles[i] || `Task ${i + 1}`,
        description: `This is a ${priority.label} priority ${type.label || 'general'} task requiring attention.`,
        priority: priority,
        status: status,
        type: type,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        dueDate: endDate.toISOString()
      });
    }
    
    return mockTasks;
  };
  
  // Smart prioritization algorithm
  const smartPrioritization = (tasks) => {
    const pendingTasks = tasks.filter(task => 
      task.status?.value !== "3" && task.status?.label !== "completed"
    );
    
    const scoredTasks = pendingTasks.map(task => {
      let score = 0;
      let factors = [];
      
      // Priority scoring (critical: 40, high: 30, medium: 20, low: 10)
      const priorityWeights = { "4": 40, "3": 30, "2": 20, "1": 10 };
      const priorityScore = priorityWeights[task.priority?.value] || 20;
      score += priorityScore;
      
      // Deadline urgency scoring
      let urgencyFactor = null;
      if (task.end_date || task.dueDate) {
        const dueDate = new Date(task.end_date || task.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          score += 50; // Overdue
          urgencyFactor = { type: 'overdue', days: Math.abs(daysUntilDue) };
        } else if (daysUntilDue === 0) {
          score += 45; // Due today
          urgencyFactor = { type: 'today' };
        } else if (daysUntilDue === 1) {
          score += 40; // Due tomorrow
          urgencyFactor = { type: 'tomorrow' };
        } else if (daysUntilDue <= 3) {
          score += 35; // Due within 3 days
          urgencyFactor = { type: 'soon', days: daysUntilDue };
        } else if (daysUntilDue <= 7) {
          score += 25; // Due within a week
          urgencyFactor = { type: 'week', days: daysUntilDue };
        } else if (daysUntilDue <= 14) {
          score += 15; // Due within 2 weeks
          urgencyFactor = { type: 'twoweeks', days: daysUntilDue };
        } else {
          score += 5; // Due later
          urgencyFactor = { type: 'later', days: daysUntilDue };
        }
      }
      
      // Task type complexity scoring
      const complexityScores = {
        "7": 15, // Cybersecurity Assessment
        "8": 15, // Cloud Migration
        "5": 12, // System Design
        "9": 12, // DevOps Pipeline
        "4": 10, // Infrastructure Maintenance
        "6": 10, // Network Configuration
        "10": 10, // Data Center Optimization
        "2": 5,  // Authorization
        "3": 3,  // Leave
        "1": 0   // Unspecified
      };
      const complexityScore = complexityScores[task.type?.value] || 5;
      score += complexityScore;
      
      // Status consideration
      let statusPenalty = 0;
      if (task.status?.value === "4") {
        score -= 5; // Blocked
        statusPenalty = 5;
      }
      if (task.status?.value === "1") {
        score -= 3; // On hold
        statusPenalty = 3;
      }
      
      return {
        ...task,
        priorityScore: score,
        scoringFactors: {
          priority: priorityScore,
          urgency: urgencyFactor,
          complexity: complexityScore,
          statusPenalty: statusPenalty
        },
        recommendation: generateSmartRecommendation(task, score, { urgencyFactor, complexityScore, priorityScore, statusPenalty })
      };
    });
    
    // Sort by priority score (highest first)
    return scoredTasks.sort((a, b) => b.priorityScore - a.priorityScore);
  };
  
  // Generate smarter recommendation reasons
  const generateSmartRecommendation = (task, score, factors) => {
    const { urgencyFactor, complexityScore, priorityScore, statusPenalty } = factors;
    const reasons = [];
    
    // Priority-based recommendations
    if (task.priority?.value === "4") {
      reasons.push("Critical priority demands immediate attention");
    } else if (task.priority?.value === "3") {
      reasons.push("High priority task with significant business impact");
    } else if (task.priority?.value === "2") {
      reasons.push("Medium priority task that maintains workflow efficiency");
    }
    
    // Urgency-based recommendations
    if (urgencyFactor) {
      switch (urgencyFactor.type) {
        case 'overdue':
          reasons.push(`Overdue by ${urgencyFactor.days} days - requires immediate resolution to minimize project delays`);
          break;
        case 'today':
          reasons.push("Due today - complete now to maintain schedule integrity");
          break;
        case 'tomorrow':
          reasons.push("Due tomorrow - prioritize to avoid last-minute rush");
          break;
        case 'soon':
          reasons.push(`Due in ${urgencyFactor.days} days - address promptly to prevent deadline pressure`);
          break;
        case 'week':
          reasons.push(`${urgencyFactor.days} days remaining - ideal time to start for quality delivery`);
          break;
      }
    }
    
    // Complexity-based recommendations
    if (complexityScore >= 12) {
      reasons.push("Complex technical task requiring deep focus and expertise");
    } else if (complexityScore >= 10) {
      reasons.push("Moderately complex task that benefits from dedicated attention");
    }
    
    // Status-based recommendations
    if (task.status?.value === "4") {
      reasons.push("Currently blocked - requires unblocking to prevent cascading delays");
    } else if (task.status?.value === "1") {
      reasons.push("On hold - consider reactivating if dependencies are resolved");
    }
    
    // Type-specific insights
    const typeValue = task.type?.value || "1";
    switch (typeValue) {
      case "7": // Cybersecurity
        reasons.push("Security task - critical for maintaining system integrity");
        break;
      case "8": // Cloud Migration
        reasons.push("Infrastructure migration - impacts entire system architecture");
        break;
      case "5": // System Design
        reasons.push("Architecture decision - shapes future development direction");
        break;
      case "9": // DevOps Pipeline
        reasons.push("Pipeline optimization - improves team productivity");
        break;
    }
    
    // Score-based insights
    if (score >= 80) {
      reasons.push("Exceptionally high priority score indicates this task is crucial for project success");
    } else if (score >= 60) {
      reasons.push("Strong priority score suggests completing this task will significantly advance project goals");
    }
    
    return reasons.join(". ") || "Standard priority task - complete as schedule permits";
  };
  
  // Handle view task (opens comment popup directly)
  const handleViewTask = (task, e) => {
    e.preventDefault();
    
    if (task._id) {
      console.log("Opening comment popup for task:", task._id);
      setCommentTaskId(task._id);
      setSelectedTaskForComment(task);
      
      if (!task._id.startsWith('task_')) {
        // Real task - try to fetch full details first
        dispatch(FindOneTaskAction(task._id))
          .then(() => {
            setPopupOpenComment(true);
          })
          .catch((error) => {
            console.error("Error fetching task data for comments:", error);
            // Continue with comments popup anyway
            setPopupOpenComment(true);
          });
      } else {
        // Mock task - just open popup
        setPopupOpenComment(true);
      }
    } else {
      console.error("Cannot open comments: No task ID available");
    }
  };
  
  // Fetch and prioritize tasks
  const fetchAndPrioritizeTasks = async () => {
    setLoading(true);
    
    try {
      // Try to fetch real tasks first
      if (userId) {
        const response = await axios.get(`/api/tasks`, {
          params: {
            userId: userId,
            assignedTo: userId
          }
        });
        
        if (response.data && response.data.data && response.data.data.length > 0) {
          const prioritizedTasks = smartPrioritization(response.data.data);
          setTasks(prioritizedTasks);
          setLoading(false);
          return;
        }
      }
      
      // If no real tasks or no user, use mock data
      const mockTasks = generateMockTasks();
      const prioritizedTasks = smartPrioritization(mockTasks);
      setTasks(prioritizedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // On error, use mock data
      const mockTasks = generateMockTasks();
      const prioritizedTasks = smartPrioritization(mockTasks);
      setTasks(prioritizedTasks);
    } finally {
      setLoading(false);
    }
  };
  
  // Load tasks on mount
  useEffect(() => {
    fetchAndPrioritizeTasks();
  }, [userId]);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Get priority badge
  const getPriorityBadge = (priority) => {
    if (!priority) return null;
    
    const styles = {
      "4": "bg-danger text-white",
      "3": "bg-warning text-white",
      "2": "bg-primary text-white",
      "1": "bg-success text-white"
    };
    
    return (
      <span className={`inline-flex rounded-full py-1 px-3 text-xs font-medium ${styles[priority.value] || 'bg-gray-2 text-bodydark'}`}>
        {priority.label || 'Unknown'}
      </span>
    );
  };
  
  // Calculate days until due
  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-danger font-medium">Overdue by {Math.abs(diffDays)} days</span>;
    } else if (diffDays === 0) {
      return <span className="text-warning font-medium">Due today</span>;
    } else if (diffDays === 1) {
      return <span className="text-warning font-medium">Due tomorrow</span>;
    } else {
      return <span className="text-success">Due in {diffDays} days</span>;
    }
  };
  
  // Pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(tasks.length / tasksPerPage);
  
  return (
    <>
      <div id="task-priority-wizard" className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Task Priority Wizard
          </h3>
          
          <button
            onClick={fetchAndPrioritizeTasks}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full bg-primary/10 py-2 px-4 text-sm font-medium text-primary hover:bg-opacity-90 disabled:bg-opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Priorities
              </>
            )}
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <p className="text-base text-bodydark">
              Our AI analyzes your tasks based on due dates, priority levels, and task relationships to recommend what you should focus on next.
            </p>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-sm text-bodydark">Analyzing your tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-gray-2 dark:bg-meta-4 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-bodydark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h4 className="mt-4 text-lg font-medium text-black dark:text-white">
                No Pending Tasks
              </h4>
              <p className="mt-2 text-bodydark">
                You don't have any in-progress tasks to prioritize. Great job staying on top of things!
              </p>
              <Link
                to="/projects/task-list"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-white transition hover:bg-opacity-90"
              >
                Create a Task
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                <h4 className="text-lg font-medium text-black dark:text-white mb-1">
                  Task Priority Recommendations
                </h4>
                <p className="text-sm text-bodydark">
                  Here are your tasks in recommended order of completion:
                </p>
              </div>
              
              {currentTasks.map((task, index) => (
                <div 
                  key={task._id || task.id}
                  className={`rounded-lg border ${index === 0 && currentPage === 1 ? 'border-primary bg-primary/5' : 'border-stroke dark:border-strokedark'} p-4 transition-all hover:shadow-md`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      {index === 0 && currentPage === 1 && (
                        <span className="inline-flex rounded-full bg-primary py-1 px-3 text-xs text-white font-medium">
                          Recommended
                        </span>
                      )}
                      <h5 className="text-lg font-medium text-black dark:text-white">
                        {task.title || 'Untitled Task'}
                      </h5>
                    </div>
                    {getPriorityBadge(task.priority)}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mb-3">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-bodydark mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-bodydark">
                        {formatDate(task.end_date || task.dueDate)}
                      </span>
                    </div>
                    
                    {(task.end_date || task.dueDate) && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-bodydark mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">
                          {getDaysUntilDue(task.end_date || task.dueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-bodydark mb-3">
                    <span className="font-medium text-black dark:text-white">Why prioritize this: </span>
                    {task.recommendation}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => handleViewTask(task, e)}
                      className="inline-flex items-center justify-center rounded border border-primary py-2 px-4 text-sm font-medium text-primary hover:bg-primary hover:text-white transition"
                    >
                      View Task
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-stroke dark:border-strokedark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-2 dark:hover:bg-meta-4"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-bodydark">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-stroke dark:border-strokedark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-2 dark:hover:bg-meta-4"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Comment Popup Only */}
      <CommentPopup
        popupOpen={popupOpenComment}
        setPopupOpen={setPopupOpenComment}
        popup={popupComment}
        taskId={commentTaskId}
        task={selectedTaskForComment}
      />
    </>
  );
};

export default TaskPriorityWizard;