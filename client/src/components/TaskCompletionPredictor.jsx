import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FindTaskAction } from '../redux/actions/tasks';
import { FindUsers } from '../redux/actions/users';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, 
  Bar, ReferenceLine, Scatter
} from 'recharts';
import axios from 'axios';

// Test function to find available models
const findAvailableModels = async () => {
  const API_KEY = import.meta.env.VITE_HUGGING_FACE_TOKEN;
  if (!API_KEY) return [];

  // Extensive list of models to test
  const testModels = [
    // Text generation
    'gpt2', 'distilgpt2', 'EleutherAI/gpt-neo-125M',
    'microsoft/DialoGPT-small', 'microsoft/DialoGPT-medium',
    
    // Text classification
    'distilbert-base-uncased-finetuned-sst-2-english',
    'nlptown/bert-base-multilingual-uncased-sentiment',
    'cardiffnlp/twitter-roberta-base-sentiment',
    'j-hartmann/emotion-english-distilroberta-base',
    
    // Zero-shot classification (these are popular and likely available)
    'facebook/bart-large-mnli',
    'typeform/distilbert-base-uncased-mnli',
    'MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli',
    
    // Feature extraction
    'sentence-transformers/all-MiniLM-L6-v2',
    'sentence-transformers/msmarco-distilbert-base-v4',
    
    // Generic models
    'bert-base-uncased',
    'distilbert-base-uncased',
    'roberta-base',
    'albert-base-v2',
    
    // Specific task models
    'dslim/bert-base-NER',
    'Jean-Baptiste/camembert-ner',
    'Helsinki-NLP/opus-mt-en-fr',
  ];

  console.log("Testing models to find which are available...");
  const availableModels = [];
  
  for (const model of testModels) {
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs: "test" },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.status === 200) {
        console.log(`✅ Model ${model} is available`);
        availableModels.push(model);
      }
    } catch (error) {
      // Only log if it's not a 404
      if (error.response?.status !== 404) {
        console.log(`❓ Model ${model}: ${error.response?.status || error.message}`);
      }
    }
  }
  
  console.log("Available models:", availableModels);
  return availableModels;
};

// Use text generation model for predictions
const predictWithTextGeneration = async (tasks, user, productivityScore, modelName = 'gpt2') => {
  try {
    const API_URL = `https://api-inference.huggingface.co/models/${modelName}`;
    const API_KEY = import.meta.env.VITE_HUGGING_FACE_TOKEN;
    
    if (!API_KEY) return null;
    
    console.log(`Using ${modelName} for predictions...`);
    
    const incompleteTasks = tasks.filter(task => task.status !== '4');
    if (incompleteTasks.length === 0) return [];
    
    const predictions = [];
    
    // Process only first 5 tasks to avoid rate limiting
    for (const task of incompleteTasks.slice(0, 5)) {
      try {
        const prompt = `Task: ${task.title || 'Untitled'} (${getTaskTypeName(task.type)}, ${getPriorityName(task.priority)} priority). Productivity: ${productivityScore}/10. Days to complete:`;
        
        const response = await axios.post(API_URL, {
          inputs: prompt,
          parameters: {
            max_length: 20,
            temperature: 0.3,
            num_return_sequences: 1
          },
          options: { wait_for_model: true }
        }, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        const generatedText = response.data[0]?.generated_text || '';
        // Extract number from generated text
        const numberMatch = generatedText.match(/\d+/);
        const predictedDays = numberMatch ? Math.min(30, Math.max(1, parseInt(numberMatch[0]))) : 5;
        
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + predictedDays);
        
        predictions.push({
          taskId: task._id,
          title: task.title || 'Untitled Task',
          predictedCompletionDate: completionDate.toISOString(),
          predictedDurationDays: predictedDays,
          confidenceScore: 7,
          productivityImpact: 0.1
        });
        
      } catch (error) {
        console.error(`Error predicting task ${task._id}:`, error);
        predictions.push(generateSingleTaskPrediction(task, productivityScore));
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Add local predictions for remaining tasks
    for (const task of incompleteTasks.slice(5)) {
      predictions.push(generateSingleTaskPrediction(task, productivityScore));
    }
    
    return predictions;
    
  } catch (error) {
    console.error("Text generation failed:", error);
    return null;
  }
};

// Use sentiment analysis for predictions
const predictWithSentiment = async (tasks, user, productivityScore, modelName) => {
  try {
    const API_URL = `https://api-inference.huggingface.co/models/${modelName}`;
    const API_KEY = import.meta.env.VITE_HUGGING_FACE_TOKEN;
    
    if (!API_KEY) return null;
    
    console.log(`Using ${modelName} for sentiment-based predictions...`);
    
    const incompleteTasks = tasks.filter(task => task.status !== '4');
    if (incompleteTasks.length === 0) return [];
    
    const predictions = [];
    
    for (const task of incompleteTasks.slice(0, 5)) {
      try {
        const taskText = `${task.title || 'Task'} - ${getTaskTypeName(task.type)} - ${getPriorityName(task.priority)} priority`;
        
        const response = await axios.post(API_URL, {
          inputs: taskText,
          options: { wait_for_model: true }
        }, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Map sentiment to difficulty
        const sentiment = response.data[0]?.[0]?.label || response.data[0]?.label;
        const score = response.data[0]?.[0]?.score || response.data[0]?.score || 0.5;
        
        let baseDays = 5;
        if (sentiment?.toLowerCase().includes('negative') || sentiment?.toLowerCase().includes('difficult')) {
          baseDays = 8;
        } else if (sentiment?.toLowerCase().includes('positive') || sentiment?.toLowerCase().includes('easy')) {
          baseDays = 3;
        }
        
        const predictedDays = Math.round(baseDays * (1 + (1 - score) * 0.5));
        
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + predictedDays);
        
        predictions.push({
          taskId: task._id,
          title: task.title || 'Untitled Task',
          predictedCompletionDate: completionDate.toISOString(),
          predictedDurationDays: predictedDays,
          confidenceScore: Math.round(score * 10),
          productivityImpact: 0.1
        });
        
      } catch (error) {
        predictions.push(generateSingleTaskPrediction(task, productivityScore));
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Add local predictions for remaining tasks
    for (const task of incompleteTasks.slice(5)) {
      predictions.push(generateSingleTaskPrediction(task, productivityScore));
    }
    
    return predictions;
    
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    return null;
  }
};

// Helper functions for task properties
const getTaskTypeName = (type) => {
  const types = {
    '1': 'Bug',
    '2': 'Feature',
    '3': 'Improvement',
    '4': 'Documentation',
    '5': 'Research',
    '6': 'Testing',
    '7': 'Maintenance',
    '8': 'Deployment',
    '9': 'Project'
  };
  return types[type] || 'Unknown';
};

const getPriorityName = (priority) => {
  const priorities = {
    '1': 'High',
    '2': 'Medium',
    '3': 'Low',
    '4': 'Lowest'
  };
  return priorities[priority] || 'Unknown';
};

const getStatusName = (status) => {
  const statuses = {
    '1': 'Pending',
    '2': 'In Progress',
    '3': 'Review',
    '4': 'Completed'
  };
  return statuses[status] || 'Unknown';
};

// Generate prediction for a single task
const generateSingleTaskPrediction = (task, productivityScore) => {
  const typeFactor = {
    '1': 2, '2': 4, '3': 3, '4': 1, '5': 5, '6': 3, '7': 2, '8': 4, '9': 7
  }[task.type] || 3;
  
  const priorityFactor = {
    '1': 0.7, '2': 1.0, '3': 1.2, '4': 1.5
  }[task.priority] || 1.0;
  
  const productivityFactor = Math.max(1, productivityScore) / 7;
  const predictedDays = Math.round(typeFactor * priorityFactor / productivityFactor);
  
  let startDate = new Date();
  if (task.start_date) {
    const taskStartDate = new Date(task.start_date);
    if (!isNaN(taskStartDate.getTime())) {
      startDate = taskStartDate;
    }
  }
  
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + predictedDays);
  
  return {
    taskId: task._id,
    title: task.title || 'Untitled Task',
    predictedCompletionDate: completionDate.toISOString(),
    predictedDurationDays: predictedDays,
    confidenceScore: Math.min(10, Math.max(1, Math.round(productivityScore * 0.8))),
    productivityImpact: (8 - (task.priority || 3)) * 0.1
  };
};

// Local fallback prediction function
const generateLocalPredictions = (userTasks, selectedUserId, userProductivity) => {
  const productivityScore = userProductivity?.productivityScore || 5;
  
  console.log("Generating local predictions for tasks...");
  
  const incompleteTasks = userTasks.filter(task => task.status !== '4');
  
  return incompleteTasks.map(task => generateSingleTaskPrediction(task, productivityScore));
};

// Main prediction function with dynamic model discovery
const getPredictions = async (tasks, user, productivityScore, userProductivity) => {
  let predictions = null;
  
  // Find available models first
  let availableModels = window.availableModels;
  if (!availableModels) {
    availableModels = await findAvailableModels();
    window.availableModels = availableModels;
  }
  
  if (availableModels.length === 0) {
    console.log("No Hugging Face models available, using local predictions");
    return generateLocalPredictions(tasks, user._id, userProductivity);
  }
  
  // Try different types of models
  const textGenModels = availableModels.filter(m => 
    m.includes('gpt') || m.includes('DialoGPT') || m.includes('neo'));
  const sentimentModels = availableModels.filter(m => 
    m.includes('sentiment') || m.includes('emotion'));
  const classificationModels = availableModels.filter(m => 
    m.includes('mnli') || m.includes('classification'));
  
  // Strategy 1: Try text generation models
  if (textGenModels.length > 0) {
    predictions = await predictWithTextGeneration(tasks, user, productivityScore, textGenModels[0]);
  }
  
  // Strategy 2: Try sentiment analysis
  if (!predictions && sentimentModels.length > 0) {
    predictions = await predictWithSentiment(tasks, user, productivityScore, sentimentModels[0]);
  }
  
  // Strategy 3: Use any available model as fallback
  if (!predictions && availableModels.length > 0) {
    predictions = await predictWithTextGeneration(tasks, user, productivityScore, availableModels[0]);
  }
  
  // Strategy 4: Fallback to local predictions
  if (!predictions) {
    predictions = generateLocalPredictions(tasks, user._id, userProductivity);
  }
  
  return predictions;
};

// Generate graph data from tasks and predictions
const generatePredictionsFromData = (userTasks, userPredictions, selectedUserId, userProductivity) => {
  if (!selectedUserId || !userTasks || userTasks.length === 0) {
    console.log("Not enough data to generate predictions");
    return [];
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Define time range (3 months back, 2 months forward)
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 3);
  
  const endDate = new Date(today);
  endDate.setMonth(today.getMonth() + 2);
  
  // Create date points for the graph
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7); // Weekly intervals
  }
  
  // Sort tasks by date
  const completedTasks = userTasks
    .filter(task => task.status === '4')
    .sort((a, b) => new Date(a.end_date || a.updated_at) - new Date(b.end_date || b.updated_at));
  
  const inProgressTasks = userTasks
    .filter(task => task.status === '2' || task.status === '3')
    .sort((a, b) => new Date(a.start_date || a.created_at) - new Date(b.start_date || b.created_at));
  
  // Calculate cumulative completed tasks over time
  let cumulativeCompleted = 0;
  
  // Generate productivity trend
  const productivityScore = userProductivity?.productivityScore || 5;
  const baseProductivity = Math.max(3, productivityScore - 2);
  
  // Calculate future productivity using AI predictions
  const calculateFutureProductivity = (date, baseScore, predictions) => {
    const weeksSinceToday = Math.round((date - today) / (7 * 24 * 60 * 60 * 1000));
    
    // Get predictions that complete before or during this week
    const weekPredictions = predictions.filter(pred => {
      const predDate = new Date(pred.predictedCompletionDate);
      return predDate <= date;
    });
    
    // Calculate productivity impact from predictions
    let productivityImpact = 0;
    if (weekPredictions.length > 0) {
      productivityImpact = weekPredictions.reduce((sum, pred) => 
        sum + (pred.productivityImpact || 0.1), 0);
    }
    
    // Calculate new productivity with AI-based adjustment
    const newProductivity = baseScore + (weeksSinceToday * 0.1) + productivityImpact;
    
    // Ensure productivity is between 1-10
    return Math.min(Math.max(Math.round(newProductivity * 10) / 10, 1), 10);
  };
  
  return dates.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const isPast = date < today;
    const isFuture = date > today;
    const isToday = date.getTime() === today.getTime();
    
    // Count completed tasks up to this date
    if (isPast) {
      completedTasks.forEach(task => {
        const taskDate = new Date(task.end_date || task.updated_at);
        if (taskDate <= date && taskDate >= startDate) {
          cumulativeCompleted++;
        }
      });
    }
    
    // Calculate in-progress and pending tasks for this week
    const activeTasksThisWeek = inProgressTasks.filter(task => {
      const taskStartDate = new Date(task.start_date || task.created_at);
      return taskStartDate <= date && (!task.end_date || new Date(task.end_date) >= date);
    }).length;
    
    // Count predicted completions for this week
    const predictedThisWeek = isFuture ? userPredictions.filter(pred => {
      const predDate = new Date(pred.predictedCompletionDate);
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return predDate >= weekStart && predDate < weekEnd;
    }).length : 0;
    
    // Calculate productivity (actual or predicted)
    let productivity;
    if (isPast) {
      productivity = baseProductivity + (cumulativeCompleted * 0.05);
    } else if (isToday) {
      productivity = productivityScore;
    } else {
      productivity = calculateFutureProductivity(date, productivityScore, userPredictions);
    }
    
    productivity = Math.min(Math.max(Math.round(productivity * 10) / 10, 1), 10);
    
    return {
      date: dateStr,
      displayDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isPast,
      isToday,
      isFuture,
      completedTasks: isPast ? cumulativeCompleted : null,
      inProgressTasks: activeTasksThisWeek,
      predictedCompletions: isFuture ? predictedThisWeek : null,
      productivity,
      taskDetails: isPast ? completedTasks
        .filter(task => {
          const taskDate = new Date(task.end_date || task.updated_at);
          const weekStart = new Date(date);
          const weekEnd = new Date(date);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return taskDate >= weekStart && taskDate < weekEnd;
        })
        .map(task => task.title)
        : isFuture ? userPredictions
          .filter(pred => {
            const predDate = new Date(pred.predictedCompletionDate);
            const weekStart = new Date(date);
            const weekEnd = new Date(date);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return predDate >= weekStart && predDate < weekEnd;
          })
          .map(pred => pred.title)
          : []
    };
  });
};

const UserTaskProductivityGraph = () => {
  const dispatch = useDispatch();
  
  // Get data from Redux
  const tasks = useSelector(state => state.tasks._ALL || []);
  const users = useSelector(state => state.users._ALL || []);
  const predictions = useSelector(state => state.predictions?.allPredictions || []);
  const productivity = useSelector(state => state.predictions?.userProductivity || []);
  const refresh = useSelector(state => state.commons?.refresh);
  
  // Local state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiPredictions, setAiPredictions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionSource, setPredictionSource] = useState('local');
  
  // Debug environment variables
  useEffect(() => {
    console.log("Environment variables available:", import.meta.env);
    console.log("API Key present:", !!import.meta.env.VITE_HUGGING_FACE_TOKEN);
  }, []);
  
  // Fetch users when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        if (users.length === 0 || refresh) {
          console.log("Fetching users for productivity graph...");
          await dispatch(FindUsers());
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Error loading user data");
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [dispatch, refresh, users.length]);
  
  // Fetch tasks only when a user is selected
  useEffect(() => {
    const loadUserTasks = async () => {
      if (!selectedUserId) return;
      
      setLoading(true);
      try {
        console.log(`Fetching tasks for user ${selectedUserId}...`);
        await dispatch(FindTaskAction(selectedUserId));
        setError(null);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Error loading task data");
      } finally {
        setLoading(false);
      }
    };
    
    loadUserTasks();
  }, [dispatch, selectedUserId]);
  
  // Set first user as default when users load
  useEffect(() => {
    if (users.length > 0 && !selectedUserId && !loading) {
      console.log("Setting default user...");
      setSelectedUserId(users[0]._id);
    }
  }, [users, selectedUserId, loading]);
  
  // Get selected user info
  const selectedUser = useMemo(() => {
    return users.find(user => user._id === selectedUserId) || null;
  }, [users, selectedUserId]);
  
  // Get selected user's productivity score
  const userProductivity = useMemo(() => {
    return productivity.find(p => p.userId === selectedUserId) || null;
  }, [productivity, selectedUserId]);
  
  // Filter tasks for selected user
  const userTasks = useMemo(() => {
    if (!selectedUserId || !tasks || tasks.length === 0) return [];
    
    return tasks.filter(task => {
      if (!task.assigns) return false;
      
      if (Array.isArray(task.assigns)) {
        return task.assigns.some(id => 
          id === selectedUserId || 
          (typeof id === 'object' && id._id === selectedUserId)
        );
      } else if (typeof task.assigns === 'string') {
        return task.assigns === selectedUserId;
      } else if (typeof task.assigns === 'object') {
        return task.assigns._id === selectedUserId;
      }
      
      return false;
    });
  }, [tasks, selectedUserId]);
  
  // Get predictions from Hugging Face API when user or tasks change
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!selectedUser || !userTasks || userTasks.length === 0) return;
      
      setIsPredicting(true);
      try {
        // Call the updated getPredictions function with all needed parameters
        const predictions = await getPredictions(
          userTasks, 
          selectedUser, 
          userProductivity?.productivityScore || 5,
          userProductivity
        );
        
        if (predictions && predictions.length > 0) {
          setAiPredictions(predictions);
          
          // Check if predictions came from Hugging Face or local
          if (window.availableModels && window.availableModels.length > 0) {
            setPredictionSource('huggingface');
          } else {
            setPredictionSource('local');
          }
        } else {
          // Fallback to local predictions
          const localPreds = generateLocalPredictions(
            userTasks, 
            selectedUserId,
            userProductivity
          );
          setAiPredictions(localPreds);
          setPredictionSource('local');
        }
      } catch (err) {
        console.error("Error in prediction workflow:", err);
        // Always fallback to local predictions on any error
        const localPreds = generateLocalPredictions(
          userTasks, 
          selectedUserId,
          userProductivity
        );
        setAiPredictions(localPreds);
        setPredictionSource('local');
      } finally {
        setIsPredicting(false);
      }
    };
    
    fetchPredictions();
  }, [selectedUser, userTasks, userProductivity, selectedUserId]);
  
  // Combine Redux predictions with AI predictions
  const combinedPredictions = useMemo(() => {
    return aiPredictions.length > 0 ? aiPredictions : 
      (predictions?.filter(pred => 
        userTasks.some(task => task._id === pred.taskId)) || []);
  }, [predictions, aiPredictions, userTasks]);
  
  // Generate graph data using our predictions
  const graphData = useMemo(() => {
    if (!selectedUserId || !userTasks.length) return [];
    
    try {
      return generatePredictionsFromData(
        userTasks, 
        combinedPredictions, 
        selectedUserId, 
        userProductivity
      );
    } catch (err) {
      console.error("Error generating graph data:", err);
      return [];
    }
  }, [userTasks, combinedPredictions, selectedUserId, userProductivity]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 shadow-md rounded-sm border border-gray-200 dark:bg-boxdark dark:border-strokedark max-w-md">
          <p className="font-medium text-black dark:text-white text-base mb-2">{data.displayDate}</p>
          
          {data.isPast && (
            <>
              <p className="text-success text-sm mb-1"><span className="font-semibold">Completed tasks:</span> {data.completedTasks}</p>
              {data.taskDetails.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-sm">Tasks completed this week:</p>
                  <ul className="list-disc pl-4 mt-1">
                    {data.taskDetails.map((task, idx) => (
                      <li key={idx} className="text-xs">{task}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          
          {data.isToday && (
            <p className="text-primary text-sm mb-1"><span className="font-semibold">Current productivity:</span> {data.productivity.toFixed(1)}/10</p>
          )}
          
          {data.isFuture && data.predictedCompletions > 0 && (
            <>
              <p className="text-primary text-sm mb-1"><span className="font-semibold">Predicted completions:</span> {data.predictedCompletions}</p>
              <p className="text-meta-5 text-sm mb-1"><span className="font-semibold">Predicted productivity:</span> {data.productivity.toFixed(1)}/10</p>
              {data.taskDetails.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-sm">Expected to complete:</p>
                  <ul className="list-disc pl-4 mt-1">
                    {data.taskDetails.map((task, idx) => (
                      <li key={idx} className="text-xs">{task}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          
          <p className="text-meta-8 mt-1 text-sm">
            <span className="font-semibold">Tasks in progress:</span> {data.inProgressTasks}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  if (loading && !selectedUserId) {
    return (
      <div className="rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-3">Loading user data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
        <h3 className="font-medium text-black dark:text-white">
          User Task Productivity Graph
        </h3>
        <p className="text-sm text-body">
          Past, present and predicted future task completion and productivity
          {error && <span className="text-danger ml-2">({error})</span>}
        </p>
        {predictionSource === 'huggingface' && (
          <div className="mt-2 py-1 px-2 bg-primary bg-opacity-10 rounded-sm inline-flex items-center text-xs">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Powered by Hugging Face AI predictions
          </div>
        )}
      </div>
      
      <div className="p-6.5">
        {/* User Selector */}
        <div className="mb-6">
          <label className="mb-2.5 block text-black dark:text-white">
            Select User
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          >
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.fullName || 'Unknown User'}
              </option>
            ))}
          </select>
        </div>
        
        {/* User Info Card */}
        {selectedUser && userProductivity && (
          <div className="mb-6 p-4 bg-gray-1 dark:bg-meta-4 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {selectedUser.fullName?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h5 className="font-medium text-black dark:text-white">
                  {selectedUser.fullName || 'Unknown User'}
                </h5>
                <div className="flex items-center">
                  <span className="text-sm">Productivity Score: </span>
                  <span className="ml-1 font-medium">{userProductivity.productivityScore}/10</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <h6 className="text-sm font-medium mb-2">Strengths:</h6>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {userProductivity.strengths?.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="text-sm font-medium mb-2">Areas for Improvement:</h6>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {userProductivity.areasForImprovement?.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator while tasks are being fetched */}
        {(loading || isPredicting) && selectedUserId && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3">
              {loading ? "Loading task data..." : "Generating AI predictions..."}
            </p>
          </div>
        )}
        
        {/* Productivity Graph */}
        <div className="h-120" style={{ height: "580px" }}>
          {!loading && !isPredicting && graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={graphData}
                margin={{ top: 20, right: 40, left: 10, bottom: 60 }}
              >
                <defs>
                  <linearGradient id="pastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3056D3" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3056D3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="futureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  tickMargin={20}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  label={{ value: 'Timeline', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  yAxisId="left" 
                  domain={[0, 'auto']} 
                  label={{ value: 'Tasks', angle: -90, position: 'insideLeft', offset: 10 }}
                  width={60}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 10]} 
                  label={{ value: 'Productivity Score', angle: 90, position: 'insideRight', offset: 10 }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ paddingTop: '15px' }}
                />
                
                {graphData.find(d => d.isToday) && (
                  <>
                    <ReferenceLine
                      x={graphData.find(d => d.isToday)?.displayDate}
                      stroke="#FF6B6B"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      label={{ 
                        value: 'Today', 
                        position: 'top', 
                        fill: '#FF6B6B',
                        fontSize: 14,
                        fontWeight: 'bold'
                      }}
                      yAxisId="left"
                    />
                    
                    <ReferenceLine
                      x={graphData.find(d => d.isToday)?.displayDate}
                      stroke="none"
                      label={{ 
                        value: '← Past | Future →', 
                        position: 'insideBottom',
                        fill: '#FF6B6B',
                        fontSize: 13,
                        offset: 10
                      }}
                      yAxisId="left"
                    />
                  </>
                )}
                
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="completedTasks"
                  stroke="#3056D3"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  fillOpacity={1}
                  fill="url(#pastGradient)"
                  name="Completed Tasks"
                />
                
                <Bar
                  yAxisId="left"
                  dataKey="inProgressTasks"
                  barSize={20}
                  fill="#FFB1AC"
                  name="Tasks in Progress"
                />
                
                <Scatter
                  yAxisId="left"
                  dataKey="predictedCompletions"
                  fill="#10B981"
                  name="Predicted Completions"
                />
                
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="productivity"
                  stroke="#FF6B6B"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Productivity Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-body">
                {userTasks.length === 0 && !loading && !isPredicting
                  ? selectedUser 
                    ? `No tasks assigned to ${selectedUser.fullName || 'this user'}. Assign tasks to see productivity data.`
                    : "Please select a user to view their productivity data."
                  : "No task data available for the selected date range."}
              </p>
            </div>
          )}
        </div>
        
        {/* Legend Explanation */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-gray-1 dark:bg-meta-4 rounded-sm border-l-4 border-blue-500">
            <h6 className="font-semibold mb-2 text-black dark:text-white flex items-center">
              <div className="w-3 h-3 bg-blue-500 mr-2 rounded-sm"></div>
              Past Performance
            </h6>
            <p className="text-body">
              Shows completed tasks over time and historical productivity trends based on actual task completion.
            </p>
          </div>
          <div className="p-4 bg-gray-1 dark:bg-meta-4 rounded-sm border-l-4 border-red-500">
            <h6 className="font-semibold mb-2 text-black dark:text-white flex items-center">
              <div className="w-3 h-3 bg-red-500 mr-2 rounded-sm"></div>
              Current Status
            </h6>
            <p className="text-body">
              Displays tasks currently in progress and the user's productivity score based on their work patterns.
            </p>
          </div>
          <div className="p-4 bg-gray-1 dark:bg-meta-4 rounded-sm border-l-4 border-green-500">
            <h6 className="font-semibold mb-2 text-black dark:text-white flex items-center">
              <div className="w-3 h-3 bg-green-500 mr-2 rounded-sm"></div>
              Future Predictions
            </h6>
            <p className="text-body">
              {predictionSource === 'huggingface' 
                ? "AI-powered predictions for task completion and productivity trends using Hugging Face machine learning."
                : "Projects task completion timeline and predicts future productivity based on current patterns and task complexity."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTaskProductivityGraph;