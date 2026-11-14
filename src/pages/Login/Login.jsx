import React, { useState, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import {
  Phone,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  UserRound,
  LogIn,
} from "lucide-react";
import api from "../../api/axiosInstance";
import "./Login.css";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/logo.jpeg";

const Login = () => {
  const [step, setStep] = useState(1);

  // admin -> Phone + OTP
  // guest -> Guest Login ID
  const [loginMode, setLoginMode] = useState("admin");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [guestLoginId, setGuestLoginId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // PHONE NUMBER HANDLER
  // ==========================================

  const handlePhoneChange = (e) => {
    // Allow only numbers
    const value = e.target.value.replace(/\D/g, "");

    // Maximum 10 digits
    if (value.length <= 10) {
      setPhone(value);
    }
  };

  // ==========================================
  // CLEANUP
  // ==========================================

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

  // ==========================================
  // ADMIN LOGIN
  // ==========================================

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    const mobile = phone.trim();

    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid Indian mobile number.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/v1/auth/sendOTP", {
        mobile: `+91${mobile}`,
      });

      console.log("OTP response:", response.data);

      if (response.data.success) {
        setStep(2);
      } else {
        setError(response.data?.message || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("Error sending OTP:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to send OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.trim().length < 4) {
      setError("Please enter the full OTP.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/v1/auth/VerifyOTP", {
        mobile: `+91${phone.trim()}`,
        otp: otp.trim(),
      });

      console.log("Verify OTP response:", response.data);

      if (response.data?.success) {
        const { token, user } = response.data.data;

        localStorage.setItem("token", token);

        login({
          token,
          user,
        });

        navigate(location.state?.from || "/admin/dashboard", {
          replace: true,
        });
      } else {
        setError(response.data?.message || "OTP verification failed.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Invalid OTP or login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GUEST LOGIN
  // ==========================================

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    setError("");

    const loginId = guestLoginId.trim();

    if (!loginId) {
      setError("Please enter your Guest Login ID.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/v1/guest-users/login", {
        guestLoginId: loginId,
      });

      console.log("Guest login response:", response.data);

      if (response.data?.success) {
        const { token, user } = response.data.data;

        localStorage.setItem("token", token);

        login({
          token,
          user,
        });

        navigate(location.state?.from || "/admin/dashboard", {
          replace: true,
        });
      } else {
        setError(response.data?.message || "Guest login failed.");
      }
    } catch (err) {
      console.error("Guest login error:", err);

      setError(
        err.response?.data?.message || "Invalid Guest Login ID.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // SWITCH TO ADMIN
  // ==========================================

  const handleAdminLogin = () => {
    setLoginMode("admin");
    setStep(1);

    setGuestLoginId("");
    setOtp("");
    setError("");
  };

  // ==========================================
  // SWITCH TO GUEST
  // ==========================================

  const handleGuestLoginMode = () => {
    setLoginMode("guest");
    setStep(1);

    setPhone("");
    setOtp("");
    setError("");
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="login-container">
      {/* =====================================
          THEME BUTTON
      ===================================== */}

      <button
        type="button"
        className="theme-toggle-absolute"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* =====================================
          LOGIN CARD
      ===================================== */}

      <div className="login-card">
        {/* =====================================
            LOGO + HEADER
        ===================================== */}

        <div className="login-header">
          <div className="logo-wrapper">
            <img
              src={logo}
              alt="REPAMP"
              className="login-logo"
            />
          </div>

          <h2>
            {loginMode === "guest"
              ? "Guest Login"
              : step === 2
              ? "Verify OTP"
              : "Welcome Back"}
          </h2>

          <p>
            {loginMode === "guest"
              ? "Login using your Guest Login ID"
              : step === 2
              ? `OTP sent to +91 ${phone}`
              : "Login to the admin dashboard"}
          </p>
        </div>

        {/* =====================================
            ERROR
        ===================================== */}

        {error && (
          <div className="error-message">
            <div className="error-main">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>

            {error.includes("operation-not-allowed") && (
              <div className="demo-otp-section">
                <p>
                  <strong>How to fix:</strong> Enable{" "}
                  <strong>Phone Auth</strong> and{" "}
                  <strong>SMS Region Policy</strong> in your
                  Firebase Console.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(2);
                  }}
                >
                  ⚡ Continue with Demo OTP
                </button>
              </div>
            )}
          </div>
        )}

        {/* =====================================
            GUEST LOGIN
        ===================================== */}

        {loginMode === "guest" ? (
          <form
            className="login-form"
            onSubmit={handleGuestLogin}
          >
            <div className="input-group">
              <label htmlFor="guestLoginId">
                Guest Login ID
              </label>

              <div className="input-wrapper">
                <UserRound
                  size={19}
                  className="input-icon"
                />

                <input
                  id="guestLoginId"
                  type="text"
                  placeholder="Enter your Guest Login ID"
                  value={guestLoginId}
                  onChange={(e) =>
                    setGuestLoginId(e.target.value)
                  }
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={
                isLoading || !guestLoginId.trim()
              }
            >
              <span>
                {isLoading
                  ? "Logging in..."
                  : "Login as Guest"}
              </span>

              {!isLoading && <LogIn size={18} />}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={handleAdminLogin}
              disabled={isLoading}
            >
              Back to Admin Login
            </button>
          </form>
        ) : (
          /* =====================================
             ADMIN LOGIN
          ===================================== */

          <>
            {/* =====================================
                STEP 1 - PHONE
            ===================================== */}

            {step === 1 ? (
              <form
                className="login-form"
                onSubmit={handleSendOtp}
              >
                <div className="input-group">
                  <label htmlFor="phone">
                    Mobile Number
                  </label>

                  <div className="input-wrapper phone-wrapper">
                    {/* Phone Icon */}

                    <Phone
                      size={19}
                      className="input-icon"
                    />

                    {/* Country Code */}

                    <div className="country-code">
                      <span className="india-flag">
                        🇮🇳
                      </span>

                      <span>+91</span>
                    </div>

                    {/* Divider */}

                    <div className="phone-divider" />

                    {/* Mobile Number */}

                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={phone}
                      onChange={handlePhoneChange}
                      maxLength={10}
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="input-helper">
                    Enter your 10-digit Indian mobile number
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    isLoading ||
                    phone.length !== 10
                  }
                >
                  <span>
                    {isLoading
                      ? "Sending OTP..."
                      : "Send OTP"}
                  </span>

                  {!isLoading && (
                    <ArrowRight size={18} />
                  )}
                </button>
              </form>
            ) : (
              /* =====================================
                 STEP 2 - OTP
              ===================================== */

              <form
                className="login-form"
                onSubmit={handleVerifyOtp}
              >
                <div className="otp-info">
                  <div className="otp-icon">
                    <Lock size={20} />
                  </div>

                  <div>
                    <span>Verification code sent to</span>

                    <strong>
                      +91 {phone}
                    </strong>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="otp">
                    Enter OTP
                  </label>

                  <div className="input-wrapper">
                    <Lock
                      size={19}
                      className="input-icon"
                    />

                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => {
                        const value =
                          e.target.value.replace(
                            /\D/g,
                            "",
                          );

                        if (value.length <= 6) {
                          setOtp(value);
                        }
                      }}
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    isLoading ||
                    otp.length < 4
                  }
                >
                  <span>
                    {isLoading
                      ? "Verifying..."
                      : "Verify & Login"}
                  </span>

                  {!isLoading && (
                    <ArrowRight size={18} />
                  )}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Back to Phone
                </button>
              </form>
            )}
          </>
        )}

        {/* =====================================
            GUEST LOGIN OPTION
        ===================================== */}

        {loginMode === "admin" && step === 1 && (
          <div className="guest-login-option">
            <div className="guest-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="guest-login-btn"
              onClick={handleGuestLoginMode}
            >
              <UserRound size={18} />

              <span>Login as Guest User</span>

              <ArrowRight
                size={16}
                className="guest-arrow"
              />
            </button>
          </div>
        )}

        {/* =====================================
            FOOTER
        ===================================== */}

        <div className="login-footer">
          <span>© {new Date().getFullYear()} REPAMP</span>
        </div>
      </div>
    </div>
  );
};

export default Login;