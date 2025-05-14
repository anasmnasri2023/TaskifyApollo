import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FindUsers } from "../../redux/actions/users";
import { CreateTeamAction, UpdateTeamAction } from "../../redux/actions/teams";
import { _FindOneTeam } from "../../redux/reducers/teams";
import { setRefresh } from "../../redux/reducers/commons";
import { setErrors } from "../../redux/reducers/errors";

const TeamPopup = ({ popupOpen, setPopupOpen, editingId, popup, onSuccess }) => {
  const dispatch = useDispatch();
  const { _ALL: allUsers = [] } = useSelector((state) => state.users);
  const { _ONE: currentTeam = {} } = useSelector((state) => state.teams);
  const { content: errors } = useSelector((state) => state.errors);
  const { refresh } = useSelector((state) => state.commons);
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    Name: "",
    description: "", 
    members: [],
    pictureprofile: null
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [showMembersList, setShowMembersList] = useState(false);

  // Role options for team members
  const roleOptions = [
    { value: "ADMIN", label: "Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "ENGINEER", label: "Engineer" },
    { value: "GUEST", label: "Guest" }
  ];

  useEffect(() => {
    if (popupOpen) {
      dispatch(FindUsers());
    }
  }, [dispatch, popupOpen]);

  // Initialize form with team data when editing
  useEffect(() => {
    if (editingId && currentTeam?._id === editingId) {
      setForm({
        Name: currentTeam.Name || "",
        description: currentTeam.description || "",
        members: currentTeam.members?.map(m => ({
          user: m.user._id,
          role: m.role
        })) || [],
        pictureprofile: currentTeam.pictureprofile || null
      });
      if (currentTeam.pictureprofile) {
        setPreviewImage(`data:image/png;base64,${currentTeam.pictureprofile}`);
      }
    } else if (!editingId && popupOpen) {
      // For new team, automatically add current user as admin
      setForm({
        Name: "",
        description: "",
        members: [{
          user: user._id,
          role: "ADMIN"
        }],
        pictureprofile: null
      });
      setPreviewImage(null);
    }
  }, [currentTeam, editingId, user, popupOpen]);

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

  // Get filtered users based on search, excluding the current user
  const getFilteredUsers = () => {
    return allUsers.filter(u => 
      u._id !== user._id && // Exclude the connected user
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !form.members.some(m => m.user === u._id)
    );
  };

  // Add a member to the team
  const addMember = (userId) => {
    if (!form.members.some(m => m.user === userId)) {
      setForm(prev => ({
        ...prev,
        members: [
          ...prev.members,
          {
            user: userId,
            role: "ENGINEER" // Default role for new members
          }
        ]
      }));
    }
    setSearchTerm("");
  };

  // Remove a member from the team
  const removeMember = (userId) => {
    // Don't allow removing creator in new team
    if (!editingId && userId === user._id) return;
    
    setForm(prev => ({
      ...prev,
      members: prev.members.filter(m => m.user !== userId)
    }));
  };

  const handleRoleChange = (userId, newRole) => {
    setForm({
      ...form,
      members: form.members.map(member => 
        member.user === userId ? { ...member, role: newRole } : member
      )
    });
  };

  const clearForm = () => {
    dispatch(_FindOneTeam({}));
    setForm({
      Name: "",
      description: "",
      members: [{
        user: user._id,
        role: "ADMIN"
      }],
      pictureprofile: null
    });
    setPreviewImage(null);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    dispatch(setErrors({}));
  
    // Validate required fields
    if (!form.Name.trim()) {
      dispatch(setErrors({ Name: "Team name is required" }));
      return;
    }
  
    // Prepare form data for submission
    const formData = {
      Name: form.Name.trim(),
      description: form.description || '',
      members: form.members,
      pictureprofile: form.pictureprofile
    };
    
    try {
      // Determine if creating new or updating existing team
      if (editingId) {
        await dispatch(UpdateTeamAction(editingId, formData));
      } else {
        await dispatch(CreateTeamAction(formData));
      }
      
      // Only close if the dispatch was successful
      if (onSuccess) onSuccess();
      clearForm();
      // Force close the popup
      setPopupOpen(false);
      
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const isDisabled = (field) => {
    // Add any role-based restrictions here if needed
    return false;
  };

  const removeImage = () => {
    setForm({
      ...form,
      pictureprofile: null
    });
    setPreviewImage(null);
  };

  // Get user details by ID
  const getUserDetails = (userId) => {
    return allUsers.find(u => u._id === userId) || {};
  };

  return (
    <div
      ref={popup}
      className={`fixed left-0 top-0 z-99999 flex h-screen w-full justify-center overflow-y-scroll bg-black/80 px-4 py-5 ${
        popupOpen ? "block" : "hidden"
      }`}
    >
      <div className="relative m-auto w-full max-w-180 rounded-sm border border-stroke bg-gray p-4 shadow-default dark:border-strokedark dark:bg-meta-4 sm:p-8 xl:p-10">
        <button
          onClick={() => {
            setPopupOpen(false);
            clearForm();
            dispatch(setRefresh(false));
            dispatch(setErrors({}));
          }}
          className="absolute right-1 top-1 sm:right-5 sm:top-5"
        >
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.8913 9.99599L19.5043 2.38635C20.032 1.85888 20.032 1.02306 19.5043 0.495589C18.9768 -0.0317329 18.141 -0.0317329 17.6135 0.495589L10.0001 8.10559L2.38673 0.495589C1.85917 -0.0317329 1.02343 -0.0317329 0.495873 0.495589C-0.0318274 1.02306 -0.0318274 1.85888 0.495873 2.38635L8.10887 9.99599L0.495873 17.6056C-0.0318274 18.1331 -0.0318274 18.9689 0.495873 19.4964C0.717307 19.7177 1.05898 19.9001 1.4413 19.9001C1.75372 19.9001 2.13282 19.7971 2.40606 19.4771L10.0001 11.8864L17.6135 19.4964C17.8349 19.7177 18.1766 19.9001 18.5589 19.9001C18.8724 19.9001 19.2531 19.7964 19.5265 19.4737C20.0319 18.9452 20.0245 18.1256 19.5043 17.6056L11.8913 9.99599Z"
              fill=""
            />
          </svg>
        </button>

        {!refresh ? (
          <form onSubmit={onSubmitHandler}>
            <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">
              {editingId ? "Edit Team" : "Create New Team"}
            </h2>

            {/* Team Profile Picture */}
            

            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Team Name <span className="text-meta-1">*</span>
              </label>
              <input
                type="text"
                name="Name" 
                placeholder="Enter team name"
                value={form.Name || ''} 
                onChange={handleChange}
                required
                disabled={isDisabled("Name")}
                className="w-full rounded-sm border border-stroke bg-white px-4.5 py-3 focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
              />
              {errors.Name && (
                <div className="text-sm text-red">{errors.Name}</div>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Description <span className="text-meta-1">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="4"
                placeholder="Enter team description"
                disabled={isDisabled("description")}
                className="w-full rounded-sm border border-stroke bg-white px-4.5 py-3 focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
              />
              {errors.description && (
                <div className="text-sm text-red">{errors.description}</div>
              )}
            </div>

            {/* Improved Member Selection */}
            <div className="mb-5">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Team Members <span className="text-meta-1">*</span>
              </label>
              
              {/* Selected Members Display */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {form.members.map(member => {
                    const memberDetails = getUserDetails(member.user);
                    return (
                      <div 
                        key={member.user} 
                        className="flex items-center gap-2 rounded-full bg-primary bg-opacity-10 px-3 py-1"
                      >
                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center overflow-hidden">
                          {memberDetails.picture ? (
                            <img 
                              src={memberDetails.picture.includes('https') ? memberDetails.picture : `http://localhost:5500/${memberDetails.picture}`}
                              className="h-full w-full object-cover"
                              alt={memberDetails.fullName}
                            />
                          ) : (
                            <span className="text-xs">{memberDetails.fullName?.charAt(0) || user.fullName?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-sm">{memberDetails.fullName || (member.user === user._id ? user.fullName : 'Unknown User')}</span>
                        {(!editingId && member.user === user._id) ? (
                          <span className="bg-primary px-2 py-0.5 text-xs text-white rounded-full">
                            Creator
                          </span>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => removeMember(member.user)}
                            className="ml-1 text-danger hover:text-opacity-80"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Search and Add Members */}
              <div className="relative">
                <div className="flex w-full">
                  <input
                    type="text"
                    placeholder="Search for members..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value) {
                        setShowMembersList(true);
                      }
                    }}
                    onFocus={() => setShowMembersList(true)}
                    className="w-full rounded-l-sm border border-stroke bg-white px-4.5 py-3 focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMembersList(!showMembersList)}
                    className="bg-primary px-4 py-3 text-white rounded-r-sm hover:bg-opacity-90"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      {showMembersList ? (
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      ) : (
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      )}
                    </svg>
                  </button>
                </div>

                {/* Dropdown user list */}
                {showMembersList && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                    {getFilteredUsers().length > 0 ? (
                      getFilteredUsers().map(user => (
                        <div
                          key={user._id}
                          onClick={() => {
                            addMember(user._id);
                            setShowMembersList(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden bg-primary text-white">
                            {user.picture ? (
                              <img 
                                src={user.picture.includes('https') ? user.picture : `http://localhost:5500/${user.picture}`}
                                className="h-full w-full object-cover"
                                alt={user.fullName}
                              />
                            ) : (
                              <span>{user.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-black dark:text-white">{user.fullName}</p>
                            {user.email && <p className="text-xs text-body-color">{user.email}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-body-color">
                        {searchTerm ? "No users found" : "No more users available"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {errors.members && (
                <div className="mt-2 text-sm text-red">{errors.members}</div>
              )}
            </div>

            {/* Member Roles Table */}
            {form.members.length > 0 && (
              <div className="mb-5">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Member Roles
                </label>
                <div className="rounded-sm border border-stroke bg-white dark:border-strokedark dark:bg-boxdark overflow-hidden">
                  <div className="grid grid-cols-12 border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <div className="col-span-7 flex items-center">
                      <span className="font-medium">Member</span>
                    </div>
                    <div className="col-span-5 flex items-center justify-end">
                      <span className="font-medium">Role</span>
                    </div>
                  </div>
                  
                  {form.members.map(member => {
                    const memberDetails = getUserDetails(member.user);
                    const isCurrentUser = member.user === user._id;
                    return (
                      <div 
                        key={member.user} 
                        className="grid grid-cols-12 border-b border-stroke px-4 py-4 dark:border-strokedark last:border-b-0"
                      >
                        <div className="col-span-7 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center">
                            {memberDetails.picture ? (
                              <img 
                                src={memberDetails.picture.includes('https') ? memberDetails.picture : `http://localhost:5500/${memberDetails.picture}`}
                                className="h-full w-full object-cover"
                                alt={memberDetails.fullName}
                              />
                            ) : (
                              <span>{isCurrentUser ? user.fullName?.charAt(0) : memberDetails.fullName?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <h5 className="font-medium text-black dark:text-white">
                              {isCurrentUser ? user.fullName : memberDetails.fullName}
                              {(!editingId && isCurrentUser) && (
                                <span className="ml-2 text-xs text-primary">(Creator)</span>
                              )}
                            </h5>
                            {(isCurrentUser ? user.email : memberDetails.email) && (
                              <p className="text-xs text-body-color">{isCurrentUser ? user.email : memberDetails.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="col-span-5 flex items-center justify-end">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user, e.target.value)}
                            disabled={!editingId && isCurrentUser}
                            className="rounded-sm border border-stroke bg-white px-3 py-1 dark:border-strokedark dark:bg-boxdark"
                          >
                            {roleOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4.5 py-2.5 font-medium text-white hover:bg-opacity-90"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                  clipRule="evenodd"
                />
              </svg>
              {editingId ? "Update Team" : "Create Team"}
            </button>
          </form>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPopup;