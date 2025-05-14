import React, { useState, useRef, useEffect } from "react";
import TaskPopup from "./TaskPopup";
import { useDispatch, useSelector } from "react-redux";
import TaskGenerator from "./taskGenerator";
import { GetProjectsAction } from "../redux/actions/projects";
import { FindUsers } from "../redux/actions/users";
import { MOCK_PRIORITY, MOCK_STATUS, MOCK_TYPE, MOCK_DATA } from "../data/mock";

const TaskHeader = ({ searchTerm, onSearchChange, filters, onFilterChange }) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [generateTaskIsOpen, setGenerateTask] = useState(false);
  
  // Use refs to track if we've already dispatched actions
  const hasDispatchedProjects = useRef(false);
  const hasDispatchedUsers = useRef(false);
  
  const trigger = useRef(null);
  const popup = useRef(null);
  const dispatch = useDispatch();
  
  // Get projects and users with stable selector functions
  const projects = useSelector((state) => {
    return state.projects?.projects || [];
  });
  
  const users = useSelector((state) => {
    return state.users?._ALL || [];
  });
  
  // Fetch data only once using refs to track
  useEffect(() => {
    if (!hasDispatchedProjects.current) {
      dispatch(GetProjectsAction());
      hasDispatchedProjects.current = true;
    }
  }, [dispatch]);
  
  useEffect(() => {
    if (!hasDispatchedUsers.current) {
      dispatch(FindUsers());
      hasDispatchedUsers.current = true;
    }
  }, [dispatch]);

  // Close on click outside for task popup - only add listener once
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!popup.current) return;
      if (!popupOpen || popup.current.contains(target) || trigger.current.contains(target)) return;
      setPopupOpen(false);
    };
    
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [popupOpen]);

  // Close if the esc key is pressed - only add listener once
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!popupOpen || keyCode !== 27) return;
      setPopupOpen(false);
    };
    
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [popupOpen]);

  // Count active filters 
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length;

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      {/* Header Section */}
      <div className="flex flex-col gap-y-4 p-3 sm:flex-row sm:items-center sm:justify-between border-b border-stroke dark:border-strokedark">
        <div className="w-full sm:w-1/3">
          <h3 className="pl-2 text-title-lg font-semibold text-black dark:text-white">
            Tasks
          </h3>
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-1/3 relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-sm border border-stroke bg-white pl-10 pr-4 py-2 text-sm focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark"
            />
            <span className="absolute left-3 top-2.5">
              <svg
                className="fill-body dark:fill-bodydark"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.5 14.5L10.5 10.5M6.5 12.5C3.18629 12.5 0.5 9.81371 0.5 6.5C0.5 3.18629 3.18629 0.5 6.5 0.5C9.81371 0.5 12.5 3.18629 12.5 6.5C12.5 9.81371 9.81371 12.5 6.5 12.5Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex w-full sm:w-1/3 justify-end space-x-2">
          {/* Add Task Button */}
          <button
            ref={trigger}
            onClick={() => {
              setPopupOpen(!popupOpen);
            }}
            className="flex items-center gap-2 rounded bg-primary px-4.5 py-2 font-medium text-white hover:bg-opacity-80"
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
            Add task
          </button>
          
          {/* Generate Task Button */}
          <button 
            onClick={() => setGenerateTask(true)}
            className="rounded border border-stroke px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
          >
            Generate Task
          </button>
          
          {generateTaskIsOpen && 
            <TaskGenerator setGenerateTask={setGenerateTask} />
          }

          {/* Task Popup */}
          <TaskPopup
            popupOpen={popupOpen}
            setPopupOpen={setPopupOpen}
            popup={popup}
          />
        </div>
      </div>

      {/* Filters Section - Now Visible */}
      <div className="p-4 border-b border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4 transition-all">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filter label with count */}
          <div className="flex items-center">
            <svg
              className="mr-2"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.5 2H1.5C1.23478 2 1 2.23478 1 2.5V3.5C1 3.76522 1.23478 4 1.5 4H14.5C14.7652 4 15 3.76522 15 3.5V2.5C15 2.23478 14.7652 2 14.5 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 8H4.5C4.23478 8 4 8.23478 4 8.5V9.5C4 9.76522 4.23478 10 4.5 10H11.5C11.7652 10 12 9.76522 12 9.5V8.5C12 8.23478 11.7652 8 11.5 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 14H7.5C7.23478 14 7 13.7652 7 13.5V12.5C7 12.2348 7.23478 12 7.5 12H8.5C8.76522 12 9 12.2348 9 12.5V13.5C9 13.7652 8.76522 14 8.5 14Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-medium text-sm text-black dark:text-white mr-2">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select 
              value={filters.priority || ""}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                filters.priority !== '' 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark'
              }`}
            >
              <option value="">Priority</option>
              {MOCK_PRIORITY && MOCK_PRIORITY.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="relative">
            <select 
              value={filters.type || ""}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                filters.type !== '' 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark'
              }`}
            >
              <option value="">Type</option>
              {MOCK_TYPE && MOCK_TYPE.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label || `Type ${type.value}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select 
              value={filters.status || ""}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                filters.status !== '' 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark'
              }`}
            >
              <option value="">Status</option>
              {MOCK_STATUS && MOCK_STATUS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Project Filter */}
          <div className="relative">
            <select 
              value={filters.project || ""}
              onChange={(e) => onFilterChange('project', e.target.value)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                filters.project !== '' 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark'
              }`}
            >
              <option value="">Project</option>
              {projects && projects.length > 0 ? (
                projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name || project.project_name}
                  </option>
                ))
              ) : (
                // Fallback to mock data if needed
                MOCK_DATA && MOCK_DATA.length > 0 && MOCK_DATA.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {/* User Filter */}
          <div className="relative">
            <select 
              value={filters.assignedTo || ""}
              onChange={(e) => onFilterChange('assignedTo', e.target.value)}
              className={`rounded-full px-4 py-1.5 text-sm border ${
                filters.assignedTo !== '' 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark'
              }`}
            >
              <option value="">Assigned To</option>
              {users && users.length > 0 && users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.fullName || user.name || user.email || `User ${user._id}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Reset Filters button */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onFilterChange('priority', '');
                onFilterChange('type', '');
                onFilterChange('status', '');
                onFilterChange('project', '');
                onFilterChange('assignedTo', '');
              }}
              className="rounded-full bg-gray-200 dark:bg-meta-4 py-1.5 px-4 text-sm hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center"
            >
              <span>Clear</span>
              <svg className="w-3 h-3 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskHeader;