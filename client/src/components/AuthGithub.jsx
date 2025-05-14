// Simplified fix for AuthGithub to avoid conflict with Google auth
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch } from "react-redux";
import jwtDecode from "jwt-decode";
import { setErrors } from "../redux/reducers/errors";
import { setUser } from "../redux/reducers/auth";
import { setAuthToken } from "../lib/setAuthToken";
import swal from "sweetalert"; // Make sure this is imported

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

const AuthGithub = () => { 
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);

    // Function to generate a random state parameter
    const generateRandomState = () => {
        return Math.random().toString(36).substring(2, 15);
    };

    // GitHub login function
    function loginWithGithub(e) {
        // Stop event propagation to prevent triggering other events
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        setIsLoading(true);
        
        if (!CLIENT_ID) {
            swal("Error", "GitHub Client ID is not configured", "error");
            setIsLoading(false);
            return;
        }
        
        try {
            // Generate a random state for security
            const state = generateRandomState();
            localStorage.setItem('github_oauth_state', state);
            
            // Request email scope and include state parameter
            const scope = 'user:email';
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${scope}&state=${state}`;
            
            console.log("[GitHub] Redirecting to GitHub OAuth", { url: authUrl });
            window.location.href = authUrl;
        } catch (error) {
            console.error("[GitHub] OAuth redirect error:", error);
            swal("Error", "Failed to connect with GitHub: " + error.message, "error");
            setIsLoading(false);
        }
    }
      
    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const codeParam = urlParams.get('code');
        const stateParam = urlParams.get('state');
        const storedState = localStorage.getItem('github_oauth_state');
        
        // Check if this is a GitHub callback (has code and state matches)
        if (codeParam && stateParam && storedState === stateParam && !localStorage.getItem('token')) {
            // Clear stored state
            localStorage.removeItem('github_oauth_state');
            
            setIsLoading(true);
            
            // Show loading state
            swal({
                title: "Connecting with GitHub",
                text: "Please wait...",
                icon: "info",
                buttons: false,
                closeOnClickOutside: false
            });
            
            async function handleGitHubAuth() {
                try {
                    // Step 1: Get access token
                    const response = await axios.get("/api/getAccessToken", {
                        params: { 
                            code: codeParam,
                            state: stateParam
                        }
                    });
                    
                    if (!response.data.access_token) {
                        throw new Error("No access token received from GitHub");
                    }
                    
                    // Step 2: Store token and set auth header
                    localStorage.setItem('accesstoken', response.data.access_token);
                    setAuthToken(response.data.access_token);
                    
                    // Update loading message
                    swal({
                        title: "Getting User Data",
                        text: "Almost there...",
                        icon: "info",
                        buttons: false,
                        closeOnClickOutside: false
                    });
                    
                    // Step 3: Get user data
                    const userResponse = await axios.get("/api/getUserData", {
                        headers: {
                            Authorization: `Bearer ${response.data.access_token}`
                        }
                    });
                    
                    const tokenData = userResponse.data;
                    
                    if (!tokenData.token) {
                        throw new Error("Authentication failed - no token received");
                    }
                    
                    // Step 4: Set user data in Redux and localStorage
                    const decoded = jwtDecode(tokenData.token);
                    localStorage.setItem("token", tokenData.token);
                    dispatch(setUser(decoded));
                    setAuthToken(tokenData.token);
                    dispatch(setErrors({}));
                    
                    // Success message
                    swal({
                        title: "Authentication Successful!",
                        text: "Redirecting to dashboard...",
                        icon: "success",
                        buttons: false,
                        timer: 2000
                    });
                    
                    // Redirect to home page
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 2000);
                } catch (error) {
                    console.error("[GitHub] Authentication error:", error);
                    
                    // Show error message
                    swal("GitHub Authentication Failed", 
                        (error.response?.data?.error || error.message), 
                        "error");
                    
                    // Clear URL parameters
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                } finally {
                    setIsLoading(false);
                }
            }
            
            handleGitHubAuth();
        }
    }, [dispatch]);

    return (
        <div>
            <button 
                onClick={loginWithGithub} 
                disabled={isLoading}
                className='flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-black text-white p-4 hover:bg-gray-800 dark:border-strokedark dark:bg-gray-900 dark:hover:bg-gray-700'
            >
                <span>
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.11.793-.261.793-.577v-2.165c-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.091-.746.083-.73.083-.73 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.304 3.492.997.108-.775.419-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.93 0-1.311.469-2.381 1.237-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.525 11.525 0 013.003-.403c1.018.005 2.044.137 3.003.403 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.771.84 1.237 1.91 1.237 3.221 0 4.612-2.807 5.623-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.693.799.574C20.565 21.796 24 17.303 24 12 24 5.373 18.627 0 12 0z'
                        />
                    </svg>
                </span>
                {isLoading ? 'Connecting...' : 'Connect with GitHub'}
            </button>
        </div>
    );
};

export default AuthGithub;