import React, { useState, useEffect } from "react";
import Breadcrumb from "../../components/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { UseAuth } from "../../hooks/useAuth";
import { ROLES } from "../../data/roles";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import VideoCallModal from "../../components/VideoCall/VideoCallModal";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [projectCount, setProjectCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { _ALL: allUsers = [] } = useSelector((state) => state.users);
  const [formData, setFormData] = useState({
    project_name: "",
    project_description: "",
    project_manager: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "in progress",
    priority: "medium",
    client_name: "",
    team: "" // Added team field
  });
  
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]); // Added state for teams
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [videoCallState, setVideoCallState] = useState({
    open: false,
    roomId: null
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchTeams(); // Added function call to fetch teams
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/api/projects");
      setProjects(response.data.data);
      setProjectCount(response.data.data.length);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      const userData = response.data.data || response.data;
      const userArray = Array.isArray(userData) ? userData : [];
      const eligibleUsers = userArray.filter(user => 
        user.roles && (user.roles.includes("ADMIN") || user.roles.includes("MANAGER"))
      );
      setUsers(eligibleUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Added function to fetch teams
  const fetchTeams = async () => {
    try {
      const response = await axios.get("/api/teams");
      const teamsData = response.data.data || [];
      setTeams(teamsData);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData._id) {
        await axios.put(`/api/projects/${formData._id}`, formData);
      } else {
        await axios.post("/api/projects", formData);
      }
      setShowModal(false);
      fetchProjects();
      setFormData({
        project_name: "",
        project_description: "",
        project_manager: "",
        start_date: "",
        end_date: "",
        budget: "",
        status: "in progress",
        priority: "medium",
        client_name: "",
        team: "" // Reset team field
      });
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await axios.delete(`/api/projects/${id}`);
        fetchProjects();
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const selectUser = (user) => {
    setFormData({
      ...formData,
      project_manager: user.fullName,
      project_manager_id: user._id
    });
    setShowUserDropdown(false);
    setUserSearchTerm("");
  };

  const getFilteredUsers = () => {
    return users.filter(user => 
      user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  };

  const filteredProjects = projects.filter(project => 
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.project_manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserByName = (name) => {
    return users.find(user => user.fullName === name) || {};
  };

  const generateRoomId = (projectId) => {
    return `project-room-${projectId}`;
  };

  // Added function to get team name by ID
  const getTeamName = (teamId) => {
    const team = teams.find(team => team._id === teamId);
    return team ? team.Name : "N/A";
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Projects List" />

      {/* Global Video Call Button */}
      <button
        onClick={() => setVideoCallState({open: true, roomId: 'global'})}
        className="bg-primary text-white px-4 py-2 rounded mb-4"
      >
        Start Global Video Call
      </button>
      {videoCallState.open && (
        <VideoCallModal
          roomName={generateRoomId(videoCallState.roomId)}
          onClose={() => setVideoCallState({open: false, roomId: null})}
        />
      )}

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="flex justify-between items-center pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-white py-2 pl-6 pr-10 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center bg-primary py-2 px-6 text-white hover:bg-opacity-90 rounded-md"
            >
              Create Project
            </button>
            <select className="relative z-20 inline-flex appearance-none bg-transparent py-1 pl-3 pr-8 text-sm font-medium outline-none">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm font-medium">Entries Per Page</span>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white">
                  Name
                </th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                  Project Manager
                </th>
                {/* Added Team Column Header */}
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                  Team
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Start Date
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  End Date
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Status
                </th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                  Client Name
                </th>
                <th className="py-4 px-4 font-medium text-black dark:text-white">
                  Video Call
                </th>
                <th className="py-4 px-4 font-medium text-black dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project._id}>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{project.project_name}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{project.project_manager}</p>
                  </td>
                  {/* Added Team Column Data */}
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{project.team ? getTeamName(project.team) : "N/A"}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {new Date(project.start_date).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {new Date(project.end_date).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <span
                      className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                        project.status === "completed"
                          ? "bg-success text-success"
                          : project.status === "in progress"
                          ? "bg-primary text-primary"
                          : "bg-danger text-danger"
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{project.client_name}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <button
                      onClick={() => setVideoCallState({open: true, roomId: project._id})}
                      className="bg-primary text-white px-3 py-1 rounded hover:bg-opacity-90"
                    >
                      Join Call
                    </button>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <div className="flex items-center space-x-3.5">
                      <button
                        onClick={() => {
                          setFormData(project);
                          setShowModal(true);
                        }}
                        className="hover:text-primary"
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.17812 8.99981 3.17812C14.5686 3.17812 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.5562 8.99981 13.5562C13.1061 13.5562 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.44374 8.99981 4.44374C4.89356 4.44374 2.4748 7.95936 1.85605 8.99999Z"
                            fill=""
                          />
                          <path
                            d="M9 11.3906C7.67812 11.3906 6.60938 10.3219 6.60938 9C6.60938 7.67813 7.67812 6.60938 9 6.60938C10.3219 6.60938 11.3906 7.67813 11.3906 9C11.3906 10.3219 10.3219 11.3906 9 11.3906ZM9 7.875C8.38125 7.875 7.875 8.38125 7.875 9C7.875 9.61875 8.38125 10.125 9 10.125C9.61875 10.125 10.125 9.61875 10.125 9C10.125 8.38125 9.61875 7.875 9 7.875Z"
                            fill=""
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(project._id)}
                        className="hover:text-primary"
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                            fill=""
                          />
                          <path
                            d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"
                            fill=""
                          />
                          <path
                            d="M10.8279 9.11255C10.4904 9.11255 10.181 9.3938 10.181 9.75942V13.3313C10.181 13.6688 10.4623 13.9782 10.8279 13.9782C11.1654 13.9782 11.4748 13.6969 11.4748 13.3313V9.75942C11.4748 9.3938 11.1654 9.11255 10.8279 9.11255Z"
                            fill=""
                          />
                          <path
                            d="M7.17289 9.11255C6.83539 9.11255 6.52602 9.3938 6.52602 9.75942V13.3313C6.52602 13.6688 6.80727 13.9782 7.17289 13.9782C7.51039 13.9782 7.81977 13.6969 7.81977 13.3313V9.75942C7.81977 9.3938 7.51039 9.11255 7.17289 9.11255Z"
                            fill=""
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Modal with Team Field */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md dark:bg-boxdark">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              {formData._id ? "Edit Project" : "Add Project"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Project Name"
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  required
                />
                <textarea
                  placeholder="Project Description"
                  value={formData.project_description}
                  onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
                
                {/* Added Team Selection Field */}
                <div className="w-full">
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  >
                    <option value="">Select Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.Name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <div className="flex items-center w-full border rounded dark:border-strokedark">
                    <input
                      type="text"
                      placeholder="Select Project Manager"
                      value={formData.project_manager}
                      onChange={(e) => {
                        setFormData({...formData, project_manager: e.target.value});
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onClick={() => setShowUserDropdown(true)}
                      className="w-full p-2 rounded-l border-none focus:outline-none dark:bg-meta-4 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="px-4 py-2 bg-gray-100 dark:bg-meta-4 text-gray-500 dark:text-white rounded-r"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        {showUserDropdown ? (
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
                  
                  {showUserDropdown && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                      <div className="sticky top-0 border-b border-stroke dark:border-strokedark dark:bg-boxdark">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="w-full p-2 focus:outline-none dark:bg-meta-4 dark:text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {getFilteredUsers().length > 0 ? (
                        getFilteredUsers().map(user => (
                          <div
                            key={user._id}
                            onClick={() => selectUser(user)}
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
                          {userSearchTerm ? "No users found" : "No users available"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    required
                  />
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on hold">On Hold</option>
                </select>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="text"
                  placeholder="Client Name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  className="w-full p-2 border rounded dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      project_name: "",
                      project_description: "",
                      project_manager: "",
                      start_date: "",
                      end_date: "",
                      budget: "",
                      status: "in progress",
                      priority: "medium",
                      client_name: "",
                      team: "" // Reset team field
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                >
                  {formData._id ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default UseAuth(
  ProjectList,
  ROLES.filter((r) => r.title != "ENGINEER").map((i) => i.title)
);