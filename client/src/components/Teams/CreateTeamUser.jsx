// CreateTeamModal.jsx - Enhanced with better error handling and debugging

// Import necessary dependencies at the top of the file
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FindUsers } from "../../redux/actions/users";
import { CreateTeamAction } from "../../redux/actions/teams";
import moment from "moment";

// Create Team Modal Component
const CreateTeamUser = ({ setShowModal, onSuccess }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useSelector((state) => state.auth || {});
  const { _ALL: allUsers = [] } = useSelector((state) => state.users || {});
  const errors = useSelector((state) => state.errors?.content);
  
  const [form, setForm] = useState({
    Name: "",
    description: "",
    members: [], // Will be populated with member IDs
    pictureprofile: null
  });
  
  const [previewImage, setPreviewImage] = useState(null);
  const [teamIcon, setTeamIcon] = useState("default"); // default, custom, random
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  const TEAM_ICONS = [
    "🚀", "🌟", "🔥", "🌈", "🌊", "⚡", "🌿", "🏆", "🎯", "💡", 
    "🛠️", "🧩", "🌐", "🔍", "🧪", "📊", "📝", "💻", "📱", "🎨"
  ];
  
  const [selectedIcon, setSelectedIcon] = useState(TEAM_ICONS[0]);

  // Fetch users when modal opens
  useEffect(() => {
    const loadUsers = async () => {
      try {
        await dispatch(FindUsers());
      } catch (err) {
        console.error("Error loading users:", err);
        setError("Failed to load users. Please try again.");
      }
    };
    
    loadUsers();
  }, [dispatch]);
  
  // Update error state when Redux errors change
  useEffect(() => {
    if (errors && typeof errors === 'object') {
      if (errors.message) {
        setError(errors.message);
      } else if (Object.keys(errors).length > 0) {
        // Convert validation errors object to string
        const errorMessages = Object.values(errors).join(', ');
        setError(errorMessages);
      }
    }
  }, [errors]);
  
  const handleNextStep = () => {
    // Validate first step
    if (step === 1) {
      if (!form.Name.trim()) {
        setError("Team name is required");
        return;
      }
      if (!form.description.trim()) {
        setError("Team description is required");
        return;
      }
    }
    
    // Clear any previous errors
    setError(null);
    setStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    setError(null); // Clear errors when navigating back
    setStep(prev => prev - 1);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleIconSelect = (icon) => {
    setSelectedIcon(icon);
    setTeamIcon("default");
  };
  
  const handleRandomIcon = () => {
    const randomIndex = Math.floor(Math.random() * TEAM_ICONS.length);
    setSelectedIcon(TEAM_ICONS[randomIndex]);
    setTeamIcon("default");
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("Image file is too large. Maximum size is 2MB.");
        return;
      }
      
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setError("Please select a valid image file (JPEG, PNG, or GIF).");
        return;
      }
      
      setForm(prev => ({
        ...prev,
        pictureprofile: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      
      setTeamIcon("custom");
      setError(null); // Clear any previous errors
    }
  };
  
  const handleAddMember = (user) => {
    if (!selectedMembers.some(m => m._id === user._id)) {
      setSelectedMembers(prev => [...prev, user]);
    }
    setSearchTerm("");
  };
  
  const handleRemoveMember = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m._id !== userId));
  };
  
  const getFilteredUsers = () => {
    return allUsers.filter(u => 
      u._id !== user?._id && // Exclude current user
      (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !selectedMembers.some(m => m._id === u._id) // Exclude already selected members
    );
  };
  
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare form data with selected members
      const formData = {
        Name: form.Name.trim(),
        description: form.description.trim(),
        // Add selected members as ENGINEER role
        members: selectedMembers.map(member => member._id),
        pictureprofile: form.pictureprofile
      };
      
      // Handle emoji icon if custom image not selected
      if ((teamIcon === "default" || teamIcon === "random") && !form.pictureprofile) {
        // You could convert emoji to image here if your backend supports it
        // For now, just log that we're using an emoji
        console.log('Using emoji as team icon:', selectedIcon);
      }
      
      console.log('Submitting team data:', formData);
      
      // Dispatch the action to create the team
      const success = await dispatch(CreateTeamAction(formData));
      
      if (success) {
        console.log('Team created successfully');
        if (onSuccess) {
          onSuccess();
        }
        setShowModal(false);
      } else {
        console.log('Team creation failed');
        setError("Failed to create team. Please try again.");
      }
    } catch (err) {
      console.error("Error creating team:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Error alert component
  const ErrorAlert = ({ message }) => (
    <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
      <div className="flex">
        <svg className="mr-2 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
  
  // Render modal content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1: // Team basic info
        return (
          <>
            <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
              Create a new team
            </h3>
            
            {error && <ErrorAlert message={error} />}
            
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Team Name <span className="text-meta-1">*</span>
              </label>
              <input
                type="text"
                name="Name"
                placeholder="Enter team name"
                value={form.Name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-stroke bg-white px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
              />
            </div>
            
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Description <span className="text-meta-1">*</span>
              </label>
              <textarea
                name="description"
                placeholder="What's this team about?"
                value={form.description}
                onChange={handleChange}
                rows="4"
                className="w-full rounded-lg border border-stroke bg-white px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mr-2 rounded-lg border border-stroke px-6 py-2.5 text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!form.Name.trim() || !form.description.trim()}
                className={`rounded-lg bg-primary px-6 py-2.5 text-white transition hover:bg-opacity-90 ${
                  (!form.Name.trim() || !form.description.trim()) ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                Next
                <svg
                  className="ml-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </>
        );
        
      case 2: // Team icon or image
        return (
          <>
            <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
              Choose a team icon
            </h3>
            
            {error && <ErrorAlert message={error} />}
            
            <div className="mb-6 flex justify-center">
              <div className="relative h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary">
                {teamIcon === "custom" && previewImage ? (
                  <img src={previewImage} alt="Team" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl">{selectedIcon}</span>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {TEAM_ICONS.map((icon, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleIconSelect(icon)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-boxdark-2 ${
                      teamIcon === "default" && selectedIcon === icon
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-white dark:bg-boxdark"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleRandomIcon}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
                >
                  Random Icon
                </button>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">- OR -</p>
                
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                    id="team-picture"
                  />
                  <label
                    htmlFor="team-picture"
                    className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:bg-opacity-90"
                  >
                    Upload Custom Image
                  </label>
                </div>
                
                {teamIcon === "custom" && previewImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setForm(prev => ({ ...prev, pictureprofile: null }));
                      setTeamIcon("default");
                    }}
                    className="mt-2 text-sm text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-lg border border-stroke px-6 py-2.5 text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
              >
                <svg
                  className="mr-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="rounded-lg bg-primary px-6 py-2.5 text-white transition hover:bg-opacity-90"
              >
                Next
                <svg
                  className="ml-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </>
        );
        
      case 3: // Add team members
        return (
          <>
            <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
              Invite team members
            </h3>
            
            {error && <ErrorAlert message={error} />}
            
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-4.5 py-3 pl-10 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="fill-current"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.3214 13.6583L11.3214 10.6583C12.1429 9.58333 12.5714 8.16667 12.4286 6.66667C12.2143 4.08333 10.1429 2.08333 7.57143 2C4.71429 1.91667 2.28571 4.33333 2.28571 7.16667C2.28571 9.75 4.28571 11.8333 6.85714 12.0833C8.35714 12.225 9.77143 11.7917 10.8429 10.9167L13.8429 13.9167C13.9286 14 14.0714 14 14.1571 13.9167L14.3214 13.75C14.4071 13.6667 14.4071 13.5417 14.3214 13.6583ZM3.71429 7.08333C3.71429 5.16667 5.28571 3.58333 7.21429 3.58333C9.14286 3.58333 10.7143 5.16667 10.7143 7.08333C10.7143 9 9.14286 10.5833 7.21429 10.5833C5.28571 10.5833 3.71429 9 3.71429 7.08333Z"
                      fill="#9CA3AF"
                    />
                  </svg>
                </span>
              </div>
              
              {searchTerm && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
                  {getFilteredUsers().length > 0 ? (
                    getFilteredUsers().map(user => (
                      <div
                        key={user._id}
                        className="flex cursor-pointer items-center gap-3 border-b border-stroke px-4 py-3 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
                        onClick={() => handleAddMember(user)}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary overflow-hidden">
                          {user.picture ? (
                            <img
                              src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
                              alt={user.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user.fullName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-black dark:text-white">
                            {user.fullName}
                          </h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <svg
                            className="h-5 w-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? "No users found matching your search" : "No more users available"}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Selected Members ({selectedMembers.length + 1})
              </label>
              
              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
                {/* Current user (creator) */}
                <div className="mb-2 flex items-center justify-between rounded-lg bg-white p-2.5 dark:bg-boxdark">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary overflow-hidden">
                      {user?.picture ? (
                        <img
                          src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
                          alt={user.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.fullName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-black dark:text-white">
                        {user?.fullName} <span className="text-xs text-primary">(You)</span>
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Admin
                  </div>
                </div>
                
                {/* Selected members */}
                {selectedMembers.map(member => (
                  <div key={member._id} className="mb-2 flex items-center justify-between rounded-lg bg-white p-2.5 dark:bg-boxdark">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary overflow-hidden">
                        {member.picture ? (
                          <img
                            src={member.picture.includes('https') ? member.picture : `http://localhost:5500/${member.picture}`}
                            alt={member.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.fullName?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <h5 className="font-medium text-black dark:text-white">
                          {member.fullName}
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Member
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-danger hover:text-opacity-80"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {selectedMembers.length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Use the search box above to add team members
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-lg border border-stroke px-6 py-2.5 text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
              >
                <svg
                  className="mr-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="rounded-lg bg-primary px-6 py-2.5 text-white transition hover:bg-opacity-90"
              >
                Next
                <svg
                  className="ml-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </>
        );
        
      case 4: // Final confirmation
        return (
          <>
            <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
              Ready to create your team
            </h3>
            
            {error && <ErrorAlert message={error} />}
            
            <div className="mb-6 rounded-lg border border-stroke dark:border-strokedark">
              <div className="border-b border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {teamIcon === "custom" && previewImage ? (
                      <img src={previewImage} alt="Team" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl">{selectedIcon}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-black dark:text-white">
                      {form.Name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {form.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <h5 className="mb-2 font-medium text-black dark:text-white">
                  Team Members ({selectedMembers.length + 1})
                </h5>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
                    <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                      {user?.picture ? (
                        <img
                          src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
                          alt={user.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.fullName?.charAt(0) || 'U'
                      )}
                    </span>
                    <span className="font-medium text-primary">You (Admin)</span>
                  </div>
                  
                  {selectedMembers.map(member => (
                    <div key={member._id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700">
                      <span className="h-6 w-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                        {member.picture ? (
                          <img
                            src={member.picture.includes('https') ? member.picture : `http://localhost:5500/${member.picture}`}
                            alt={member.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          member.fullName?.charAt(0) || 'U'
                        )}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{member.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-4 rounded-lg border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h5 className="font-medium text-black dark:text-white">
                    What happens next?
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    After creating your team, you'll be able to add projects, create posts,
                    and collaborate with your team members in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-lg border border-stroke px-6 py-2.5 text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
              >
                <svg
                  className="mr-2 inline-block h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={`rounded-lg bg-primary px-6 py-2.5 text-white transition hover:bg-opacity-90 ${
                  isLoading ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="mr-2 inline-block h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Team
                    <svg
                      className="ml-2 inline-block h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center overflow-y-auto bg-black bg-opacity-80 px-4 py-5">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-lg dark:bg-boxdark">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="relative mx-auto flex max-w-3xl justify-between">
            {/* Progress bar */}
            <div className="absolute top-1/2 left-0 -mt-px h-0.5 w-full -translate-y-1/2 bg-gray-200 dark:bg-gray-700"></div>
            
            {/* Step 1 */}
            <div className="relative flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {step > 1 ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>1</span>
                )}
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Details</span>
            </div>
            
            {/* Step 2 */}
            <div className="relative flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {step > 2 ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>2</span>
                )}
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Icon</span>
            </div>
            
            {/* Step 3 */}
            <div className="relative flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {step > 3 ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>3</span>
                )}
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Members</span>
            </div>
            
            {/* Step 4 */}
            <div className="relative flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                step >= 4 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                <span>4</span>
              </div>
              <span className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Finish</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div>
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default CreateTeamUser;