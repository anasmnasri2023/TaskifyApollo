// Fixed AuthGoogle component with more specific auth check
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch } from "react-redux";
import jwtDecode from "jwt-decode";
import { setErrors } from "../redux/reducers/errors";
import { setUser } from "../redux/reducers/auth";
import { setAuthToken } from "../lib/setAuthToken";
import swal from "sweetalert"; // Make sure this is imported

const AuthGoogle = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    
    // Function to generate a random state parameter for OAuth security
    const generateRandomState = () => {
        return Math.random().toString(36).substring(2, 15);
    };

    // Helper function for retry logic with improved error handling
    const fetchWithRetry = async (url, options, maxRetries = 3) => {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`[GoogleOAuth] API Call Attempt ${i+1}:`, url);
                const response = await axios(url, options);
                return response;
            } catch (error) {
                console.error(`[GoogleOAuth] API Call Failed (Attempt ${i+1}):`, error.message);
                lastError = error;
                // Exponential backoff
                const delay = i * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    };

    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const codeParam = urlParams.get('code');
        const stateParam = urlParams.get('state');
        const storedGoogleState = localStorage.getItem('google_oauth_state');
        const errorParam = urlParams.get('error');
        
        // Only process if this is clearly a Google callback
        // Check that state parameter matches what we stored
        if (codeParam && stateParam && storedGoogleState === stateParam && !localStorage.getItem('token') && !isLoading) {
            // Clean up state parameter
            localStorage.removeItem('google_oauth_state');
            
            async function getAccessTokenGoogle() {
                setIsLoading(true);
                
                // Show a loading SweetAlert
                swal({
                    title: "Authenticating with Google",
                    text: "Please wait...",
                    icon: "info",
                    buttons: false,
                    closeOnClickOutside: false,
                    closeOnEsc: false
                });
                
                try {
                    console.log("[Google Auth] Processing Google auth code");
                    
                    // Step 1: Get access token from backend
                    const response = await fetchWithRetry(
                        `/api/google/getAccessToken`, 
                        {
                            method: 'GET',
                            params: { 
                                code: codeParam,
                                state: stateParam
                            }
                        }
                    );
                    
                    const data = response.data;
                    if (!data.access_token) {
                        throw new Error('No access token received from Google');
                    }
                    
                    // Set auth token in headers
                    setAuthToken(data.access_token);
                    
                    // Update SweetAlert
                    swal({
                        title: "Getting User Data",
                        text: "Almost there...",
                        icon: "info",
                        buttons: false,
                        closeOnClickOutside: false,
                        closeOnEsc: false
                    });
                    
                    // Step 2: Get user data from backend
                    const tokensResponse = await fetchWithRetry(
                        '/api/google/getUserData',
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${data.access_token}`
                            }
                        }
                    );

                    const tokenData = tokensResponse.data;
                    
                    if (!tokenData.token) {
                        throw new Error('Invalid server response - no token received');
                    }
                    
                    // Step 3: Process user authentication
                    const decoded = jwtDecode(tokenData.token);
                    
                    // Set token and user data in local storage/state
                    localStorage.setItem("token", tokenData.token);
                    dispatch(setUser(decoded));
                    setAuthToken(tokenData.token);
                    dispatch(setErrors({}));
                    
                    // Show success message with SweetAlert
                    swal({
                        title: "Google Authentication Successful!",
                        text: "Redirecting to dashboard...",
                        icon: "success",
                        buttons: false,
                        timer: 2000,
                        closeOnClickOutside: false,
                        closeOnEsc: false
                    });
                    
                    // IMPORTANT: Always redirect to home page on success
                    // Slight delay before redirecting to ensure UI updates
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 2000);
                    
                } catch (error) {
                    console.error('[Google Auth] Authentication Error:', error);
                    
                    // Show error message with SweetAlert
                    swal("Google Authentication Failed", 
                        error.response?.data?.error || 
                        error.message || 
                        'Google authentication failed',
                        "error");
                    
                    // Clear URL parameters to avoid repeated auth attempts on refresh
                    if (window.history && window.history.replaceState) {
                        const cleanUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                    }
                } finally {
                    setIsLoading(false);
                }
            }
            
            getAccessTokenGoogle();
        } else if (errorParam && storedGoogleState) {
            // Only handle Google-specific errors
            localStorage.removeItem('google_oauth_state');
            swal("Google Authentication Error", `Error: ${errorParam}`, "error");
        }
    }, [dispatch, isLoading]);

    // Separate function to handle Google login
    const initiateGoogleLogin = (e) => {
        // Prevent any default behavior
        e.preventDefault();
        e.stopPropagation();
        
        setIsLoading(true);
        
        // Get environment variables
        const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
        
        if (!GOOGLE_CLIENT_ID) {
            swal("Configuration Error", "Google Client ID not configured in environment variables", "error");
            setIsLoading(false);
            return;
        }
        
        if (!REDIRECT_URI) {
            swal("Configuration Error", "Google Redirect URI not configured in environment variables", "error");
            setIsLoading(false);
            return;
        }
        
        try {
            // Generate a random state parameter for additional security
            const state = generateRandomState();
            localStorage.setItem('google_oauth_state', state);
            
            // Generate Google OAuth URL with state parameter
            const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
            authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
            authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('scope', 'email profile');
            authUrl.searchParams.append('state', state);
            
            console.log("[Google Auth] Redirecting to Google OAuth", { authUrl: authUrl.toString() });
            
            // Redirect to Google auth page
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('[Google Auth] Redirect Error:', error);
            swal("Error", 'Failed to initiate Google login: ' + error.message, "error");
            setIsLoading(false);
        }
    };

    return (
        <div>
            <button 
                onClick={initiateGoogleLogin}
                disabled={isLoading}
                className={`flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-gray p-4 hover:bg-opacity-50 dark:border-strokedark dark:bg-meta-4 dark:hover:bg-opacity-50 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
                <span>
                    <svg
                        width='20'
                        height='20'
                        viewBox='0 0 20 20'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <g clipPath='url(#clip0_191_13499)'>
                            <path
                                d='M19.999 10.2217C20.0111 9.53428 19.9387 8.84788 19.7834 8.17737H10.2031V11.8884H15.8266C15.7201 12.5391 15.4804 13.162 15.1219 13.7195C14.7634 14.2771 14.2935 14.7578 13.7405 15.1328L13.7209 15.2571L16.7502 17.5568L16.96 17.5774C18.8873 15.8329 19.9986 13.2661 19.9986 10.2217'
                                fill='#4285F4'
                            />
                            <path
                                d='M10.2055 19.9999C12.9605 19.9999 15.2734 19.111 16.9629 17.5777L13.7429 15.1331C12.8813 15.7221 11.7248 16.1333 10.2055 16.1333C8.91513 16.1259 7.65991 15.7205 6.61791 14.9745C5.57592 14.2286 4.80007 13.1801 4.40044 11.9777L4.28085 11.9877L1.13101 14.3765L1.08984 14.4887C1.93817 16.1456 3.24007 17.5386 4.84997 18.5118C6.45987 19.4851 8.31429 20.0004 10.2059 19.9999'
                                fill='#34A853'
                            />
                            <path
                                d='M4.39899 11.9777C4.1758 11.3411 4.06063 10.673 4.05807 9.99996C4.06218 9.32799 4.1731 8.66075 4.38684 8.02225L4.38115 7.88968L1.19269 5.4624L1.0884 5.51101C0.372763 6.90343 0 8.4408 0 9.99987C0 11.5589 0.372763 13.0963 1.0884 14.4887L4.39899 11.9777Z'
                                fill='#FBBC05'
                            />
                            <path
                                d='M10.2059 3.86663C11.668 3.84438 13.0822 4.37803 14.1515 5.35558L17.0313 2.59996C15.1843 0.901848 12.7383 -0.0298855 10.2059 -3.6784e-05C8.31431 -0.000477834 6.4599 0.514732 4.85001 1.48798C3.24011 2.46124 1.9382 3.85416 1.08984 5.51101L4.38946 8.02225C4.79303 6.82005 5.57145 5.77231 6.61498 5.02675C7.65851 4.28118 8.9145 3.87541 10.2059 3.86663Z'
                                fill='#EB4335'
                            />
                        </g>
                        <defs>
                            <clipPath id='clip0_191_13499'>
                                <rect width='20' height='20' fill='white' />
                            </clipPath>
                        </defs>
                    </svg>
                </span>
                {isLoading ? 'Connecting...' : 'Connect with Google'}
            </button>
        </div>
    );
};

export default AuthGoogle;