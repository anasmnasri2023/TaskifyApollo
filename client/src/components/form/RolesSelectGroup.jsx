import React, { useEffect } from "react";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { fetchRolesAction } from "../../redux/actions/roles";

const RolesSelectGroup = ({
  label = "Roles",
  name = "roles",
  disabled = false,
  required = true, // Changed default to true
  action,
  errors,
  defaultValue = [],
  className,
  value // Added value prop for controlled component
}) => {
  const dispatch = useDispatch();
  const { roles } = useSelector((state) => state.roles);

  // Convert roles from redux to format needed for select input
  const options = roles.map((role) => ({
    value: role.name,
    label: role.name,
  }));

  // Fetch roles on component mount
  useEffect(() => {
    dispatch(fetchRolesAction());
  }, [dispatch]);

  // Custom styles to match your UI theme
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'transparent',
      borderColor: state.isFocused 
        ? '#3C50E0' 
        : (errors ? '#FF0000' : '#E2E8F0'), // Add error state coloring
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#3C50E0'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      color: 'black'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3C50E0' : 'white',
      color: state.isSelected ? 'white' : 'black',
      '&:hover': {
        backgroundColor: '#8098F9'
      }
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#EEF2FF',
      color: '#3C50E0'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#3C50E0'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#3C50E0',
      '&:hover': {
        backgroundColor: '#3C50E0',
        color: 'white'
      }
    })
  };

  // Validation function
  const validateRoles = (selectedRoles) => {
    // Check if roles are required and no roles are selected
    return required && (!selectedRoles || selectedRoles.length === 0);
  };

  return (
    <div className="mb-4.5">
      <label className="mb-2.5 block font-medium text-black dark:text-white">
        {label} <span className="text-meta-1">*</span>
      </label>

      <div className="relative">
        <Select
          options={options}
          name={name}
          isMulti
          isClearable
          isDisabled={disabled}
          onChange={(selectedOptions) => {
            // Ensure action is called with selected options
            action && action(selectedOptions);
          }}
          value={value} // Use controlled component pattern
          defaultValue={defaultValue}
          styles={customStyles}
          placeholder="Select user roles"
          noOptionsMessage={() => "No roles available"}
          className={className}
        />
      </div>
      
      {/* Error handling */}
      {(errors || (required && validateRoles(value))) && (
        <div className="text-sm text-meta-1 mt-1">
          {errors || "Role selection is required"}
        </div>
      )}
    </div>
  );
};

export default RolesSelectGroup;