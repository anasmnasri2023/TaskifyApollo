import React, { useState, useEffect } from "react";
import Select from "react-select";
import { useSelector, useDispatch } from "react-redux";
import { GetProjectsAction } from "../../redux/reducers/projects";
import { MOCK_DATA } from "../../data/mock";

const SelectGroup = ({
  label,
  name,
  disabled,
  errors,
  action,
  required,
  defaultValue,
  options,
  className,
  isMulti,
  loading,
  mode,
}) => {
  const dispatch = useDispatch();
  const { projects, loading: projectsLoading } = useSelector((state) => state.projects);
  const [projectOptions, setProjectOptions] = useState([]);

  useEffect(() => {
    if (name === "project") {
      // Dispatch action to fetch projects
      dispatch(GetProjectsAction());

      // Always set mock data initially
      const mockOptions = MOCK_DATA.map((p) => ({
        value: p.project_id.toString(),
        label: p.project_name,
        details: {
          manager: p.project_manager,
          status: p.status,
          priority: p.priority,
          clientName: p.client_name,
        },
      }));

      console.log("SelectGroup - Setting initial mock project options:", mockOptions);
      setProjectOptions(mockOptions);
    }
  }, [dispatch, name]);

  useEffect(() => {
    if (name === "project") {
      // If backend projects exist, update options
      if (projects && projects.length > 0) {
        const backendOptions = projects.map((project) => ({
          value: project._id,
          label: project.project_name,
          details: {
            manager: project.project_manager,
            status: project.status,
            priority: project.priority,
          },
        }));

        console.log("SelectGroup - Setting backend project options:", backendOptions);
        // Replace this line to ensure we have all projects from both sources
        setProjectOptions([...backendOptions]);
      }
    }
  }, [projects, name]);

  // Log defaultValue when it changes to debug project selection issues
  useEffect(() => {
    if (name === "project" && defaultValue) {
      console.log(`SelectGroup - Project defaultValue changed:`, defaultValue);
    }
  }, [defaultValue, name]);

  const selectOptions = name === "project" ? projectOptions : options;

  // Additional logging for project selection
  const handleChange = (selectedOption) => {
    if (name === "project") {
      console.log("SelectGroup - Project selection changed:", selectedOption);
    }
    action(selectedOption);
  };

  return (
    <div className="mb-4.5">
      <label className="mb-2.5 block font-medium text-black dark:text-white">
        {label} {required && <span className="text-meta-1">*</span>}
      </label>
      <div className="relative">
        <Select
          options={selectOptions}
          name={name}
          isClearable={true}
          isDisabled={disabled}
          onChange={handleChange}
          defaultValue={defaultValue}
          isLoading={name === "project" ? projectsLoading : !options?.length}
          isMulti={isMulti}
          className={
            className
              ? className
              : `relative z-20 w-full appearance-none rounded border border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary`
          }
        />
        {errors && <div className="text-sm text-red">{errors}</div>}
      </div>
    </div>
  );
};

export default SelectGroup;