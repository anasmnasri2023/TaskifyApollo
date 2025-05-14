import React, { useEffect, useState, useCallback } from "react";
import DefaultLayout from "../layout/DefaultLayout";
import Breadcrumb from "../components/Breadcrumb";
import Dropdownk from "../components/Dropdownk";
import { useDispatch, useSelector } from "react-redux";
import { FindTaskAction, UpdateTaskAction } from "../redux/actions/tasks";

const Kanban = () => {
  const dispatch = useDispatch();
  const [tasks, setTasks] = useState([]);
  const { _ALL, loading, error } = useSelector((state) => state.tasks);
  const authState = useSelector((state) => state.auth || {});
  const currentUserId = authState.user?._id || 
                        authState.user?.id || 
                        authState.data?._id || 
                        authState._id || 
                        authState.id || 
                        null;
  
  // Track which task is being dragged
  const [draggedTask, setDraggedTask] = useState(null);

  useEffect(() => {
    if (currentUserId) {
      dispatch(FindTaskAction(currentUserId));
    }
  }, [dispatch, currentUserId]);

  useEffect(() => {
    setTasks(_ALL);
  }, [_ALL]);

  // Filter tasks by status
  const onHold = tasks.filter((task) => task.status === "1");
  const inProgress = tasks.filter((task) => task.status === "2");
  const completed = tasks.filter((task) => task.status === "3");

  // Drag handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    // This makes the drag image semi-transparent
    setTimeout(() => {
      e.target.classList.add("opacity-50");
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("opacity-50");
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = useCallback((e, status) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Only update if status actually changed
    if (draggedTask.status !== status) {
      const updatedTask = { ...draggedTask, status };
      
      // Update local state immediately for better UX
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === draggedTask._id ? updatedTask : task
        )
      );
      
      // Dispatch update to backend
      dispatch(UpdateTaskAction(updatedTask, draggedTask._id, [], () => {}));
    }
  }, [draggedTask, dispatch]);

  // Render a task card
  const renderTask = (task) => (
    <div
      key={task._id}
      draggable="true"
      onDragStart={(e) => handleDragStart(e, task)}
      onDragEnd={handleDragEnd}
      className="task relative flex cursor-move justify-between rounded-sm border border-stroke bg-white p-7 shadow-default dark:border-strokedark dark:bg-boxdark"
    >
      <div>
        <h5 className="mb-4 text-lg font-medium text-black dark:text-white">
          {task.title}
        </h5>
        <p>{task.start_date ? new Date(task.start_date).toLocaleDateString() : ''}</p>
      </div>
      <div className="absolute right-4 top-4">
        <Dropdownk keepDelete={false} {...task} />
      </div>
    </div>
  );

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb pageName="Task Kanban" />
      </div>
      {loading && <p className="text-center my-4">Loading tasks...</p>}
      {error && <p className="text-center text-red-500 my-4">Error: {error.message}</p>}
      
      {/* Task List Wrapper */}
      <div className="mt-9 grid grid-cols-1 gap-7.5 sm:grid-cols-2 xl:grid-cols-3">
        {/* On Hold Column */}
        <div 
          className="swim-lane flex flex-col gap-5.5"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "1")}
        >
          <h4 className="text-xl font-semibold text-black dark:text-white">
            On Hold
          </h4>
          {onHold.map(renderTask)}
          
          {/* Empty state indicator */}
          {onHold.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-md p-6 text-center text-gray-500 h-32 flex items-center justify-center">
              <p>Drag tasks here</p>
            </div>
          )}
        </div>

        {/* In Progress Column */}
        <div 
          className="swim-lane flex flex-col gap-5.5"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "2")}
        >
          <h4 className="text-xl font-semibold text-black dark:text-white">
            In Progress
          </h4>
          {inProgress.map(renderTask)}
          
          {/* Empty state indicator */}
          {inProgress.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-md p-6 text-center text-gray-500 h-32 flex items-center justify-center">
              <p>Drag tasks here</p>
            </div>
          )}
        </div>

        {/* Completed Column */}
        <div 
          className="swim-lane flex flex-col gap-5.5"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "3")}
        >
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Completed
          </h4>
          {completed.map(renderTask)}
          
          {/* Empty state indicator */}
          {completed.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-md p-6 text-center text-gray-500 h-32 flex items-center justify-center">
              <p>Drag tasks here</p>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Kanban;