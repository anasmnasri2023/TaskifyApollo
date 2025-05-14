import React, { useEffect, useState } from "react";
import InputGroup from "./form/InputGroup";
import RolesSelectGroup from "./form/RolesSelectGroup";
import SkillsSelectGroup from "./form/SkillsSelectGroup";
import { useDispatch, useSelector } from "react-redux";
import { AddUser, UpdateUser } from "../redux/actions/users";
import { _FindOneUser } from "../redux/reducers/users";
import { setRefresh } from "../redux/reducers/commons";

const UserPopup = (props) => {
  const { refresh } = useSelector((state) => state.commons);
  const [form, setForm] = useState({});
  const dispatch = useDispatch();
  const { content } = useSelector((state) => state.errors);
  const { _ONE } = useSelector((state) => state.users);
  const [formHeading, setFormHeading] = useState("Add New User");

  const OnChangeHandler = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Handler for roles selection
  const OnChangeRoles = (selectedRoles) => {
    setForm({
      ...form,
      roles: selectedRoles,
    });
  };

  // Handler for skills selection
  const OnChangeSkills = (selectedSkills) => {
    setForm({
      ...form,
      skills: selectedSkills,
    });
  };

  useEffect(() => {
    setForm(_ONE);
    // Set heading based on whether we're adding or editing
    if (Object.keys(_ONE).length > 0) {
      setFormHeading("Edit User Profile");
    } else {
      setFormHeading("Add New User");
    }
  }, [_ONE]);

  const onSubmitHandler = (e) => {
    e.preventDefault();
    
    // Format both roles and skills data before sending
    const formattedData = {
      ...form,
      // Convert roles from array of objects to array of strings if needed
      roles: form.roles ? 
        (Array.isArray(form.roles) ? 
          form.roles.map(role => typeof role === 'object' ? role.value : role) : 
          [form.roles]) : 
        [],
      // Convert skills from array of objects to array of strings if needed
      skills: form.skills ? 
        (Array.isArray(form.skills) ? 
          form.skills.map(skill => typeof skill === 'object' ? skill.value : skill) : 
          [form.skills]) : 
        []
    };
    
    // For debugging - check what's being sent
    console.log("Submitting form data:", formattedData);
    
    if (!Object.keys(_ONE).length > 0) {
      // Make sure password is included for new users
      if (!formattedData.password) {
        alert("Password is required for new users");
        return;
      }
      dispatch(AddUser(formattedData, props.setPopupOpen));
    } else {
      dispatch(UpdateUser(formattedData, _ONE?._id, props.setPopupOpen));
    }
  };
  
  return (
    <div
      className={`fixed left-0 top-0 z-99999 flex h-screen w-full justify-center items-center backdrop-blur-sm bg-black/70 px-4 py-5 ${
        props.popupOpen === true ? "block" : "hidden"
      }`}
    >
      <div 
        className="relative w-full max-w-180 bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark shadow-2xl overflow-hidden transform transition-all duration-300 dark:bg-meta-4"
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
        }}
      >
        {/* Form Header */}
        <div className="bg-gray-50 dark:bg-meta-3 px-8 py-4 border-b border-stroke dark:border-strokedark flex justify-between items-center">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {formHeading}
          </h3>
          <button
            onClick={() => {
              props.setPopupOpen(false);
              dispatch(_FindOneUser({}));
              setTimeout(() => {
                dispatch(setRefresh(false));
              }, 2000);
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-meta-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmitHandler} className="p-8">
          {!refresh ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <p className="text-sm text-body dark:text-bodydark mb-6">
                  {Object.keys(_ONE).length > 0 
                    ? "Update the user information below" 
                    : "Please fill in the details to create a new user"}
                </p>
              </div>
              
              {/* Personal Info Section */}
              <div className="space-y-5">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2 mb-3">
                  Personal Information
                </h4>
                
                <InputGroup
                  label={"Full Name"}
                  name={"fullName"}
                  type={"text"}
                  placeholder={"Enter full name"}
                  required={true}
                  action={OnChangeHandler}
                  errors={content?.fullName ?? ""}
                  defaultValue={form?.fullName ?? ""}
                />
                
                <InputGroup
                  label={"Email Address"}
                  name={"email"}
                  type={"email"}
                  placeholder={"email@example.com"}
                  required={true}
                  action={OnChangeHandler}
                  errors={content?.email ?? ""}
                  defaultValue={form?.email ?? ""}
                />
                
                <InputGroup
                  label={"Phone Number"}
                  name={"phone"}
                  type={"phone"}
                  placeholder={"+1 (555) 123-4567"}
                  required={true}
                  action={OnChangeHandler}
                  errors={content?.phone ?? ""}
                  defaultValue={form?.phone ?? ""}
                />
                
                {/* Add password field for new users */}
                {!Object.keys(_ONE).length > 0 && (
                  <div className="mb-1">
                    <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                      Password <span className="text-meta-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="password"
                        placeholder="Enter secure password"
                        required
                        onChange={OnChangeHandler}
                        className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-5 pr-10 text-black dark:text-white outline-none transition focus:border-primary focus:ring-1 focus:ring-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      />
                      <span className="absolute right-4 top-3.5 text-gray-500">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                    {content?.password && (
                      <p className="mt-1 text-sm text-meta-1">{content.password}</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Roles and Skills Section */}
              <div className="space-y-5">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b pb-2 mb-3">
                  Roles & Skills
                </h4>
                
                {/* Using the specialized RolesSelectGroup */}
                <RolesSelectGroup
                  label="User Roles"
                  name="roles"
                  required={true}
                  action={OnChangeRoles}
                  errors={content?.roles ?? ""}
                  defaultValue={form?.roles || []}
                />
                
                {/* Using the SkillsSelectGroup */}
                <SkillsSelectGroup
                  label="User Skills"
                  name="skills"
                  required={false}
                  action={OnChangeSkills}
                  errors={content?.skills ?? ""}
                  defaultValue={form?.skills || []}
                  maxSkills={10}
                />
              </div>
              
              {/* Submit Button - Full Width */}
              <div className="md:col-span-2 mt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      props.setPopupOpen(false);
                      dispatch(_FindOneUser({}));
                    }}
                    className="py-3 px-6 rounded-lg border border-stroke text-body dark:text-bodydark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                  >
                    {Object.keys(_ONE).length > 0 ? "Update User" : "Create User"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="w-full max-w-[400px] mx-auto">
                <div className="space-y-5 rounded-xl bg-white/5 p-4 shadow-xl animate-pulse">
                  <div className="bg-gray-200 dark:bg-boxdark-2 h-24 rounded-lg"></div>
                  <div className="space-y-3">
                    <div className="bg-gray-200 dark:bg-boxdark-2 h-3 w-3/5 rounded-lg"></div>
                    <div className="bg-gray-200 dark:bg-boxdark-2 h-3 w-4/5 rounded-lg"></div>
                    <div className="bg-gray-200 dark:bg-boxdark-2 h-3 w-2/5 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserPopup;