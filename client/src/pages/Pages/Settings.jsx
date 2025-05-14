import React, { useEffect, useState } from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { useDispatch, useSelector } from "react-redux";
import InputGroup from "../../components/form/InputGroup";
import { UpdateMyProfile, UploadProfileImage } from "../../redux/actions/users";
import { useForm } from "react-hook-form";
import { setErrors } from "../../redux/reducers/errors";
import axios from "axios";
import { _setCurrentUser } from "../../redux/reducers/users";
import SkillsSelectGroup from "../../components/form/SkillsSelectGroup";

const Settings = () => {
  const { _CURRENT } = useSelector((state) => state.users);
  const [form, setForm] = useState({});
  const dispatch = useDispatch();
  const { content } = useSelector((state) => state.errors);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For the profile image upload
  const { register, handleSubmit, watch, errors: formErrors } = useForm();
  const file = watch("picture");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // State for selected skills
  const [selectedSkills, setSelectedSkills] = useState([]);

  useEffect(() => {
    // Initialize form with current user data
    setForm({
      fullName: _CURRENT?.fullName || "",
      phone: _CURRENT?.phone || "",
      email: _CURRENT?.email || "",
    });

    // Initialize skills if they exist
    if (_CURRENT?.skills && Array.isArray(_CURRENT.skills)) {
      const formattedSkills = _CURRENT.skills.map(skill => ({
        value: skill,
        label: skill
      }));
      setSelectedSkills(formattedSkills);
    }
  }, [_CURRENT]);

  // Create a preview when a new file is selected
  useEffect(() => {
    if (file && file.length > 0) {
      setPreviewUrl(URL.createObjectURL(file[0]));
    }
  }, [file]);

  // Handle form field changes
  const OnChangeHandler = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Handle skills selection changes
  const handleSkillsChange = (selectedOptions) => {
    setSelectedSkills(selectedOptions || []);
  };

  // Handle profile information form submission
  const onSubmitHandler = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Get skill values only
    const skillValues = selectedSkills.map(skill => skill.value);
    
    // Create the final form data
    const updatedForm = {
      ...form,
      skills: skillValues
    };
    
    console.log("Submitting form with skills:", updatedForm);
    
    dispatch(UpdateMyProfile(updatedForm))
      .then(() => {
        setIsSubmitting(false);
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  };

  // Handle photo upload form submission
  const onSubmitImage = async (data) => {
    if (!data.picture || data.picture.length === 0) {
      dispatch(setErrors({ picture: "Please select an image to upload" }));
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append("picture", data.picture[0]);
      
      // Upload via redux action
      await dispatch(UploadProfileImage(formData));
      
      // Clear the preview
      setPreviewUrl(null);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to display the profile image correctly
  const displayProfileImage = () => {
    // If we have a preview from a new file selection, show that
    if (previewUrl) {
      return previewUrl;
    }
    
    // If user has an existing picture, properly handle Cloudinary URLs
    if (_CURRENT?.picture) {
      // Check if it's a Cloudinary URL (contains cloudinary.com)
      if (_CURRENT.picture.includes('cloudinary.com')) {
        return _CURRENT.picture;
      }
      
      // Fall back to local server path if not a Cloudinary URL
      return `http://localhost:5500/${_CURRENT.picture}`;
    }
    
    // Default placeholder image
    return '/placeholder-profile.png';
  };

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Settings" />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Personal Information
                </h3>
              </div>
              <div className="p-7">
                <form onSubmit={onSubmitHandler}>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="fullName"
                      >
                        Full Name
                      </label>

                      <InputGroup
                        name="fullName"
                        type="text"
                        placeholder="Enter Full Name"
                        defaultValue={form?.fullName ?? ""}
                        action={OnChangeHandler}
                        errors={content.fullName}
                        className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      />
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="phoneNumber"
                      >
                        Phone Number
                      </label>
                      <InputGroup
                        name="phone"
                        type="text"
                        placeholder="Enter Phone number"
                        defaultValue={form?.phone ?? ""}
                        action={OnChangeHandler}
                        errors={content.phone}
                        className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="emailAddress"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <InputGroup
                        name="email"
                        type="email"
                        placeholder="Enter Email"
                        defaultValue={form?.email ?? ""}
                        action={OnChangeHandler}
                        errors={content.email}
                        className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Skills Selection Component */}
                  <div className="mb-5.5">
                    <SkillsSelectGroup
                      label="Professional Skills"
                      name="skills"
                      defaultValue={selectedSkills}
                      action={handleSkillsChange}
                      errors={content.skills}
                      maxSkills={10}
                    />
                  </div>

                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded bg-primary px-6 py-2 font-medium text-gray hover:shadow-1"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-7 py-4 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Your Photo
                </h3>
              </div>
              <div className="p-7">
                <form onSubmit={handleSubmit(onSubmitImage)}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full overflow-hidden">
                      <img
                        src={displayProfileImage()}
                        className="h-full w-full object-cover"
                        alt="User"
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 text-black dark:text-white">
                        Edit your photo
                      </span>
                    </div>
                  </div>

                  <div
                    id="FileUpload"
                    className="relative mb-5.5 block w-full cursor-pointer appearance-none rounded border-2 border-dashed border-primary bg-gray px-4 py-4 dark:bg-meta-4 sm:py-7.5"
                  >
                    <input
                      type="file"
                      name="picture"
                      accept="image/*"
                      {...register("picture", { required: true })}
                      className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-none"
                    />

                    {previewUrl && (
                      <div className="flex justify-center">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}

                    {!previewUrl && (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M1.99967 9.33337C2.36786 9.33337 2.66634 9.63185 2.66634 10V12.6667C2.66634 12.8435 2.73658 13.0131 2.8616 13.1381C2.98663 13.2631 3.1562 13.3334 3.33301 13.3334H12.6663C12.8431 13.3334 13.0127 13.2631 13.1377 13.1381C13.2628 13.0131 13.333 12.8435 13.333 12.6667V10C13.333 9.63185 13.6315 9.33337 13.9997 9.33337C14.3679 9.33337 14.6663 9.63185 14.6663 10V12.6667C14.6663 13.1971 14.4556 13.7058 14.0806 14.0809C13.7055 14.456 13.1968 14.6667 12.6663 14.6667H3.33301C2.80257 14.6667 2.29387 14.456 1.91879 14.0809C1.54372 13.7058 1.33301 13.1971 1.33301 12.6667V10C1.33301 9.63185 1.63148 9.33337 1.99967 9.33337Z"
                              fill="#3C50E0"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M7.5286 1.52864C7.78894 1.26829 8.21106 1.26829 8.4714 1.52864L11.8047 4.86197C12.0651 5.12232 12.0651 5.54443 11.8047 5.80478C11.5444 6.06513 11.1223 6.06513 10.8619 5.80478L8 2.94285L5.13807 5.80478C4.87772 6.06513 4.45561 6.06513 4.19526 5.80478C3.93491 5.54443 3.93491 5.12232 4.19526 4.86197L7.5286 1.52864Z"
                              fill="#3C50E0"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M7.99967 1.33337C8.36786 1.33337 8.66634 1.63185 8.66634 2.00004V10C8.66634 10.3682 8.36786 10.6667 7.99967 10.6667C7.63148 10.6667 7.33301 10.3682 7.33301 10V2.00004C7.33301 1.63185 7.63148 1.33337 7.99967 1.33337Z"
                              fill="#3C50E0"
                            />
                          </svg>
                        </span>
                        <p>
                          <span className="text-secondary">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="mt-1.5">SVG, PNG, JPG or GIF</p>
                        <p>(max, 800 X 800px)</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="button"
                      onClick={() => setPreviewUrl(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-70"
                      type="submit"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Settings;