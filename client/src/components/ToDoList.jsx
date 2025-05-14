import React, { useEffect, useState } from "react";
import PaginationOne from "./PaginationOne";
import TaskRow from "./elements/TaskRow";
import { useDispatch, useSelector } from "react-redux";
import { FindTaskAction } from "../redux/actions/tasks";

const ToDoList = ({ searchTerm = "", filters = {} }) => {
  const [filteredTasks, setFilteredTasks] = useState([]);
  const dispatch = useDispatch();
  const { _ALL } = useSelector((state) => state.tasks);

  // Fetch tasks when component mounts
  useEffect(() => {
    dispatch(FindTaskAction());
  }, [dispatch]);

  // Apply search and filters when tasks or search/filter criteria change
  useEffect(() => {
    if (!_ALL) return;

    // Filter tasks based on search term and filter criteria
    const filtered = _ALL.filter((task) => {
      // Search term filtering (case insensitive)
      const searchMatch = !searchTerm || 
        (task.title && task.title.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter by priority
      const priorityMatch = !filters.priority || 
        task.priority === filters.priority;

      // Filter by type
      const typeMatch = !filters.type || 
        task.type === filters.type;

      // Filter by status
      const statusMatch = !filters.status || 
        task.status === filters.status;

      // Filter by project
      const projectMatch = !filters.project || 
        (task.project && (
          task.project === filters.project || 
          (typeof task.project === 'object' && task.project.value === filters.project)
        ));
        
      // Filter by assigned user
      const assignedUserMatch = !filters.assignedTo || (
        task.assigns && (
          // Handle case where assigns is an array of user IDs
          (Array.isArray(task.assigns) && task.assigns.some(assign => 
            assign === filters.assignedTo || assign._id === filters.assignedTo
          )) ||
          // Handle case where assigns is a single user ID
          task.assigns === filters.assignedTo ||
          // Handle case where assigns is an object with _id
          (task.assigns._id && task.assigns._id === filters.assignedTo)
        )
      );

      // Return true only if all conditions match
      return searchMatch && priorityMatch && typeMatch && statusMatch && projectMatch && assignedUserMatch;
    });

    setFilteredTasks(filtered);
  }, [_ALL, searchTerm, filters]);

  return (
    <div className="col-span-12 xl:col-span-7">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-4 py-4 dark:border-strokedark md:px-6 md:py-6 xl:px-7.5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-title-sm2 font-bold text-black dark:text-white">
                Tasks List
              </h2>
            </div>
            {/* Show the count of filtered tasks */}
            <div className="text-sm text-gray-500">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found
            </div>
          </div>
        </div>

        <div className="px-4 py-4 md:px-6 md:py-6 xl:px-7.5">
          {filteredTasks.length > 0 ? (
            <div className="flex flex-col gap-6">
              {filteredTasks.map((task) => (
                <TaskRow 
                  key={task._id} 
                  {...task} 
                  // Removed the onTaskSelect prop
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {_ALL && _ALL.length > 0 
                  ? "No tasks match your search criteria. Try adjusting your filters."
                  : "No tasks found. Click 'Add task' to create a new task."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToDoList;