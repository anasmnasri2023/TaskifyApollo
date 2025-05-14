import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  UpdateTeamAction, 
  DeleteTeamAction,
  AddMemberAction,
  RemoveMemberAction,
  UpdateMemberRoleAction
} from '../../redux/actions/teams';
import { FindUsers } from '../../redux/actions/users';
import swal from 'sweetalert';

const TeamSettingsContent = ({ team, user }) => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { _ALL: allUsers = [] } = useSelector((state) => state.users || {});
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    Name: '',
    description: '',
    pictureprofile: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general, members, danger
  const [searchTerm, setSearchTerm] = useState('');
  const [showMembersList, setShowMembersList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Function to check if user is an admin of the team
  const isAdmin = () => {
    if (!team || !team.members || !user) return false;
    
    const userMember = team.members.find(member => {
      // Get member user ID, handling both object and string formats
      const memberUserId = member.user?._id || member.user;
      
      // IMPORTANT: user.id (from auth) is equivalent to user._id (from database)
      const currentUserId = user.id || user._id;
      
      // Compare as strings to avoid type issues
      return String(memberUserId) === String(currentUserId);
    });
    
    return userMember?.role === 'ADMIN';
  };

  // Function to check if user is a member of the team
  const isMember = () => {
    if (!team || !team.members || !user) return false;
    
    return team.members.some(member => {
      const memberUserId = member.user?._id || member.user;
      const currentUserId = user.id || user._id;
      return String(memberUserId) === String(currentUserId);
    });
  };
  
  // Get current user's member ID
  const getCurrentUserMemberId = () => {
    if (!team || !team.members || !user) return null;
    
    const currentMember = team.members.find(member => {
      const memberUserId = member.user?._id || member.user;
      const currentUserId = user.id || user._id;
      return String(memberUserId) === String(currentUserId);
    });
    
    return currentMember ? (currentMember.user?._id || currentMember.user) : null;
  };
  
  // Tabs configuration
  const tabs = [
    { id: 'general', label: 'General', icon: (
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ) },
    { id: 'members', label: 'Members', icon: (
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ) }
  ];

  // Only add danger tab for admins
  if (isAdmin()) {
    tabs.push({ 
      id: 'danger', 
      label: 'Danger Zone', 
      icon: (
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ) 
    });
  }
  
  // Role options for team members
  const roleOptions = [
    { value: "ADMIN", label: "Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "ENGINEER", label: "Engineer" },
    { value: "GUEST", label: "Guest" }
  ];
  
  // Initialize form with team data
  useEffect(() => {
    if (team && team._id) {
      setForm({
        Name: team.Name || '',
        description: team.description || '',
        pictureprofile: team.pictureprofile || null
      });
      
      if (team.pictureprofile) {
        setPreviewImage(`data:image/png;base64,${team.pictureprofile}`);
      }
    }
  }, [team]);
  
  // Fetch users for member management if admin
  useEffect(() => {
    if (activeTab === 'members' && isAdmin()) {
      dispatch(FindUsers());
    }
  }, [dispatch, activeTab]);
  
  // Redirect if not a member
  useEffect(() => {
    if (!isMember() && team?._id) {
      navigate(`/teams`);
    }
  }, [navigate, team?._id]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value
    }));
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({
        ...form,
        pictureprofile: file
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setForm({
      ...form,
      pictureprofile: null
    });
    setPreviewImage(null);
  };
  
  // Filter users based on search term, excluding team members
  const getFilteredUsers = () => {
    if (!team || !team.members) return [];
    
    const teamMemberIds = team.members.map(m => {
      return m.user?._id || m.user;
    });
    
    return allUsers.filter(u => 
      !teamMemberIds.includes(u._id) && 
      (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };
  
  // Handle general settings update
  const handleUpdateTeam = async () => {
    if (!form.Name.trim() || !isAdmin()) return;
    
    setIsLoading(true);
    try {
      await dispatch(UpdateTeamAction(teamId, form));
      setIsLoading(false);
      
      // Success notification already handled in UpdateTeamAction
    } catch (error) {
      console.error('Error updating team:', error);
      setIsLoading(false);
    }
  };
  
  // Handle add member
  const handleAddMember = async (userId) => {
    if (!isAdmin()) return;
    
    try {
      setIsAddingMember(true);
      await dispatch(AddMemberAction(teamId, userId));
      setIsAddingMember(false);
      setShowMembersList(false);
      setSearchTerm('');
      
      // Show confirmation toast
      swal({
        title: "Success!",
        text: "Member added to team",
        icon: "success",
        button: false,
        timer: 2000,
      });
    } catch (error) {
      console.error('Error adding member:', error);
      setIsAddingMember(false);
    }
  };
  
  // Handle leave team (remove self)
  const handleLeaveTeam = async () => {
    const currentUserId = getCurrentUserMemberId();
    if (!currentUserId) return;
    
    try {
      const willLeave = await swal({
        title: "Are you sure?",
        text: "Are you sure you want to leave this team?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      });
      
      if (willLeave) {
        await dispatch(RemoveMemberAction(teamId, currentUserId));
        navigate('/teams');
      }
    } catch (error) {
      console.error('Error leaving team:', error);
    }
  };
  
  // Handle remove member (admin only)
  const handleRemoveMember = async (userId) => {
    if (!isAdmin()) return;
    
    // Prevent removing yourself as admin
    if (userId === (user?._id || user?.id) && isAdmin()) {
      swal("Error", "You cannot remove yourself as an admin", "error");
      return;
    }
    
    try {
      const willDelete = await swal({
        title: "Are you sure?",
        text: "Are you sure you want to remove this member?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      });
      
      if (willDelete) {
        await dispatch(RemoveMemberAction(teamId, userId));
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };
  
  // Handle role change (admin only)
  const handleRoleChange = async (userId, newRole) => {
    if (!isAdmin()) return;
    
    // Prevent changing your own role as admin
    if (userId === (user?._id || user?.id) && isAdmin() && newRole !== 'ADMIN') {
      swal("Error", "You cannot change your own admin role", "error");
      return;
    }
    
    try {
      await dispatch(UpdateMemberRoleAction(teamId, userId, newRole));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };
  
  // Handle team deletion (admin only)
  const handleDeleteTeam = async () => {
    if (!isAdmin() || deleteConfirmText !== team?.Name) return;
    
    setIsLoading(true);
    try {
      const result = await dispatch(DeleteTeamAction(teamId));
      setIsLoading(false);
      
      if (result) {
        navigate('/teams');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      setIsLoading(false);
    }
  };
  
  // Render general settings tab
  const renderGeneralTab = () => {
    return (
      <div>
        <div className="mb-6">
          <label className="mb-2.5 block font-medium text-black dark:text-white">
            Team Profile Picture
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={form.Name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full text-3xl font-semibold text-gray-500 dark:text-gray-400">
                  {form.Name?.charAt(0) || team?.Name?.charAt(0) || '?'}
                </div>
              )}
              
              {previewImage && isAdmin() && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-1 -top-1 rounded-full bg-danger p-1 text-white shadow-lg"
                >
                  <svg
                    className="h-4 w-4"
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
              )}
            </div>
            
            {isAdmin() && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-boxdark-2"
                >
                  {previewImage ? 'Change Picture' : 'Upload Picture'}
                </button>
                
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Recommended: Square image, at least 300x300 pixels
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="mb-2.5 block font-medium text-black dark:text-white">
            Team Name {isAdmin() && <span className="text-meta-1">*</span>}
          </label>
          <input
            type="text"
            name="Name"
            placeholder="Enter team name"
            value={form.Name}
            onChange={handleChange}
            required
            disabled={!isAdmin()}
            className={`w-full rounded-lg border border-stroke bg-white px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary ${
              !isAdmin() ? 'cursor-not-allowed opacity-75' : ''
            }`}
          />
        </div>
        
        <div className="mb-6">
          <label className="mb-2.5 block font-medium text-black dark:text-white">
            Description
          </label>
          <textarea
            name="description"
            placeholder="Describe your team's purpose and goals"
            value={form.description}
            onChange={handleChange}
            rows="4"
            disabled={!isAdmin()}
            className={`w-full rounded-lg border border-stroke bg-white px-4 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary ${
              !isAdmin() ? 'cursor-not-allowed opacity-75' : ''
            }`}
          ></textarea>
        </div>
        
        {isAdmin() && (
          <button
            type="button"
            onClick={handleUpdateTeam}
            disabled={!form.Name.trim() || isLoading}
            className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white ${
              !form.Name.trim() || isLoading
                ? 'cursor-not-allowed opacity-70'
                : 'hover:bg-opacity-90'
            }`}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };
  
  // Render members management tab
  const renderMembersTab = () => {
    return (
      <div>
        {isAdmin() && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
              Add Team Members
            </h3>
            <div className="relative">
              <div className="flex items-center">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.trim()) {
                      setShowMembersList(true);
                    } else {
                      setShowMembersList(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchTerm.trim()) {
                      setShowMembersList(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click to register
                    setTimeout(() => {
                      setShowMembersList(false);
                    }, 200);
                  }}
                  className="w-full pl-10 h-12 rounded-lg border border-stroke bg-white px-4 text-sm text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white"
                />
              </div>
              
              {/* Dropdown user list */}
              {showMembersList && searchTerm.trim() && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
                  {getFilteredUsers().length > 0 ? (
                    getFilteredUsers().map(user => (
                      <div
                        key={user._id}
                        onClick={() => handleAddMember(user._id)}
                        className="flex cursor-pointer items-center gap-3 border-b border-stroke p-3 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary overflow-hidden">
                          {user.picture ? (
                            <img
                              src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
                              alt={user.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{user.fullName?.charAt(0) || 'U'}</span>
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
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? "No users found" : "Type to search users"}
                    </div>
                  )}
                </div>
              )}
            </div>
            {isAddingMember && (
              <div className="mt-2 text-sm text-primary flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Adding member...
              </div>
            )}
          </div>
        )}
        
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Current Members ({team?.members?.length || 0})
            </h3>
            
            {isMember() && !isAdmin() && (
              <button
                type="button"
                onClick={handleLeaveTeam}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-sm font-medium"
              >
                {/* Leave Team button SVG */}
                Leave Team
              </button>
            )}
          </div>
          
          <div className="overflow-hidden rounded-sm border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
            <div className="grid grid-cols-12 border-b border-stroke px-4 py-4 dark:border-strokedark">
              <div className="col-span-5 flex items-center">
                <span className="font-medium text-black dark:text-white">Member</span>
              </div>
              <div className="col-span-4 flex items-center">
                <span className="font-medium text-black dark:text-white">Role</span>
              </div>
              <div className="col-span-3 flex items-center justify-end">
                <span className="font-medium text-black dark:text-white">Actions</span>
              </div>
            </div>
            
            {team?.members?.map(member => {
              // Skip if member is not defined
              if (!member) return null;
              
              // Handle both cases where member.user might be an object or just an ID
              const memberUser = typeof member.user === 'object' 
                ? member.user 
                : allUsers.find(u => u._id === member.user) || { _id: member.user };

              // Skip if we don't have user data
              if (!memberUser || !memberUser._id) return null;
              
              const isCurrentUser = memberUser._id === (user?._id || user?.id);
              
              return (
                <div 
                  key={memberUser._id} 
                  className="grid grid-cols-12 border-b border-stroke px-4 py-4 dark:border-strokedark last:border-b-0"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center">
                      {memberUser.picture ? (
                        <img
                          src={memberUser.picture.includes('https') ? memberUser.picture : `http://localhost:5500/${memberUser.picture}`}
                          alt={memberUser.fullName || 'User'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {memberUser.fullName?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-black dark:text-white">
                        {memberUser.fullName || 'Unknown User'}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {memberUser.email || 'No email provided'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="col-span-4 flex items-center">
                    {isAdmin() ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(memberUser._id, e.target.value)}
                        disabled={isCurrentUser && member.role === 'ADMIN'}
                        className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-black dark:border-strokedark dark:bg-boxdark dark:text-white"
                      >
                        {roleOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {roleOptions.find(option => option.value === member.role)?.label || member.role}
                      </span>
                    )}
                  </div>
                  
                  <div className="col-span-3 flex items-center justify-end">
                    {isAdmin() ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(memberUser._id)}
                        disabled={isCurrentUser && member.role === 'ADMIN'}
                        className={`rounded-lg p-2 text-danger hover:bg-danger/10 ${
                          isCurrentUser && member.role === 'ADMIN'
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    ) : (
                      isCurrentUser && (
                        <button
                          type="button"
                          onClick={handleLeaveTeam}
                          className="rounded-lg p-2 text-danger hover:bg-danger/10"
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
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  // Render danger zone tab
  const renderDangerTab = () => {
    return (
      <div>
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 dark:border-danger/20 dark:bg-danger/10">
          <h3 className="mb-3 text-lg font-semibold text-danger">Delete Team</h3>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Once you delete a team, there is no going back. Please be certain.
          </p>
          
          {showDeleteConfirm ? (
            <div>
              <p className="mb-3 text-sm font-medium text-black dark:text-white">
                To confirm, type <span className="font-bold">{team?.Name}</span> below:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type "${team?.Name}" to confirm`}
                className="mb-4 w-full rounded-lg border border-stroke bg-white px-4 py-3 text-black focus:border-danger focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:text-white"
              />
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  disabled={deleteConfirmText !== team?.Name || isLoading}
                  className={`flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white ${
                    deleteConfirmText !== team?.Name || isLoading
                      ? 'cursor-not-allowed opacity-70'
                      : 'hover:bg-opacity-90'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Permanently Delete Team</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Delete Team</span>
            </button>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Team Settings
      </h2>
      
      {/* Settings Tabs */}
      <div className="mb-6 border-b border-stroke dark:border-strokedark">
        <ul className="flex flex-wrap -mb-px">
          {tabs.map((tab) => (
            <li key={tab.id} className="mr-2">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 pb-3 px-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-600 border-b-2 border-transparent hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Tab Content */}
      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'danger' && renderDangerTab()}
      </div>
    </div>
  );
};

export default TeamSettingsContent;