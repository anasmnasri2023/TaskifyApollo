// src/components/DeleteConfirmationModal.jsx
import React from 'react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, roleName }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-sm shadow-default">
        <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Confirm Deletion
          </h3>
        </div>
        <div className="p-6.5">
          <p className="mb-6 text-black dark:text-white">
            Are you sure you want to delete the role <span className="font-semibold">{roleName}</span>? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-4.5">
            <button
              onClick={onClose}
              className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex justify-center rounded bg-danger py-2 px-6 font-medium text-white hover:bg-opacity-90"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;