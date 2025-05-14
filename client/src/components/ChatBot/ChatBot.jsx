import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hello! How can I help you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add debug logging for axios configuration
  useEffect(() => {
    console.log('[ChatBot] Current axios baseURL:', axios.defaults.baseURL || 'Not set');
    console.log('[ChatBot] Current authorization header:', 
      axios.defaults.headers.common['Authorization'] ? 'Present' : 'Not set');
  }, []);

  // Handle message submission
  const handleSendMessage = async (e, suggestionText) => {
    if (e) e.preventDefault();
    const userMessage = suggestionText || inputMessage.trim();
    if (!userMessage) return;

    // Navigation logic for suggestions
    if (userMessage.toLowerCase().includes("create new project")) {
      navigate("/projects/project-list");
      setIsOpen(false);
      return;
    }
    if (userMessage.toLowerCase().includes("create new task")) {
      navigate("/projects/task-list");
      setIsOpen(false);
      return;
    }

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Log request details for debugging
      console.log('[ChatBot] Sending message to API:', userMessage);
      
      // Use a direct approach to ensure the request works
      const response = await axios({
        method: 'post',
        url: '/api/chatbot/message',
        data: { message: userMessage },
        timeout: 30000 // Increase timeout to 30 seconds
      });

      console.log('[ChatBot] Received response:', response.data);

      // Handle different response formats
      if (response.data) {
        // Set suggestions if available
        setSuggestions(response.data.suggestions || []);

        // Handle response messages
        if (response.data.messages && Array.isArray(response.data.messages)) {
          // Multiple messages with delay effect
          response.data.messages.forEach((msg, index) => {
            setTimeout(() => {
              setMessages(prev => [...prev, { type: 'bot', text: msg }]);
            }, index * 500);
          });
        } else if (response.data.response) {
          // Single response message
          setMessages(prev => [...prev, { type: 'bot', text: response.data.response }]);
        } else {
          // Fallback if response structure is unexpected
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'I received your message but couldn\'t process the response properly.' 
          }]);
        }
      }
    } catch (error) {
      // Enhanced error logging
      console.error('[ChatBot] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Check if it's a timeout error
      const isTimeout = error.code === 'ECONNABORTED' || 
                         error.message.includes('timeout');
      
      // Provide a more specific error message
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: isTimeout 
          ? 'Sorry, it took me too long to process that. Could you try asking something simpler or using the buttons below?'
          : 'Sorry, I encountered an error. Please try again or use one of the suggested options.' 
      }]);
      
      // Add helpful buttons when an error occurs
      setSuggestions(['Show my projects', 'Show my tasks', 'Help']);
    } finally {
      setIsLoading(false);
    }
  };

  const location = useLocation();
  const hideOnRoutes = ["/auth/SignIn", "/auth/signup"];

  if (hideOnRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col">
          {/* Header */}
          <div className="bg-primary p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center text-white">
              <FaRobot className="mr-2" />
              <h3 className="font-semibold">Taskify Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <FaTimes />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="text-center text-gray-500">
                <div className="animate-pulse">Thinking...</div>
              </div>
            )}
            
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-primary hover:text-white transition"
                    onClick={() => handleSendMessage(null, s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
        >
          <FaRobot size={24} />
        </button>
      )}
    </div>
  );
};

export default ChatBot;