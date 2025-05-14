import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AddCommentAction,
  DeleteCommentAction,
  FindOneTaskAction,
} from "../redux/actions/tasks";
import axios from "axios";
import Swal from "sweetalert2"; // Import SweetAlert2

// List of bad words - keeping only essential ones for filtering
const badWords = [
  "fuck",
  "shit",
  "bitch",
  "ass",
  "dick",
  "merde",
  "putain",
  "salope",
];

// Enhanced trigger phrases for English and French (unchanged)
const triggerPhrases = {
  hello: {
    label: "Greeting (EN)",
    options: [
      "Hello! Any updates on this task?",
      "Hey there, how's the progress?",
      "Hi, quick check-in on this task.",
    ],
  },
  // ... rest of triggerPhrases unchanged
};

// Custom hook for comment suggestions (unchanged)
const useCommentSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [commentInput, setCommentInput] = useState("");

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setCommentInput(val);

    console.log("Comment input:", val);

    const lastWord = val
      .trim()
      .split(/\s+/)
      .pop()?.toLowerCase() || "";
    const matchedPhrases = Object.entries(triggerPhrases)
      .filter(([key]) => lastWord.includes(key))
      .flatMap(([, phraseObj]) => phraseObj.options);

    console.log("Matched phrases:", matchedPhrases);

    setSuggestions(matchedPhrases.length > 0 ? matchedPhrases : []);
  }, []);

  const applySuggestion = useCallback((suggestion) => {
    setCommentInput((prev) => `${prev.trim()} ${suggestion}`);
    setSuggestions([]);
  }, []);

  return {
    commentInput,
    suggestions,
    handleInputChange,
    applySuggestion,
    setCommentInput,
  };
};

const CommentPopup = ({ popupOpen, setPopupOpen, taskId, task }) => {
  const [taskBasicInfo, setTaskBasicInfo] = useState(task || null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [localComments, setLocalComments] = useState([]);
  const [optimisticCommentId, setOptimisticCommentId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [taskDetailsLoading, setTaskDetailsLoading] = useState(false);
  const [selectedfile, setselectedfile] = useState(null);

  const dispatch = useDispatch();
  const { content } = useSelector((state) => state.errors);
  const { _ONE } = useSelector((state) => state.tasks);
  const { refresh } = useSelector((state) => state.commons);
  const { user } = useSelector((state) => state.auth);

  const fileInputRef = useRef();
  const {
    commentInput,
    suggestions,
    handleInputChange,
    applySuggestion,
    setCommentInput,
  } = useCommentSuggestions();

  const effectiveTaskId = taskId || (_ONE && _ONE._id);

  // Function to check for bad words
  const containsBadWords = (text) => {
    const words = text.toLowerCase().split(/\s+/);
    return words.some((word) => badWords.includes(word));
  };

  // Load task details and comments when popup opens (unchanged)
  useEffect(() => {
    if (popupOpen && effectiveTaskId) {
      if (task) {
        console.log("Using task data from props:", task);
        setTaskBasicInfo(task);
        setForm(task);
      } else {
        console.log("Loading data for task:", effectiveTaskId);
        setTaskDetailsLoading(true);

        dispatch(FindOneTaskAction(effectiveTaskId))
          .then((action) => {
            console.log("Task fetch completed:", action.payload);
            if (action.payload) {
              setTaskBasicInfo(action.payload);
              setForm(action.payload);
              console.log("Task title:", action.payload.title, "Task ID:", action.payload._id);
            }
          })
          .catch((error) => {
            console.error("Failed to fetch task details:", error);
          })
          .finally(() => {
            setTaskDetailsLoading(false);
          });
      }

      loadTaskComments(effectiveTaskId);
    }
  }, [popupOpen, effectiveTaskId, task, dispatch]);

  // Load task info from Redux if available (unchanged)
  useEffect(() => {
    if (_ONE && typeof _ONE === "object" && _ONE._id) {
      setTaskBasicInfo(_ONE);
    }
  }, [_ONE]);

  // Check if the comment belongs to the current user (unchanged)
  const isUserOwnComment = (comment) => {
    if (
      comment &&
      comment._id &&
      typeof comment._id === "string" &&
      comment._id.startsWith("temp-")
    ) {
      return true;
    }

    if (!user || !user.id || !comment.by) {
      return false;
    }

    if (typeof comment.by === "object" && comment.by._id) {
      return String(comment.by._id) === String(user.id);
    } else if (typeof comment.by === "string") {
      return String(comment.by) === String(user.id);
    }

    return false;
  };

  // Load task comments (unchanged)
  const loadTaskComments = async (id) => {
    setInitialLoading(true);

    try {
      const response = await axios.get(`/api/tasks/${id}/comments`);

      if (response.data && response.data.comments) {
        console.log("Comments loaded successfully:", response.data.comments);
        setLocalComments(response.data.comments);
      } else {
        console.log("No comments returned from API");
        setLocalComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);

      if (_ONE && Array.isArray(_ONE.comments)) {
        console.log("Using comments from existing task data:", _ONE.comments);
        setLocalComments(_ONE.comments);
      } else {
        setLocalComments([]);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmitHandler = (e) => {
    e.preventDefault();

    if (!effectiveTaskId) {
      console.error("Cannot add comment: No task ID available");
      return;
    }

    if (!commentInput || commentInput.trim() === "") {
      return;
    }

    // Check for bad words
    if (containsBadWords(commentInput)) {
      Swal.fire({
        icon: "warning",
        title: "Inappropriate Content",
        text: "Your comment contains inappropriate language. Please revise and try again.",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
      return;
    }

    console.log("Submitting comment for task:", effectiveTaskId);
    setLoading(true);

    const tempId = `temp-${Date.now()}`;
    setOptimisticCommentId(tempId);

    const optimisticComment = {
      _id: tempId,
      content: commentInput,
      by:
        user || {
          fullName: "You",
          email: "",
          picture: null,
        },
      createdAt: new Date(),
      image: selectedfile ? URL.createObjectURL(selectedfile) : null,
    };

    setLocalComments((prev) => [...prev, optimisticComment]);
    setCommentInput("");

    const commentData = {
      comment: commentInput,
      file: selectedfile,
    };

    dispatch(AddCommentAction(commentData, effectiveTaskId))
      .then(() => {
        console.log("Comment added successfully");
        setselectedfile(null);
        setLoading(false);
        setOptimisticCommentId(null);
        loadTaskComments(effectiveTaskId);
      })
      .catch((error) => {
        console.error("Error adding comment:", error);
        setLoading(false);
        setLocalComments((prev) =>
          prev.map((comment) =>
            comment._id === tempId ? { ...comment, failed: true } : comment
          )
        );
      });
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not set";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Not set";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Not set";
    }
  };

  const fixImageUrl = (url) => {
    if (!url) {
      console.log("No URL provided for fixImageUrl");
      return "/assets/images/user/user-default.png";
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      console.log("URL already absolute:", url);
      return url;
    }

    if (url.startsWith("/uploads/")) {
      const fullUrl = `http://localhost:5500${url}`;
      console.log("Constructed upload URL:", fullUrl);
      return fullUrl;
    }

    const fullUrl = `http://localhost:5500${url.startsWith("/") ? "" : "/"}${url}`;
    console.log("Constructed fallback URL:", fullUrl);
    return fullUrl;
  };

  const handleDeleteComment = (commentId, comment) => {
    if (commentId.startsWith("temp-")) {
      setLocalComments((prev) => prev.filter((c) => c._id !== commentId));
      return;
    }

    const isMyComment =
      user &&
      comment.by &&
      user.id &&
      ((typeof comment.by === "object" && String(comment.by._id) === String(user.id)) ||
        (typeof comment.by === "string" && String(comment.by) === String(user.id)));

    const isAdmin = user && user.roles && user.roles.includes("ADMIN");

    if (!isMyComment && !isAdmin) {
      Swal.fire({
        icon: "error",
        title: "Permission Denied",
        text: "You can only delete your own comments",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
      return;
    }

    dispatch(DeleteCommentAction(effectiveTaskId, commentId))
      .then(() => {
        setLocalComments((prev) => prev.filter((c) => c._id !== commentId));
      })
      .catch((error) => {
        console.error("Error deleting comment:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete comment. Please try again.",
          confirmButtonText: "OK",
          confirmButtonColor: "#d33",
        });
      });
  };

  const hasTaskData = _ONE || taskBasicInfo;
  const taskData = taskBasicInfo || _ONE;

  const getAssignees = () => {
    if (!taskData) {
      return [];
    }

    if (taskData.assigns && Array.isArray(taskData.assigns)) {
      return taskData.assigns;
    }

    if (taskData.assignees && Array.isArray(taskData.assignees)) {
      return taskData.assignees;
    }

    return [];
  };

const getProjectName = () => {
  if (!taskData || !taskData.project) {
    return "Project";
  }

  // If project is an object with a name property, use it
  if (typeof taskData.project === "object" && taskData.project.name) {
    return taskData.project.name;
  }

  // If project is an object but only has an ID (or other fields without name)
  if (typeof taskData.project === "object" && taskData.project._id) {
    // Don't display the ID
    return "Project";
  }

  // If project is just a string (likely an ID)
  if (typeof taskData.project === "string") {
    // Check if it looks like a MongoDB ObjectID
    if (isObjectId(taskData.project)) {
      return "Project"; // Don't display the ID
    }
    // If it's not an ID format, it might actually be the project name
    return taskData.project;
  }

  return "Project";
};
  // Helper function to check if a string looks like a MongoDB ObjectID
  const isObjectId = (str) => {
    return str && /^[0-9a-fA-F]{24}$/.test(str);
  };

  // Get display title - if title is an ObjectID, show "Untitled Task"
  const getDisplayTitle = () => {
    if (!taskData.title || isObjectId(taskData.title)) {
      return "Untitled Task";
    }
    return taskData.title;
  };

  return (
    <div
      className={`fixed left-0 top-0 z-99999 flex h-screen w-full justify-center overflow-y-scroll bg-black/80 px-4 py-5 ${
        popupOpen ? "block" : "hidden"
      }`}
    >
      <div className="relative m-auto w-full max-w-4xl rounded-2xl border border-stroke bg-gray p-4 shadow-xl dark:border-strokedark dark:bg-meta-4 sm:p-8 xl:p-10">
        <button
          onClick={() => setPopupOpen(false)}
          className="absolute right-1 top-1 sm:right-5 sm:top-5"
        >
          <svg
            className="fill-current"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.8913 9.99599L19.5043 2.38635C20.032 1.85888 20.032 1.02306 19.5043 0.495589C18.9768 -0.0317329 18.141 -0.0317329 17.6135 0.495589L10.0001 8.10559L2.38673 0.495589C1.85917 -0.0317329 1.02343 -0.0317329 0.495873 0.495589C-0.0318274 1.02306 -0.0318274 1.85888 0.495873 2.38635L8.10887 9.99599L0.495873 17.6056C-0.0318274 18.1331 -0.0318274 18.9689 0.495873 19.4964C0.717307 19.7177 1.05898 19.9001 1.4413 19.9001C1.75372 19.9001 2.13282 19.7971 2.40606 19.4771L10.0001 11.8864L17.6135 19.4964C17.8349 19.7177 18.1766 19.9001 18.5589 19.9001C18.8724 19.9001 19.2531 19.7964 19.5265 19.4737C20.0319 18.9452 20.0245 18.1256 19.5043 17.6056L11.8913 9.99599Z"
              fill=""
            />
          </svg>
        </button>

        <div className="flex flex-col gap-6">
          {/* Task Details Section */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            {taskDetailsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : !taskData ? (
              <div className="text-center py-10">
                <p className="text-gray-500">Task not found or still loading</p>
              </div>
            ) : (
              <>
                <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">
                  {getDisplayTitle()}
                  {(loading || refresh) && (
                    <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                  )}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800">
                        {getProjectName()}
                      </span>
                      {taskData.status && (
                        <span
                          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                            taskData.status === "1"
                              ? "bg-gray-100 text-gray-800"
                              : taskData.status === "2"
                              ? "bg-yellow-100 text-yellow-800"
                              : taskData.status === "3"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {taskData.status === "1"
                            ? "Todo"
                            : taskData.status === "2"
                            ? "In Progress"
                            : taskData.status === "3"
                            ? "Completed"
                            : "Unknown"}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {taskData.description || "No description provided"}
                      </p>
                    </div>

                    {taskData.attachment && taskData.attachment.path ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Attachment
                        </h3>
                        <div className="mt-2">
                          <a
                            href={fixImageUrl(taskData.attachment.path)}
                            download={taskData.attachment.originalname || "attachment"}
                            className="flex items-center gap-2 rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-opacity-90"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            {taskData.attachment.originalname || "Download"}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Attachment
                        </h3>
                        <p className="text-sm text-gray-500">No attachment available</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Timeline
                      </h3>
                      <div className="mt-1 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Start: {formatDate(taskData.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>End: {formatDate(taskData.end_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Assignees
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {getAssignees().length > 0 ? (
                          getAssignees().map((assignee, index) => (
                            <div
                              key={assignee._id || index}
                              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full"
                            >
                              <img
                                src={
                                  assignee.picture?.includes("https")
                                    ? assignee.picture
                                    : `http://localhost:5500/${
                                        assignee.picture || "assets/images/user/user-default.png"
                                      }`
                                }
                                alt={assignee.fullName || "Assignee"}
                                className="h-6 w-6 rounded-full"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/assets/images/user/user-default.png";
                                }}
                              />
                              <span className="text-sm">{assignee.fullName || "Unknown"}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No assignees</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Comments Section */}
          <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Comments & Discussion
              {initialLoading && (
                <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
              )}
            </h3>

            {/* Comments List */}
            <div className="mb-6 max-h-96 space-y-4 overflow-y-auto">
              {initialLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
                  <p className="text-gray-500">Loading comments...</p>
                </div>
              ) : localComments && localComments.length > 0 ? (
                localComments.map((c) => {
                  const isOwnComment = isUserOwnComment(c);
                  const isAdmin = user && user.roles && user.roles.includes("ADMIN");
                  const canDelete = isOwnComment || isAdmin;

                  return (
                    <div
                      key={c._id}
                      className={`rounded-lg border border-stroke p-4 dark:border-strokedark 
                        ${c._id === optimisticCommentId ? "bg-blue-50 dark:bg-blue-900/10" : ""} 
                        ${c.failed ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={fixImageUrl(c.by?.picture)}
                            alt="User"
                            className="h-10 w-10 rounded-full"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/assets/images/user/user-default.png";
                            }}
                          />
                          <div>
                            <h4 className="font-medium text-black dark:text-white">
                              {c.by?.fullName || "You"}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {formatDate(c.createdAt)}
                              {c.failed && <span className="ml-2 text-red-500">Failed to send</span>}
                              {c._id === optimisticCommentId && (
                                <span className="ml-2 text-blue-500">Sending...</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={canDelete ? () => handleDeleteComment(c._id, c) : undefined}
                          className={`${
                            canDelete
                              ? "text-red-500 hover:text-red-600"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                          title={
                            canDelete ? "Delete comment" : "You can only delete your own comments"
                          }
                          disabled={!canDelete}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-3">
                        <p className="text-gray-700 dark:text-gray-300">{c.content}</p>
                        {c.image && (
                          <div className="mt-2">
                            <img
                              src={
                                typeof c.image === "string"
                                  ? c.image
                                  : URL.createObjectURL(c.image)
                              }
                              alt="Comment attachment"
                              className="max-h-40 rounded-md"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg
                    className="mb-3 h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-gray-500">No comments yet</p>
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <div className="sticky bottom-0 border-t border-stroke bg-white px-6 py-5 dark:border-strokedark dark:bg-boxdark">
              <form className="flex flex-col gap-4" onSubmit={onSubmitHandler}>
                <div className="flex w-full items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      name="comment"
                      value={commentInput}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="Type something here / Tapez quelque chose ici"
                      className="h-13 w-full rounded-md border border-stroke bg-gray pl-5 pr-19 text-black placeholder-body outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-white"
                    />
                    <div
                      className="absolute right-5 top-1/2 inline-flex -translate-y-1/2 items-center justify-end space-x-4"
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                    >
                      <button type="button" className="hover:text-primary">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          className="fill-current"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M11.835 1.79102C11.2378 1.79102 10.6651 2.02824 10.2428 2.45051L3.3503 9.34302C2.64657 10.0467 2.25122 11.0012 2.25122 11.9964C2.25122 12.9917 2.64657 13.9461 3.3503 14.6499C4.05403 15.3536 5.0085 15.7489 6.00372 15.7489C6.99895 15.7489 7.95341 15.3536 8.65714 14.6499L15.5496 7.75736C15.8425 7.46446 16.3174 7.46446 16.6103 7.75736C16.9032 8.05025 16.9032 8.52512 16.6103 8.81802L9.7178 15.7105C8.73277 16.6956 7.39677 17.2489 6.00372 17.2489C4.61067 17.2489 3.27468 16.6956 2.28964 15.7105C1.30461 14.7255 0.751221 13.3895 0.751221 11.9964C0.751221 10.6034 1.30461 9.26739 2.28964 8.28236L9.18214 1.38985C9.88572 0.686279 10.84 0.291016 11.835 0.291016C12.83 0.291016 13.7842 0.686279 14.4878 1.38985C15.1914 2.09343 15.5866 3.04768 15.5866 4.04268C15.5866 5.03769 15.1914 5.99194 14.4878 6.69552L7.5878 13.588C7.16569 14.0101 6.59318 14.2473 5.99622 14.2473C5.39926 14.2473 4.82676 14.0101 4.40464 13.588C3.98253 13.1659 3.74539 12.5934 3.74539 11.9964C3.74539 11.3995 3.98253 10.827 4.40464 10.4049L10.7725 4.04454C11.0655 3.75182 11.5404 3.7521 11.8331 4.04517C12.1258 4.33823 12.1256 4.81311 11.8325 5.10583L5.4653 11.4655C5.32469 11.6063 5.24539 11.7974 5.24539 11.9964C5.24539 12.1956 5.32449 12.3865 5.4653 12.5274C5.60611 12.6682 5.79709 12.7473 5.99622 12.7473C6.19535 12.7473 6.38633 12.6682 6.52714 12.5274L13.4271 5.63486C13.8492 5.21261 14.0866 4.63973 14.0866 4.04268C14.0866 3.4455 13.8494 2.87278 13.4271 2.45051C13.0049 2.02824 12.4321 1.79102 11.835 1.79102Z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-13 max-w-13 flex items-center justify-center rounded-md bg-primary text-white hover:bg-opacity-90"
                    disabled={loading || refresh}
                  >
                    {loading || refresh ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" />
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 2L11 13"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M22 2L15 22L11 13L2 9L22 2Z"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Suggestion Chips */}
                {suggestions.length > 0 && (
                  <div className="flex max-h-20 w-full flex-wrap gap-2 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  name="file"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      setselectedfile(e.target.files[0]);
                    } else {
                      setselectedfile(null);
                    }
                  }}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                />

                {content.comment && (
                  <div className="flex justify-start text-sm text-red-500">
                    {content.comment}
                  </div>
                )}

                {selectedfile && (
                  <div className="flex items-center">
                    <img
                      style={{ width: 100, height: 100, objectFit: "contain" }}
                      src={URL.createObjectURL(selectedfile)}
                      alt="Selected attachment"
                      className="rounded"
                    />
                    <button
                      type="button"
                      className="ml-2 text-red-500 hover:text-red-700"
                      onClick={() => setselectedfile(null)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.5 10.1l-1.4 1.4L8 9.4l-2.1 2.1-1.4-1.4L6.6 8 4.5 5.9l1.4-1.4L8 6.6l2.1-2.1 1.4 1.4L9.4 8l2.1 2.1z" />
                      </svg>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentPopup;