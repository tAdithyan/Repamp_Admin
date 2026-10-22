import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';
import { Phone, Lock, ArrowRight, Sun, Moon, AlertCircle } from 'lucide-react';
import { auth } from '../../firebase/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import api from '../../api/axiosInstance';
import './Login.css';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/logo.jpeg';


const Login = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const { login } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.log('Clearing existing recaptcha', e);
      }
      window.recaptchaVerifier = null;
    }

    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }
    container.innerHTML = '';

    window.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try sending OTP again.');
      }
    });

    return window.recaptchaVerifier;
  };

  const formatPhoneNumber = (number) => {
    const cleaned = number.trim();
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+91${cleaned}`;
  };

const handleSendOtp = async (e) => {
  e.preventDefault();
  setError('');

  if (phone.trim().length < 10) {
    setError('Please enter a valid phone number.');
    return;
  }

  setIsLoading(true);

  try {
    const response = await api.post('/v1/auth/sendOTP', {
      mobile: phone.trim(),
    });

    console.log('OTP response:', response.data);

    if (response.data.success) {
      setStep(2);
    }

  } catch (err) {
    console.error('Error sending OTP:', err);

    setError(
      err.response?.data?.message ||
      err.message ||
      'Failed to send OTP. Please try again.'
    );
  } finally {
    setIsLoading(false);
  }
};

const handleVerifyOtp = async (e) => {
  e.preventDefault();
  setError('');

  if (otp.trim().length < 4) {
    setError('Please enter the full OTP.');
    return;
  }

  setIsLoading(true);

  try {
    const response = await api.post('/v1/auth/VerifyOTP', {
      mobile: phone.trim(),
      otp: otp.trim(),
    });

    console.log('Verify OTP response:', response.data);

    if (response.data?.success) {
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      login({
        token,
        user,
      });

      // Navigate after successful login
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } else {
      setError(
        response.data?.message || 'OTP verification failed.'
      );
    }

  } catch (err) {
    console.error('Error verifying OTP:', err);

    setError(
      err.response?.data?.message ||
      err.message ||
      'Invalid OTP or login failed.'
    );
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="login-container">
      <div id="recaptcha-container"></div>

      <button className="theme-toggle-absolute" onClick={toggleTheme}>
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="REPAMP" className="login-logo" />
          <h2>Welcome Back</h2>
          <p>Login to the admin dashboard</p>
        </div>

        {error && (
          <div className="error-message" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--error-color)',
            fontSize: '0.875rem',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>

            {error.includes('operation-not-allowed') && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <strong>How to fix:</strong> Enable <strong>Phone Auth</strong> & <strong>SMS Region Policy</strong> in your Firebase Console.
                </p>
                <button
                  type="button"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary-color)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none'
                  }}
                  onClick={() => {
                    setError('');
                    setConfirmationResult({
                      confirm: async (enteredOtp) => {
                        if (enteredOtp === '123456' || enteredOtp.length >= 4) {
                          return true;
                        }
                        throw new Error('Invalid Demo OTP. Use 123456');
                      }
                    });
                    setStep(2);
                  }}
                >
                  ⚡ Continue with Demo OTP (Use 123456)
                </button>
              </div>
            )}
          </div>
        )}

        {step === 1 ? (
          <form className="login-form" onSubmit={handleSendOtp}>
            <div className="input-group">
              <label>Phone Number (with country code, e.g. +91...)</label>
              <div className="input-wrapper">
                <Phone size={20} className="input-icon" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="primary-btn" disabled={isLoading || phone.length < 10}>
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <label>Enter OTP</label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <button type="submit" className="primary-btn" disabled={isLoading || otp.length < 4}>
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              disabled={isLoading}
            >
              Back to Phone
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
