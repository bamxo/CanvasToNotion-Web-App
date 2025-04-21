/**
 * Login Component
 * 
 * This component handles user authentication through both email/password
 * and third-party (Google) authentication methods. It provides a form for
 * existing users to log in and navigation options for password recovery
 * and new user registration.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg';
import eyeSlashIcon from '../assets/Eye Slash.svg';
import authButtons from '../data/authButtons.json';

const Login: React.FC = () => {
  const navigate = useNavigate();
  // State for password visibility toggle
  const [showPassword, setShowPassword] = React.useState(false);
  // State to manage form inputs
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });

  /**
   * Handles input changes in the form
   * Updates the formData state with the new values
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles form submission
   * Currently logs the form data (TODO: implement actual authentication logic)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log('Login submitted:', formData);
  };

  /**
   * Navigates to the signup page when user clicks "Sign Up"
   */
  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header Section */}
          <h1 className={styles.header}>Welcome Back</h1>
          <p className={styles.subtext}>Login to your account</p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className={styles['login-form']}>
            {/* Email Input Field */}
            <div className={styles['form-group']}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password Input Field with Toggle Visibility */}
            <div className={styles['form-group']}>
              <div className={styles['password-header']}>
                <label htmlFor="password">Password</label>
                <span className={styles['forgot-password']} onClick={() => navigate('/forgot-password')}>
                  Forgot Password?
                </span>
              </div>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <img
                  src={showPassword ? eyeSlashIcon : eyeIcon}
                  alt="toggle password visibility"
                  className={styles['eye-icon']}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            <button type="submit" className={styles['button-rectangle']}>Login</button>
          </form>

          {/* Alternative Authentication Options */}
          <div className={styles.divider}>
            <div className={styles['divider-line']}></div>
            <div className={styles['divider-text']}>Or</div>
            <div className={styles['divider-line']}></div>
          </div>

          {/* Google Authentication Button */}
          {authButtons.buttons
            .filter(button => button.method === 'Google')
            .map((button, index) => (
              <button 
                key={index} 
                className={styles['auth-button']}
              >
                <img src={button.iconPath} alt="Google icon" className={styles['button-icon']} />
                Sign In with Google
              </button>
          ))}

          {/* Sign Up Section */}
          <div className={styles['signup-section']}>
            <span className={styles['signup-text']}>New to Canvas to Notion?</span>
            <div className={styles['signup-link']} onClick={handleSignUp}>
              Sign Up
              <img src="../src/assets/arrow.svg" alt="arrow" className={styles['arrow-icon']} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
