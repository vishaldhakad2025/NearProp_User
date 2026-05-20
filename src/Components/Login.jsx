import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Login.css';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
};

function Login({ onLoginSuccess }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [code, setCode] = useState('');
  const [type] = useState('MOBILE');
  const [response, setResponse] = useState(null);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sendOtpDisabled, setSendOtpDisabled] = useState(false); // New state for Send OTP button
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mobileError, setMobileError] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const navigate = useNavigate();

  // Refs for input fields
  const mobileInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const baseurl = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}`;

  const countryCodes = [
    { code: '+91', label: '+91' },
    { code: '+1', label: '+1' },
    { code: '+44', label: '+44' },
    { code: '+61', label: '+61' },
    { code: '+81', label: '+81' },
    { code: '+86', label: '+86' },
    { code: '+33', label: '+33' },
    { code: '+49', label: '+49' },
  ];

  useEffect(() => {
    const info = `${navigator.platform} - ${navigator.userAgent}`;
    setDeviceInfo(info);
    
    // Auto-focus on mobile number input when component mounts
    if (mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setResendDisabled(false);
            setSendOtpDisabled(false); // Re-enable Send OTP button when countdown ends
            setShowResendLink(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  const validateMobileNumber = (number) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(number);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorDialog(true);
    setMobileError(true);
  };

  const closeErrorDialog = () => {
    setShowErrorDialog(false);
    setErrorMessage('');
    setMobileError(false);
  };

  const handleLogin = async () => {
    if (!mobileNumber) {
      showError('Please enter a mobile number.');
      return;
    }

    if (!validateMobileNumber(mobileNumber)) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      const payload = { mobileNumber: fullMobileNumber, deviceInfo };
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post(`${baseurl}/v1/auth/login`, payload, config);
      setResponse(res.data);
      
      // Disable both Send OTP and Resend buttons + start countdown
      setSendOtpDisabled(true);
      setResendDisabled(true);
      setResendCountdown(30);
      setShowResendLink(false);

      toast.success('OTP sent successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
      
      // Auto-focus on OTP input after successful OTP send
      setTimeout(() => {
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        showError('User not registered. Please sign up first.');
        setTimeout(() => navigate('/register'), 3000);
      } else {
        const errorMessage = error.response
          ? `${error.response.data.message || error.response.statusText} (Status: ${error.response.status})`
          : error.request
          ? 'No response from server. Check network or server status.'
          : error.message;
        showError(`Failed to send OTP: ${errorMessage}`);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleOtpKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleResendOtp = async () => {
    if (resendDisabled) {
      showError('Please wait for the countdown to finish.');
      return;
    }

    if (!mobileNumber) {
      showError('Please enter a mobile number.');
      return;
    }

    if (!validateMobileNumber(mobileNumber)) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      const payload = { mobileNumber: fullMobileNumber, deviceInfo };
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post(`${baseurl}/v1/auth/login`, payload, config);
      setResponse(res.data);
      
      // Again disable both buttons and restart countdown
      setSendOtpDisabled(true);
      setResendDisabled(true);
      setResendCountdown(30);
      setShowResendLink(false);

      toast.success('OTP resent successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });
      
      // Auto-focus on OTP input after resend
      setTimeout(() => {
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        showError('User not registered. Please sign up first.');
        setTimeout(() => navigate('/register'), 3000);
      } else {
        const errorMessage = error.response
          ? `${error.response.data.message || error.response.statusText} (Status: ${error.response.status})`
          : error.request
          ? 'No response from server. Check network or server status.'
          : error.message;
        showError(`Failed to resend OTP: ${errorMessage}`);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!mobileNumber || !code) {
      showError('Please enter both mobile number and OTP.');
      return;
    }

    if (!validateMobileNumber(mobileNumber)) {
      showError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      const payload = {
        identifier: fullMobileNumber,
        code,
        type,
        deviceInfo,
      };
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post(`${baseurl}/v1/auth/verify-otp`, payload, config);
      setResponse(res.data);

      if (res.data.success) {
        const { token, userId, permanentId, roles, name, mobileNumber } = res.data.data;

        const authData = {
          token,
          userId,
          permanentId,
          roles,
          name,
          mobileNumber: fullMobileNumber,
        };

        localStorage.setItem('authData', JSON.stringify(authData));

        toast.success('Login Successful!', {
          position: 'top-right',
          autoClose: 3000,
          onClose: () => {
            if (onLoginSuccess) {
              onLoginSuccess(authData);
            }
            navigate('/');
          },
        });
      } else {
        showError(`OTP verification failed: Invalid OTP.`);
      }
    } catch (error) {
      const errorMessage = error.response
        ? `${error.response.data.message || error.response.statusText} (Status: ${error.response.status})`
        : error.request
        ? 'No response from server. Check network or server status.'
        : error.message;
      showError(`OTP verification failed: Invalid Otp`);
    }
  };

  return (
    <>
      <div className="logimbody">
        <div className="welcome-container">
          <div className="welcome-left">
            <h2>WELCOME</h2>
            <p>To NEARPROP</p>
            <p>Nearprop is a modern real estate platform designed to simplify property discovery, buying, selling, and renting.</p>
          </div>

          <div className="welcome-right">
            <h3>Sign in</h3>
            <div className="welcome-input-group">
              <label>Mobile Number</label>
              <div className="input-button-container">
                <div className="mobile-input-row">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="country-code-select"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={mobileInputRef}
                    type="tel"
                    placeholder="Mobile Number"
                    className={`welcome-username ${mobileError ? 'error-input' : ''}`}
                    maxLength="10"
                    pattern="[0-9]{10}"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/[^0-9]/g, ''));
                      setMobileError(false);
                    }}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <button
                  type="button"
                  className="welcome-button send-otp-button"
                  onClick={handleLogin}
                  disabled={sendOtpDisabled}
                  style={{
                    backgroundColor: sendOtpDisabled ? '#cccccc' : '', // Gray when disabled
                    cursor: sendOtpDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send OTP
                </button>
              </div>
            </div>
            <div className="welcome-input-group">
              <label>OTP</label>
              <input
                ref={otpInputRef}
                type="text"
                placeholder="Enter your OTP"
                className="welcome-password"
                maxLength="6"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyPress={handleOtpKeyPress}
              />
              <div className="resend-timer">
                {resendCountdown > 0 ? (
                  <span>Resend OTP in {resendCountdown}s</span>
                ) : (
                  showResendLink && (
                    <button
                      className="resend-button"
                      onClick={handleResendOtp}
                      disabled={resendDisabled}
                    >
                      Resend OTP
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="welcome-options">
                
              <Link to="/register">Sign Up</Link>
            </div>
            <button className="welcome-button" onClick={handleVerifyOtp}>
              Sign in
            </button>
            <div className="welcome-footer">
              Don't have an account? <Link to="/register" className="text-light">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>

     {showErrorDialog && (
  <div 
    className="error-dialog"
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { // Enter ya Space dono se close ho jayega
        e.preventDefault();
        closeErrorDialog();
      }
    }}
    tabIndex={0} // Yeh important hai taaki div focusable ho
    ref={(node) => {
      if (node && showErrorDialog) {
        node.focus(); // Dialog open hote hi focus set kar do
      }
    }}
  >
    <div className="error-dialog-content">
      <p>{errorMessage}</p>
      <button 
        onClick={closeErrorDialog} 
        className="error-dialog-button"
        onKeyDown={(e) => { // Optional: button par bhi Enter work kare
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            closeErrorDialog();
          }
        }}
      >
        OK
      </button>
    </div>
  </div>
)}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      <style>
        {`
          .country-code-select {
            height: 40px;
            padding: 0 10px;
            border: 1px solid #ccc;
            border-radius: 4px 0 0 4px;
            font-size: 16px;
            appearance: none;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>') no-repeat right 10px center;
            background-color: gray;
            cursor: pointer;
            color: white;
          }

          .input-button-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .mobile-input-row {
            display: flex;
            align-items: center;
          }

          .welcome-username,
          .welcome-password {
            height: 40px;
          }

          /* Optional: Agar aap chahein to yahan se bhi disabled style override kar sakte hain */
          .send-otp-button:disabled {
            opacity: 0.7;
          }
        `}
      </style>
    </>
  );
}

export default Login;