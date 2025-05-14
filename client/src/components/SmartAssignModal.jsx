import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { DetectSkillsAction, FindMatchingUsersAction } from "../redux/actions/smartAssign";

const SmartAssignModal = ({ isOpen, onClose, onSelect, taskDescription, currentAssignees }) => {
  const dispatch = useDispatch();
  const { loading, detectedSkills, recommendedUsers, error } = useSelector(state => state.smartAssign);
  
  const [description, setDescription] = useState(taskDescription || "");
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSkill, setNewSkill] = useState(""); // New state for skill input

  // Update state when props change
  useEffect(() => {
    if (isOpen) {
      setDescription(taskDescription || "");
      
      // Format currentAssignees properly for the component
      const formattedAssignees = [];
      
      if (currentAssignees && currentAssignees.length > 0) {
        // Handle different formats of assignees
        currentAssignees.forEach(assignee => {
          if (typeof assignee === 'string') {
            formattedAssignees.push({ _id: assignee, fullName: `User ${assignee.substring(0, 8)}` });
          } else if (typeof assignee === 'object') {
            if (assignee._id) {
              formattedAssignees.push(assignee);
            } else if (assignee.value) {
              formattedAssignees.push({ _id: assignee.value, fullName: assignee.label });
            }
          }
        });
      }
      
      setAssignees(formattedAssignees);
      
      if (taskDescription) {
        handleAnalyzeDescription(taskDescription);
      }
    }
  }, [isOpen, taskDescription, currentAssignees]);

  // Update local state when Redux state changes
  useEffect(() => {
    if (detectedSkills && detectedSkills.length > 0) {
      setExtractedSkills(detectedSkills.map(skill => skill.value || skill));
      setIsLoading(false);
    }
  }, [detectedSkills]);
  
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  // Extract skills from description using AI
  const handleAnalyzeDescription = async (text) => {
    setIsLoading(true);
    try {
      await dispatch(DetectSkillsAction(text));
    } catch (error) {
      console.error("Error analyzing description:", error);
      setIsLoading(false);
    }
  };

  // Handle description change with debounce
  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    
    // Debounce skill extraction
    const timer = setTimeout(() => {
      if (newDescription.trim()) {
        handleAnalyzeDescription(newDescription);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  };

  // Add skill to the extracted skills list
  const addSkill = (skill) => {
    if (!extractedSkills.includes(skill) && skill.trim() !== "") {
      const updatedSkills = [...extractedSkills, skill.trim()];
      setExtractedSkills(updatedSkills);
      
      // Format skills for API
      const formattedSkills = updatedSkills.map(s => ({ value: s, label: s }));
      dispatch(FindMatchingUsersAction(formattedSkills));
    }
  };

  // Handler for adding new skill from input
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim()) {
      addSkill(newSkill);
      setNewSkill("");
    }
  };

  // Remove skill from the extracted skills list
  const removeSkill = (skill) => {
    const updatedSkills = extractedSkills.filter(s => s !== skill);
    setExtractedSkills(updatedSkills);
    
    // Format skills for API
    const formattedSkills = updatedSkills.map(s => ({ value: s, label: s }));
    dispatch(FindMatchingUsersAction(formattedSkills));
  };

  // Add user to assignees
  const handleAddAssignee = (user) => {
    if (!assignees.some(assignee => assignee._id === user._id)) {
      setAssignees([...assignees, user]);
    }
  };

  // Remove user from assignees
  const handleRemoveAssignee = (userId) => {
    setAssignees(assignees.filter(assignee => assignee._id !== userId));
  };

  // Submit the selected assignees
  const handleSubmit = () => {
    // Format assignees for the parent component
    const formattedAssignees = assignees.map(user => ({
      value: user._id,
      label: user.fullName
    }));
    
    console.log("Submitting assignees to parent:", formattedAssignees);
    
    // Pass the formatted assignees back to the parent
    onSelect(formattedAssignees);
    onClose();
  };

  // Suggested skills to show
  const suggestedSkills = [];

  // Colorful sparkle icon for the modal
  const ModalSparkleIcon = () => (
    <svg 
      className="w-6 h-6 text-yellow-500" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M12 3L14.5 8.5L20 9.5L16 14L17 20L12 17L7 20L8 14L4 9.5L9.5 8.5L12 3Z" 
        strokeWidth="0" 
        fill="#FFD700"
      />
      <circle cx="12" cy="1" r="1" fill="#00B4FF" />
      <circle cx="3" cy="12" r="1.5" fill="#FF3B7F" />
      <circle cx="21" cy="12" r="1" fill="#00D060" />
      <circle cx="12" cy="23" r="1" fill="#B87FFF" />
    </svg>
  );

  return (
    <div
      className={`fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div 
        className={`w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-boxdark shadow-xl transform transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <ModalSparkleIcon />
            <h2 className="ml-2 text-xl font-semibold text-black dark:text-white">Smart Assign</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Task Description */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-black dark:text-white">
            Task Description
          </label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            className="w-full h-28 p-3 border rounded-lg dark:bg-boxdark dark:border-strokedark dark:text-white"
            placeholder="Describe the task requirements..."
          />
        </div>

        {/* Skills Input Field */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-black dark:text-white">
            AI Detected Skills
          </label>
          
          {/* Skills input form */}
          <form onSubmit={handleAddSkill} className="flex mb-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Type a skill and press Enter or Add"
              className="flex-grow p-2 border rounded-l-lg dark:bg-boxdark dark:border-strokedark dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-r-lg"
            >
              Add
            </button>
          </form>
          
          {/* AI-Detected Skills */}
          <div className="flex flex-wrap gap-2 mb-2">
            {extractedSkills.map(skill => (
              <div 
                key={skill} 
                className="inline-flex items-center bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-sm dark:bg-blue-900 dark:text-blue-200"
              >
                {skill}
                <button 
                  onClick={() => removeSkill(skill)}
                  className="ml-1.5 text-blue-800 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {extractedSkills.length === 0 && !isLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No skills detected. Add skills above or elaborate your description.</p>
            )}
          </div>

          {/* Skill Suggestions */}
          {suggestedSkills.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                Suggested skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedSkills
                  .filter(skill => !extractedSkills.includes(skill))
                  .map(skill => (
                    <button
                      key={skill}
                      onClick={() => addSkill(skill)}
                      className="px-2.5 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-full text-sm"
                    >
                      + {skill}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Finding best matches...
            </span>
          </div>
        )}

        {/* Recommended Users */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-black dark:text-white">
            Recommended Personnel
          </label>
          
          {error ? (
            <div className="p-3 text-center text-red-600 bg-red-100 dark:bg-red-900/20 rounded-lg">
              {error}
            </div>
          ) : recommendedUsers && recommendedUsers.length === 0 ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {isLoading ? "Finding best matches..." : "No recommended users found. Add more skills or details."}
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {recommendedUsers && recommendedUsers.map(user => (
                <div
                  key={user._id}
                  className="flex justify-between items-center p-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full overflow-hidden mr-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {user.picture ? (
                        <img 
                          src={user.picture} 
                          alt={user.fullName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/user/user-default.png';
                          }}
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-300 text-sm font-semibold">
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-black dark:text-white">
                        {user.fullName} 
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200">
                          {user.matchScore}% match
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Skills: {user.matchedSkills.join(", ")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddAssignee(user)}
                    disabled={assignees.some(a => a._id === user._id)}
                    className={`px-2 py-1 text-xs rounded-md ${
                      assignees.some(a => a._id === user._id)
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                        : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {assignees.some(a => a._id === user._id) ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Assignees */}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-black dark:text-white">
            Current Assignees ({assignees.length})
          </label>
          {assignees.length === 0 ? (
            <div className="p-3 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
              No assignees selected.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              {assignees.map(user => (
                <div
                  key={user._id}
                  className="flex items-center bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1.5 rounded-lg"
                >
                  <span className="text-sm font-medium">
                    {user.fullName}
                  </span>
                  <button
                    onClick={() => handleRemoveAssignee(user._id)}
                    className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
            disabled={assignees.length === 0}
          >
            {assignees.length > 0 ? "Confirm Assignees" : "No Assignees Selected"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartAssignModal;