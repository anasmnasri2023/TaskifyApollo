const express = require("express");
const Router = express.Router();
const https = require('https');
const url = require('url');
const { lookup } = require('dns');
const ProjectModel = require("../models/projet");
const TaskModel = require("../models/tasks");

// In-memory context store
const userContexts = {};

// Configure DNS lookups to prefer IPv4
const dnsOptions = {
  family: 4,  // Force IPv4
  hints: 0    // No special hints
};

// Native HTTPS request function with IPv4 enforcement
function makeGeminiRequest(apiKey, message) {
  return new Promise((resolve, reject) => {
    console.log('[GEMINI] Starting API request with IPv4 enforcement');
    
    // Parse the API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const parsedUrl = url.parse(apiUrl);
    
    // Manually resolve hostname to IPv4 first
    lookup(parsedUrl.hostname, dnsOptions, (err, address, family) => {
      if (err) {
        console.error('[GEMINI] DNS lookup error:', err.message);
        return reject(err);
      }
      
      console.log(`[GEMINI] Resolved ${parsedUrl.hostname} to IPv4 address: ${address}`);
      
      // Prepare the request body
      const requestData = JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: message
          }] 
        }]
      });
      
      // Set up the request options with the resolved IPv4 address
      const options = {
        hostname: address,  // Use the resolved IPv4 address
        port: 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Host': parsedUrl.hostname,  // Original hostname for TLS
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        },
        // Force IPv4
        family: 4,
        // Add a 15-second socket timeout
        timeout: 15000
      };
      
      console.log('[GEMINI] Making IPv4 HTTPS request to:', address);
      
      // Create the request
      const req = https.request(options, (res) => {
        console.log('[GEMINI] Response status code:', res.statusCode);
        
        let responseData = '';
        
        // Collect the response data
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        // Process the complete response
        res.on('end', () => {
          console.log('[GEMINI] Response completed successfully');
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedResponse = JSON.parse(responseData);
              resolve(parsedResponse);
            } catch (e) {
              console.error('[GEMINI] Error parsing response:', e.message);
              reject(new Error('Invalid JSON response from Gemini API'));
            }
          } else {
            console.error('[GEMINI] API error:', res.statusCode, responseData);
            reject(new Error(`API returned status code ${res.statusCode}`));
          }
        });
      });
      
      // Handle request timeouts
      req.on('timeout', () => {
        console.error('[GEMINI] Request timed out');
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      // Handle request errors
      req.on('error', (error) => {
        console.error('[GEMINI] Request error:', error.message);
        reject(error);
      });
      
      // Send the request data
      req.write(requestData);
      req.end();
    });
  });
}

// Keep route as "/message" 
Router.post("/message", async (req, res) => {
  try {
    console.log("[CHATBOT DEBUG] Received request at /message");
    
    // Check if message exists
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ 
        response: "Please provide a message",
        suggestions: ["Hello", "Help"]
      });
    }

    // Validate user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        response: "User authentication error",
        suggestions: ["Help"]
      });
    }

    const userId = req.user._id;

    // Initialize context
    if (!userContexts[userId]) userContexts[userId] = {};

    console.log(`[CHATBOT] Received message: "${message}"`);

    // STEP 1: Handle greetings - these show the menu
    const greetings = ['hello', 'hi', 'hey', 'hii', 'helo', 'start', 'help'];
    if (greetings.includes(message.toLowerCase().trim())) {
      console.log("[CHATBOT] Detected greeting, showing menu");
      userContexts[userId].lastQuery = null;
      
      let userName = "there";
      try {
        userName = req.user.fullName || "there";
      } catch (e) {
        console.log("[CHATBOT DEBUG] Couldn't get user name:", e.message);
      }
      
      const messages = [
        `👋 Hello ${userName}! I'm your Taskify Assistant.`,
        "I can help you with project management or answer any questions!",
        "Use the buttons below for quick actions:"
      ];
      
      const suggestions = [
        "Show my projects",
        "Show my tasks",
        "Create new project",
        "Create new task"
      ];
      
      return res.json({ messages, suggestions });
    }

    // STEP 2: Handle EXACT button text only
    const buttonHandlers = {
      "Show my projects": async () => {
        console.log("[CHATBOT] Handling 'Show my projects'");
        try {
          const projects = await ProjectModel.find({});
          userContexts[userId].lastQuery = 'projects';
          
          return {
            response: projects.length > 0 
              ? `📊 You have ${projects.length} project${projects.length !== 1 ? 's' : ''}. Would you like to see details?`
              : "📂 No projects yet. Would you like to create one?",
            suggestions: projects.length > 0 
              ? ["Yes", "No", "Create new project"]
              : ["Create new project", "Help"]
          };
        } catch (error) {
          console.error("[CHATBOT DEBUG] Database error:", error.message);
          return {
            response: "I encountered an error accessing your projects. Let me help with something else.",
            suggestions: ["Show my tasks", "Help"]
          };
        }
      },
      
      // Other button handlers remain the same
      "Show my tasks": async () => {
        console.log("[CHATBOT] Handling 'Show my tasks'");
        try {
          const tasks = await TaskModel.find({});
          userContexts[userId].lastQuery = 'tasks';
          
          return {
            response: tasks.length > 0
              ? `📋 You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''}. Would you like to see details?`
              : "📋 No tasks yet. Would you like to create one?",
            suggestions: tasks.length > 0
              ? ["Yes", "No", "Create new task"]
              : ["Create new task", "Help"]
          };
        } catch (error) {
          console.error("[CHATBOT DEBUG] Database error:", error.message);
          return {
            response: "I encountered an error accessing your tasks. Let me help with something else.",
            suggestions: ["Show my projects", "Help"]
          };
        }
      },
      
      "Help": async () => {
        return {
          response: "I can help you with the following tasks:",
          messages: [
            "I can help you with the following tasks:",
            "• Show your projects and tasks",
            "• Create new projects and tasks",
            "• Answer questions about the application",
            "• Provide assistance with project management"
          ],
          suggestions: ["Show my projects", "Show my tasks"]
        };
      },
      
      "Yes": async () => {
        if (!userContexts[userId].lastQuery) {
          return {
            response: "Yes to what? Try asking me a specific question!",
            suggestions: ["Show my projects", "Show my tasks", "Help"]
          };
        }
        
        // Handle showing details based on last query
        if (userContexts[userId].lastQuery === 'projects') {
          try {
            const projects = await ProjectModel.find({});
            const messages = ["Here are your projects:"];
            
            projects.forEach((project, index) => {
              messages.push(`${index + 1}. ${project.project_name} - ${project.status}`);
            });
            
            return { messages, suggestions: ["Show my tasks", "Help"] };
          } catch (error) {
            console.error("[CHATBOT DEBUG] Database error:", error.message);
            return {
              response: "I encountered an error getting your project details. Let me help with something else.",
              suggestions: ["Show my tasks", "Help"]
            };
          }
        }
        
        if (userContexts[userId].lastQuery === 'tasks') {
          try {
            const tasks = await TaskModel.find({});
            const messages = ["Here are your tasks:"];
            
            tasks.forEach((task, index) => {
              messages.push(`${index + 1}. ${task.title} - ${task.status}`);
            });
            
            return { messages, suggestions: ["Show my projects", "Help"] };
          } catch (error) {
            console.error("[CHATBOT DEBUG] Database error:", error.message);
            return {
              response: "I encountered an error getting your task details. Let me help with something else.",
              suggestions: ["Show my projects", "Help"]
            };
          }
        }
      },
      
      "No": async () => {
        userContexts[userId].lastQuery = null;
        return {
          response: "No problem! What else can I help you with?",
          suggestions: ["Show my projects", "Show my tasks", "Help"]
        };
      }
    };

    // Check if message matches any button exactly
    if (buttonHandlers[message]) {
      console.log(`[CHATBOT] Found exact button match for: "${message}"`);
      try {
        const result = await buttonHandlers[message]();
        return res.json(result);
      } catch (buttonError) {
        console.error("[CHATBOT DEBUG] Button handler error:", buttonError);
        return res.json({
          response: "I encountered an error processing that request. Let's try something else.",
          suggestions: ["Show my projects", "Show my tasks", "Help"]
        });
      }
    }

    // STEP 3: Everything else goes to Gemini
    console.log(`[CHATBOT] No button match, sending to Gemini: "${message}"`);
    
    // Check if API key exists first
    const GEMINI_API_KEY = process.env.TASKIFY_GEMINI_API_KEY;
    console.log("[GEMINI] API Key exists:", !!GEMINI_API_KEY);
    
    if (!GEMINI_API_KEY) {
      console.error("[GEMINI] API key not found in environment variables");
      return res.json({
        response: "I'm currently unable to answer general questions. Please try using the buttons below.",
        suggestions: ["Show my projects", "Show my tasks", "Help"]
      });
    }
    
    // CRITICAL FIX: Use IPv4-enforced HTTPS request
    try {
      // Make the request using our custom function that enforces IPv4
      const geminiResponse = await makeGeminiRequest(GEMINI_API_KEY, message);
      
      console.log("[GEMINI] Response structure:", Object.keys(geminiResponse));
      
      // Process the response
      if (geminiResponse.candidates && 
          geminiResponse.candidates[0] &&
          geminiResponse.candidates[0].content &&
          geminiResponse.candidates[0].content.parts &&
          geminiResponse.candidates[0].content.parts[0]) {
        
        const aiResponse = geminiResponse.candidates[0].content.parts[0].text;
        return res.json({ 
          response: aiResponse,
          suggestions: ["Show my projects", "Show my tasks", "Help"]
        });
      } else {
        throw new Error("Invalid response structure from Gemini API");
      }
      
    } catch (geminiError) {
      console.error("[GEMINI] Error occurred:", geminiError.message);
      
      // If it's a timeout error, give a specific message
      if (geminiError.message.includes('timeout') || geminiError.message.includes('ETIMEDOUT')) {
        console.log("[GEMINI] Timeout error detected, sending fallback response");
        return res.json({ 
          response: "I'm experiencing network issues while trying to access my AI capabilities. Let me help you with your tasks and projects instead!",
          suggestions: ["Show my projects", "Show my tasks", "Help"]
        });
      }
      
      // For other errors, give a generic message
      return res.json({ 
        response: "I'm having trouble accessing my AI capabilities right now. Let me help you with something else instead!",
        suggestions: ["Show my projects", "Show my tasks", "Help"]
      });
    }
    
  } catch (error) {
    console.error("[CHATBOT] General error:", error);
    
    return res.status(500).json({ 
      response: "I encountered an error processing your request. Please try again.",
      suggestions: ["Show my projects", "Show my tasks", "Help"]
    });
  }
});

module.exports = Router;