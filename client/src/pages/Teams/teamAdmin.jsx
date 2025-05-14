import React, { useState, useEffect, useRef } from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { useDispatch, useSelector } from "react-redux";
import { 
  CreateTeamAction,
  UpdateTeamAction,
  DeleteTeamAction,
  GetAllTeamsAction,
  GetTeamAction
} from "../../redux/actions/teams";
import { setRefresh } from "../../redux/reducers/commons";
import TeamPopup from "../../components/Teams/TeamPopup";
import moment from "moment";

const TeamAdmin = () => {
  const dispatch = useDispatch();
  const teamsState = useSelector((state) => state.teams);
  const { _ALL: teams = [] } = teamsState || {};
  const { roles = [], _id: currentUserId } = useSelector(state => state.auth?.user || {});
  const { _ONE: currentTeam = {} } = useSelector((state) => state.teams || {});
  
  // Popup state and refs
  const [popupOpen, setPopupOpen] = useState(false);
  const popup = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      await dispatch(GetAllTeamsAction());
      setIsLoading(false);
    };
    fetchTeams();
  }, [dispatch]);

  // Close popup when clicking outside
  useEffect(() => {
    const clickHandler = (event) => {
      if (!popup.current) return;
      if (!popupOpen) return;
      
      // Check if click is inside popup or any react-select components
      const isReactSelect = event.target.closest('.react-select__menu') || 
                           event.target.closest('.react-select__control') ||
                           event.target.closest('.react-select__value-container') ||
                           event.target.closest('.react-select__input-container') ||
                           event.target.closest('.react-select__dropdown-indicator');
      
      // If click is inside popup or react-select components, do nothing
      if (popup.current.contains(event.target) || isReactSelect) {
        return;
      }
      
      // Otherwise, close the popup
      setPopupOpen(false);
      setEditingId(null);
    };
    
    // Add the event listener only when popup is open
    if (popupOpen) {
      document.addEventListener("mousedown", clickHandler);
    }
    
    // Clean up
    return () => document.removeEventListener("mousedown", clickHandler);
  }, [popupOpen]);

  // Close popup on ESC key
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!popupOpen || keyCode !== 27) return;
      setPopupOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  const handleCreateTeam = (e) => {
    e.stopPropagation();
    // Reset currentTeam in redux state to prevent data persistence
    dispatch({ type: 'RESET_CURRENT_TEAM' });
    setEditingId(null);
    setPopupOpen(true);
  };

  const handleEditTeam = (teamId, e) => {
    e?.stopPropagation();
    setEditingId(teamId);
    dispatch(GetTeamAction(teamId));
    setPopupOpen(true);
  };

  const confirmDeleteTeam = (teamId, teamName) => {
    setTeamToDelete({ id: teamId, name: teamName });
    setShowDeleteModal(true);
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    
    setIsLoading(true);
    await dispatch(DeleteTeamAction(teamToDelete.id));
    await dispatch(GetAllTeamsAction());
    setShowDeleteModal(false);
    setTeamToDelete(null);
    setIsLoading(false);
  };

  const handlePopupSuccess = async () => {
    setIsLoading(true);
    // Make sure to close the popup immediately
    setPopupOpen(false);
    setEditingId(null);
    // Then refresh the data
    await dispatch(GetAllTeamsAction());
    setIsLoading(false);
  };

  // Filter teams based on search term
  const filteredTeams = teams.filter(team => 
    team.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = roles.includes("ADMIN");

  // Get member count for each team
  const getMemberCount = (team) => {
    return team.members?.length || 0;
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-6xl">
        <Breadcrumb pageName="Teams" />

        {/* Team Header with Search and Create Button */}
        <div className="mb-6 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-black dark:text-white">
                Team Management
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create and manage your organization teams
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark"
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
              <button
                onClick={handleCreateTeam}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 font-medium text-white transition hover:bg-opacity-90"
              >
                <svg
                  className="fill-current"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 7H9V1C9 0.4 8.6 0 8 0C7.4 0 7 0.4 7 1V7H1C0.4 7 0 7.4 0 8C0 8.6 0.4 9 1 9H7V15C7 15.6 7.4 16 8 16C8.6 16 9 15.6 9 15V9H15C15.6 9 16 8.6 16 8C16 7.4 15.6 7 15 7Z"
                    fill=""
                  />
                </svg>
                Add Team
              </button>
            </div>
          </div>
        </div>

        {/* Team List */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6 py-5 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-black dark:text-white">
                All Teams
              </h4>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? "No teams match your search" : "No teams created yet"}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeams.map((team) => (
                  <div 
                    key={team._id} 
                    className="group cursor-pointer rounded-xl border border-stroke bg-white p-5 transition hover:shadow-lg dark:border-strokedark dark:bg-boxdark dark:hover:shadow-gray-800"
                    onClick={(e) => handleEditTeam(team._id, e)}
                  >
                    <div className="mb-4 flex items-center">
                      <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        {team.pictureprofile ? (
                          <img
                            src={`data:image/png;base64,${team.pictureprofile}`}
                            alt={team.Name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <svg
                            className="h-7 w-7 text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-black dark:text-white">
                          {team.Name}
                        </h4>
                        <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {getMemberCount(team)} member{getMemberCount(team) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                      {team.description || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created {moment(team.createdAt).format("MMM D, YYYY")}
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTeam(team._id, e);
                            }}
                            className="rounded-md p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteTeam(team._id, team.Name);
                            }}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TeamPopup Component */}
        <TeamPopup
          popupOpen={popupOpen}
          setPopupOpen={setPopupOpen}
          popup={popup}
          editingId={editingId}
          currentTeam={editingId ? currentTeam : null} 
          currentUserId={currentUserId} // Pass the current user ID to exclude from member selection
          onSuccess={handlePopupSuccess}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-40">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                Delete Team
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete "{teamToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-boxdark-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeam}
                  className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default TeamAdmin;