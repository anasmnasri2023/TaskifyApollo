import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { BiTrash } from "react-icons/bi";

import DefaultLayout from "../layout/DefaultLayout";
import Breadcrumb from "../components/Breadcrumb";
import UserHeader from "../components/UserHeader";
import RoleModal from "../components/RoleModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import { UseAuth } from "../hooks/useAuth";

// Define default roles with their descriptions and permissions
const DEFAULT_ROLES = {
  "project manager": {
    description: "Responsible for planning, executing, and closing projects. Oversees team members, manages schedules, and ensures projects are completed on time and within budget.",
    permissions: {
      createTask: true,
      viewTasks: true,
      editTasks: true,
      deleteTasks: false,
      manageUsers: false,
      viewReports: true,
      manageProjects: true
    }
  },
  "engineer": {
    description: "Responsible for designing, developing, and implementing technical solutions. Works on technical problems and contributes to product development.",
    permissions: {
      createTask: true,
      viewTasks: true,
      editTasks: true,
      deleteTasks: false,
      manageUsers: false,
      viewReports: false,
      manageProjects: false
    }
  },
  "admin": {
    description: "Has full system access and manages system settings, user accounts, and overall platform configuration.",
    permissions: {
      createTask: true,
      viewTasks: true,
      editTasks: true,
      deleteTasks: true,
      manageUsers: true,
      viewReports: true,
      manageProjects: true
    }
  }
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/roles');
      
      console.log("API Response:", response.data); // Debug log
      
      // Get roles from API
      let apiRoles = response.data || [];
      
      // If response has a data property, use that instead
      if (response.data && response.data.data) {
        apiRoles = response.data.data;
      }
      
      // Process roles to ensure default roles have correct properties
      const processedRoles = apiRoles.map(role => {
        // Normalize the role name for comparison
        const roleLower = (role.name || "").toLowerCase();
        
        // Check if this is a default role
        if (DEFAULT_ROLES[roleLower]) {
          // This is a default role - ensure it has the correct description and permissions
          return {
            ...role,
            isDefault: true,
            description: DEFAULT_ROLES[roleLower].description,
            permissions: DEFAULT_ROLES[roleLower].permissions
          };
        }
        
        // Not a default role
        return {
          ...role,
          isDefault: false,
          // Ensure permissions is an object if it doesn't exist
          permissions: role.permissions || {}
        };
      });
      
      // Check if all default roles exist in the API response
      const defaultRoleNames = Object.keys(DEFAULT_ROLES);
      const existingDefaultRoles = processedRoles
        .filter(role => role.name && defaultRoleNames.includes((role.name || "").toLowerCase()))
        .map(role => (role.name || "").toLowerCase());
      
      // Add any missing default roles
      const missingDefaultRoles = defaultRoleNames.filter(name => 
        !existingDefaultRoles.includes(name)
      );
      
      // Create missing default roles with proper structure
      const additionalDefaultRoles = missingDefaultRoles.map(name => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        description: DEFAULT_ROLES[name].description,
        permissions: DEFAULT_ROLES[name].permissions,
        isDefault: true
      }));
      
      const allRoles = [...processedRoles, ...additionalDefaultRoles];
      console.log("All roles after processing:", allRoles); // Debug log
      
      setRoles(allRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (newRole) => {
    try {
      console.log("Saving new role:", newRole); // Debug log
      
      const response = await axios.post('/api/roles', newRole);
      console.log("API response after save:", response.data); // Debug log
      
      let savedRole = response.data;
      
      // If response has a data property, use that
      if (response.data && response.data.data) {
        savedRole = response.data.data;
      }
      
      // Ensure the saved role has all needed properties
      const processedRole = {
        ...savedRole,
        isDefault: false,
        name: savedRole.name || newRole.name,
        description: savedRole.description || newRole.description,
        permissions: savedRole.permissions || newRole.permissions || {}
      };
      
      console.log("Processed saved role:", processedRole); // Debug log
      
      // Add the new role to the list
      setRoles([...roles, processedRole]);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Failed to create role. Please try again.");
    }
  };
  
  const openDeleteModal = (role) => {
    // Only allow deleting non-default roles
    if (!role.isDefault) {
      setRoleToDelete(role);
      setIsDeleteModalOpen(true);
    }
  };
  
  const handleDeleteRole = async () => {
    try {
      if (roleToDelete && !roleToDelete.isDefault) {
        await axios.delete(`/api/roles/${roleToDelete._id}`);
        setRoles(roles.filter(role => role._id !== roleToDelete._id));
        setIsDeleteModalOpen(false);
        setRoleToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role. Please try again.");
    }
  };

  // Helper function to format permission text
  const formatPermissionText = (text) => {
    // Convert camelCase to Title Case with spaces
    return text.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Roles" />
      
      {/* Updated UserHeader with Add Role button */}
      <UserHeader 
        status={true} 
        buttonText="Add New Role"
        popupOpen={isModalOpen} 
        setPopupOpen={setIsModalOpen}
        onButtonClick={() => setIsModalOpen(true)}
      />
      
      {/* Title without the Add New Role button */}
      <div className="mb-6">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Manage Roles
        </h2>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 gap-7.5 sm:grid-cols-2 xl:grid-cols-2">
          {roles.map((role, index) => {
            // Get permissions that are true/enabled
            const enabledPermissions = role.permissions ? 
              Object.entries(role.permissions)
                .filter(([_, value]) => value === true)
                .map(([key]) => formatPermissionText(key)) 
              : [];
              
            return (
              <div key={role._id || index} className="rounded-lg border border-stroke bg-white shadow-md dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke p-5 px-7.5 dark:border-strokedark">
                  <h4 className="text-xl font-semibold text-black hover:text-primary dark:text-white dark:hover:text-primary">
                    <div className="flex items-center justify-between">
                      <Link to="#" className="text-md">
                        {role.name || "Unnamed Role"}
                      </Link>
                      <div className="flex items-center gap-3">
                        {!role.isDefault && (
                          <button 
                            onClick={() => openDeleteModal(role)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete Role"
                          >
                            <BiTrash size={18} />
                          </button>
                        )}
                        <span className="rounded-full bg-gray-200 p-2 text-sm shadow-md">
                          {((role.name || "U").substring(0, 1)).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </h4>
                </div>
                <div className="px-7.5 pb-9 pt-6">
                  {role.description && <p>{role.description}</p>}
                  
                  <div className="mt-4">
                    <h5 className="mb-2 text-sm font-medium text-black dark:text-white">
                      Permissions:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {enabledPermissions.length > 0 ? (
                        enabledPermissions.map((permission, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded bg-primary bg-opacity-10 py-1 px-3 text-xs font-medium text-primary"
                          >
                            {permission}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No permissions assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Role Creation Modal */}
      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRole}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRole}
        roleName={roleToDelete ? roleToDelete.name : ''}
      />
    </DefaultLayout>
  );
};

export default UseAuth(Roles, ["ADMIN"]);