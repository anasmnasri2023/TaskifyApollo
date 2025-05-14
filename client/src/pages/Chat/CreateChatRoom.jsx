import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
import { GetAllUsers, CreateNewChatRoom } from '../../redux/actions/chatActions';
import chatSocketService from '../../services/chatSocketService';

const CreateChatRoom = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [chatType, setChatType] = useState('individual'); // 'individual' or 'group'
  const [formData, setFormData] = useState({
    name: '',
    participants: [],
    isPrivate: true, // Always private
    isDirectMessage: true
  });
  const [errors, setErrors] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  
  const { allUsers, createChatLoading, chatRooms } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  
  // Fetch all users for participant selection
  useEffect(() => {
    dispatch(GetAllUsers());
  }, [dispatch]);
  
  // Check if there's an existing direct message chat with selected user
  useEffect(() => {
    if (chatType === 'individual' && selectedUser) {
      const existingDirectChat = chatRooms.find(room => {
        if (!room.isDirectMessage) return false;
        if (room.participants?.length !== 2) return false;
        return room.participants.some(p => p._id === selectedUser) &&
               room.participants.some(p => p._id === user?.id);
      });
      
      if (existingDirectChat) {
        navigate(`/chat/room/${existingDirectChat._id}`);
      }
    }
  }, [selectedUser, chatType, chatRooms, user, navigate]);
  
  // Format users for react-select
  const userOptions = allUsers
    .filter(u => u._id !== user?.id) // Remove current user
    .map(u => ({
      value: u._id,
      label: u.fullName || u.email
    }));
  
  // Handle chat type change
  const handleChatTypeChange = (type) => {
    setChatType(type);
    
    if (type === 'individual') {
      setFormData({
        name: '',
        participants: [],
        isPrivate: true,
        isDirectMessage: true
      });
    } else {
      setFormData({
        name: '',
        participants: [],
        isPrivate: true, // Always private for group chats
        isDirectMessage: false
      });
    }
    
    setErrors({});
    setSelectedUser(null);
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle participant selection for individual chat
  const handleIndividualParticipantChange = (selected) => {
    if (selected) {
      setSelectedUser(selected.value);
      setFormData(prev => ({
        ...prev,
        participants: [selected.value],
        name: selected.label // Use participant name as chat name for individual chats
      }));
    } else {
      setSelectedUser(null);
      setFormData(prev => ({
        ...prev,
        participants: [],
        name: ''
      }));
    }
    
    if (errors.participants) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };
  
  // Handle participant selection for group chat
  const handleGroupParticipantChange = (selectedOptions) => {
    const participants = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData(prev => ({ ...prev, participants }));
    
    if (errors.participants) {
      setErrors(prev => ({ ...prev, participants: '' }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (chatType === 'group' && !formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }
    
    if (formData.participants.length === 0) {
      newErrors.participants = 'At least one participant is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const createdRoom = await dispatch(CreateNewChatRoom(formData));
      chatSocketService.notifyNewChatRoom(createdRoom);
      navigate(`/chat/room/${createdRoom._id}`);
    } catch (error) {
      console.error('Error creating chat room:', error);
    }
  };
  
  return (
    <div className="p-4 h-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-white">Create New Chat</h2>
        <button
          onClick={() => navigate('/chat')}
          className="p-2 rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
          title="Back to chats"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
        </button>
      </div>
      
      {/* Chat Type Selection */}
      <div className="mb-6">
        <div className="flex space-x-4 bg-gray-2 dark:bg-meta-4 p-1 rounded-lg w-fit">
          <button
            className={`py-2 px-4 rounded-md ${chatType === 'individual' 
              ? 'bg-white dark:bg-boxdark text-primary' 
              : 'text-black dark:text-white'}`}
            onClick={() => handleChatTypeChange('individual')}
          >
            Individual Chat
          </button>
          <button
            className={`py-2 px-4 rounded-md ${chatType === 'group' 
              ? 'bg-white dark:bg-boxdark text-primary' 
              : 'text-black dark:text-white'}`}
            onClick={() => handleChatTypeChange('group')}
          >
            Group Chat
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-boxdark p-6 rounded-lg shadow-sm">
        {/* Individual Chat UI */}
        {chatType === 'individual' && (
          <div className="mb-4">
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Select User <span className="text-danger">*</span>
            </label>
            <Select
              name="participants"
              options={userOptions}
              className={`react-select ${errors.participants ? 'border-danger' : ''}`}
              classNamePrefix="select"
              placeholder="Select a user to chat with"
              onChange={handleIndividualParticipantChange}
              value={selectedUser ? userOptions.find(option => option.value === selectedUser) : null}
              styles={{
                control: (base) => ({
                  ...base,
                  background: 'white',
                  borderColor: errors.participants ? '#F87171' : '#E2E8F0',
                  '&:hover': {
                    borderColor: '#3B82F6'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  background: 'white',
                  zIndex: 10
                }),
                option: (base, { isSelected }) => ({
                  ...base,
                  backgroundColor: isSelected ? '#3B82F6' : 'white',
                  '&:hover': {
                    backgroundColor: isSelected ? '#3B82F6' : '#E2E8F0'
                  }
                })
              }}
            />
            {errors.participants && (
              <p className="text-danger text-xs mt-1">{errors.participants}</p>
            )}
          </div>
        )}
        
        {/* Group Chat UI */}
        {chatType === 'group' && (
          <>
            {/* Group Name */}
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Group Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter group name"
                className={`w-full rounded-lg border border-stroke bg-white py-3 px-4 
                  text-black focus:border-primary focus-visible:outline-none dark:border-strokedark 
                  dark:bg-meta-4 dark:text-white dark:focus:border-primary
                  ${errors.name ? 'border-danger' : ''}`}
              />
              {errors.name && (
                <p className="text-danger text-xs mt-1">{errors.name}</p>
              )}
            </div>
            
            {/* Group Participants */}
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Add Participants <span className="text-danger">*</span>
              </label>
              <Select
                isMulti
                name="participants"
                options={userOptions}
                className={`react-select ${errors.participants ? 'border-danger' : ''}`}
                classNamePrefix="select"
                placeholder="Select participants"
                onChange={handleGroupParticipantChange}
                styles={{
                  control: (base) => ({
                    ...base,
                    background: 'white',
                    borderColor: errors.participants ? '#F87171' : '#E2E8F0',
                    '&:hover': {
                      borderColor: '#3B82F6'
                    }
                  }),
                  menu: (base) => ({
                    ...base,
                    background: 'white',
                    zIndex: 10
                  }),
                  option: (base, { isSelected }) => ({
                    ...base,
                    backgroundColor: isSelected ? '#3B82F6' : 'white',
                    '&:hover': {
                      backgroundColor: isSelected ? '#3B82F6' : '#E2E8F0'
                    }
                  })
                }}
              />
              {errors.participants && (
                <p className="text-danger text-xs mt-1">{errors.participants}</p>
              )}
            </div>
            
            {/* Removed Private Group Option since all groups are always private */}
          </>
        )}
        
        {/* Action Buttons - Inside the form box */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="rounded-md border border-stroke py-2.5 px-6 text-black 
              hover:border-primary hover:bg-gray-2 dark:border-strokedark dark:text-white 
              dark:hover:border-primary dark:hover:bg-meta-4"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createChatLoading}
            className="inline-flex items-center justify-center rounded-md bg-primary py-2.5 px-6 
              text-white hover:bg-opacity-90 disabled:bg-opacity-60"
          >
            {createChatLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : 'Create Chat'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateChatRoom;