import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import swal from 'sweetalert';

// Import actions
import { 
  GetTeamPostsAction, 
  CreateTeamPostAction, 
  AddCommentAction, 
  ToggleLikeAction, 
  DeletePostAction 
} from '../../redux/actions/teamPosts';

const TeamPosts = () => {
  const { teamId } = useParams();
  const dispatch = useDispatch();
  
  const outletContext = useOutletContext() || {};
  const { team = null, isAdmin = () => false } = outletContext;
  
  // Get data from Redux store
  const { user } = useSelector((state) => state.auth || {});
  const { posts } = useSelector((state) => state.teamPosts || { posts: [] });
  const { refresh } = useSelector((state) => state.commons || { refresh: false });
  
  const [isLoading, setIsLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [showCommentFor, setShowCommentFor] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        await dispatch(GetTeamPostsAction(teamId));
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPosts();
  }, [dispatch, teamId]);
  
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && attachments.length === 0) return;
    
    const postData = {
      content: newPost,
      attachments: attachments
    };
    
    const success = await dispatch(CreateTeamPostAction(teamId, postData));
    
    if (success) {
      setNewPost('');
      setAttachments([]);
    }
  };
  
  const handleAddComment = async (postId) => {
    if (!commentText.trim()) return;
    
    const success = await dispatch(AddCommentAction(postId, commentText));
    
    if (success) {
      setCommentText('');
      setShowCommentFor(null);
    }
  };
  
  const handleLikePost = async (postId) => {
    await dispatch(ToggleLikeAction(postId));
  };
  
  const handleDeletePost = async (postId) => {
    swal({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this post!",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then(async (willDelete) => {
      if (willDelete) {
        await dispatch(DeletePostAction(postId));
      }
    });
  };
  
  // Handle file input change for attachments
  const handleFileInput = (e, type) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Process each file
    const newAttachments = files.map(file => {
      const isImage = file.type.startsWith('image/');
      
      return {
        type: isImage ? 'image' : 'file',
        file, // Store the actual file for upload
        name: file.name,
        url: isImage ? URL.createObjectURL(file) : '#' // Create a preview URL for images
      };
    });
    
    setAttachments([...attachments, ...newAttachments]);
  };
  
  // Remove an attachment
  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };
  
  const formatDate = (date) => {
    return moment(date).fromNow();
  };
  
  // Check if current user has liked a post
  const hasUserLiked = (post) => {
    return post.likes.some(like => 
      like._id === user._id || like === user._id
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex h-80 w-full items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-black dark:text-white">Team Posts</h2>
      
      {/* Create Post Form */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Create Post</h3>
        <form onSubmit={handleCreatePost}>
          <div className="mb-4">
            <textarea
              rows="3"
              className="w-full rounded-sm border border-stroke bg-gray-100 py-3 px-4 text-sm text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark-2 dark:text-white"
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            ></textarea>
          </div>
          
          {/* Display attachments previews */}
          {attachments.length > 0 && (
            <div className="mb-4 space-y-2">
              <h4 className="text-sm font-medium text-black dark:text-white">Attachments:</h4>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative rounded-md border border-stroke p-2 dark:border-strokedark">
                    {attachment.type === 'image' ? (
                      <div className="overflow-hidden rounded-md">
                        <img 
                          src={attachment.url} 
                          alt={attachment.name} 
                          className="h-32 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <svg
                            className="h-5 w-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <span className="text-sm text-black dark:text-white truncate">
                          {attachment.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-md"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label
                className="flex cursor-pointer items-center gap-2 rounded-md border border-stroke py-2 px-4 text-sm font-medium text-black hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:text-white"
              >
                <svg
                  className="h-5 w-5 text-body-color"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Add Image
                <input 
                  type="file" 
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileInput(e, 'image')}
                  multiple
                />
              </label>
              
              <label
                className="flex cursor-pointer items-center gap-2 rounded-md border border-stroke py-2 px-4 text-sm font-medium text-black hover:border-primary hover:bg-primary/5 dark:border-strokedark dark:text-white"
              >
                <svg
                  className="h-5 w-5 text-body-color"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Attach File
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileInput(e, 'file')}
                  multiple
                />
              </label>
            </div>
            
            <button
              type="submit"
              disabled={!newPost.trim() && attachments.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-60"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Post
            </button>
          </div>
        </form>
      </div>
      
      {/* Posts List */}
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post._id}
              className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
            >
              {/* Post Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10">
                    {post.author.picture ? (
                      <img
                        src={post.author.picture}
                        alt={post.author.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-primary">
                        {post.author.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-black dark:text-white">
                      {post.author.fullName}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
                
                {/* Actions dropdown (visible only for post author or team admin) */}
                {(post.author._id === user._id || isAdmin()) && (
                  <div className="relative">
                    <button 
                      className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
                      onClick={() => handleDeletePost(post._id)}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Post Content */}
              <div className="mb-4">
                <p className="text-sm text-black dark:text-white">
                  {post.content}
                </p>
              </div>
              
              {/* Post Attachments */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="mb-4 space-y-3">
                  {post.attachments.map((attachment, index) => (
                    attachment.type === 'image' ? (
                      <div key={index} className="overflow-hidden rounded-lg">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-auto"
                        />
                      </div>
                    ) : (
                      <div key={index} className="flex items-center gap-3 rounded-md border border-stroke bg-gray-100 p-3 dark:border-strokedark dark:bg-boxdark-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <svg
                            className="h-5 w-5 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h6 className="text-sm font-medium text-black dark:text-white">
                            {attachment.name}
                          </h6>
                          <a
                            href={attachment.url}
                            download
                            className="text-xs text-primary hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
              
              {/* Post Actions */}
              <div className="flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleLikePost(post._id)}
                    className={`flex items-center gap-1 text-sm font-medium ${
                      hasUserLiked(post) 
                        ? 'text-primary' 
                        : 'text-black hover:text-primary dark:text-white dark:hover:text-primary'
                    }`}
                  >
                    <svg
                      className="h-5 w-5"
                      fill={hasUserLiked(post) ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                      />
                    </svg>
                    <span className="text-sm">{post.likes?.length || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => setShowCommentFor(post._id)}
                    className="flex items-center gap-1 text-sm font-medium text-black hover:text-primary dark:text-white dark:hover:text-primary"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <span className="text-sm">{post.comments?.length || 0}</span>
                  </button>
                </div>
                
                <button className="flex items-center gap-1 text-sm font-medium text-black hover:text-primary dark:text-white dark:hover:text-primary">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
              </div>
              
              {/* Post Comments */}
              {post.comments && post.comments.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h6 className="text-sm font-medium text-black dark:text-white">
                    Comments
                  </h6>
                  
                  {post.comments.map((comment) => (
                    <div
                      key={comment._id}
                      className="rounded-md bg-gray-100 p-3 dark:bg-boxdark-2"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10">
                          {comment.author.picture ? (
                            <img
                              src={comment.author.picture}
                              alt={comment.author.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-primary">
                              {comment.author.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h6 className="text-sm font-medium text-black dark:text-white">
                            {comment.author.fullName}
                          </h6>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-black dark:text-white">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Comment Form */}
              {showCommentFor === post._id && (
                <div className="mt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10">
                      {user?.picture ? (
                        <img
                          src={user.picture}
                          alt={user.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-primary">
                          {user?.fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="w-full rounded-md border border-stroke bg-gray-100 py-2 px-4 text-sm text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-boxdark-2 dark:text-white"
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button
                      onClick={() => handleAddComment(post._id)}
                      className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-60"
                      disabled={!commentText.trim()}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <svg
              className="mb-2 h-16 w-16 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p className="mb-2 text-xl font-medium text-black dark:text-white">No posts yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Be the first to post in this team!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPosts;