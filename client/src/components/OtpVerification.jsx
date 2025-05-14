import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { setUser } from '../redux/reducers/auth';
import { setErrors } from '../redux/reducers/errors';
import { setAuthToken } from '../lib/setAuthToken';
import { useDispatch } from 'react-redux';

const OtpVerification = ({ email, onClose }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [resendDisabled, setResendDisabled] = useState(true);
  const inputRefs = useRef([]);
  const dispatch = useDispatch();

  // Request OTP when component mounts
  useEffect(() => {
    sendOtpRequest();
    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format countdown time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send request to get OTP via email
  const sendOtpRequest = async () => {
    setLoading(true);
    setError('');
    try {
      // Utiliser l'endpoint correct pour envoyer l'OTP
      const response = await axios.post('/api/auth/2fa/send-email-code', { email });
      console.log('OTP response:', response.data);
      setResendDisabled(true);
      setCountdown(300); // Reset countdown to 5 minutes
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle key press for backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste event
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, 6).split('');
    const newOtp = [...otp];
    
    digits.forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(val => val === '');
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex].focus();
    } else if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  // Submit OTP for verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Utiliser l'endpoint correct pour vérifier l'OTP
      const res = await axios.post('/api/auth/2fa/verify-email-code', {
        email,
        otp: otpValue
      });
      
      const { token } = res.data;
      const decoded = jwtDecode(token);
      localStorage.setItem('token', token);
      dispatch(setUser(decoded));
      setAuthToken(token);
      dispatch(setErrors({}));
      window.location.href = '/';
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError(err.response?.data?.otp || err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-boxdark">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">Two-Factor Authentication</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          A verification code has been sent to your email address. Please enter the code below.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                ref={(el) => (inputRefs.current[index] = el)}
                className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:border-primary focus:outline-none dark:bg-boxdark dark:border-strokedark dark:text-white"
                autoFocus={index === 0}
              />
            ))}
          </div>
          
          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-primary text-white font-medium transition hover:bg-opacity-90 disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Code expires in: <span className="font-medium">{formatTime(countdown)}</span>
              </p>
              
              <button
                type="button"
                onClick={sendOtpRequest}
                disabled={resendDisabled || loading}
                className="text-primary hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendDisabled ? "Resend code" : "Resend code"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
