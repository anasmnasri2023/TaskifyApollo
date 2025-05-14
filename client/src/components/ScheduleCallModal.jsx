import React from "react";
import ScheduleCallForm from "./ScheduleCallForm";

const ScheduleCallModal = ({ onClose, initialData = null, mode = 'create' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-3xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
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
        
        <ScheduleCallForm 
          onClose={onClose} 
          initialData={initialData} 
          mode={mode}
        />
      </div>
    </div>
  );
};

export default ScheduleCallModal;