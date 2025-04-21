/**
 * SignUp Component
 * 
 * This component handles the email-based user registration process.
 * It provides a form for users to enter their email and password,
 * with password visibility toggle functionality and password confirmation.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'
import styles from './SignUp.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg';
import eyeSlashIcon from '../assets/Eye Slash.svg';

const SignUp: React.FC = () => {
  // State for form data management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Handler for form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData);
  };

  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Handler for login page navigation
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header section */}
          <h1 className={styles.header}>Create an Account</h1>
          <p className={styles.subtext}>Just a few details to get started</p>

          {/* Registration form */}
          <form onSubmit={handleSubmit} className={styles['signup-form']}>
            {/* Email input field */}
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

            {/* Password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="password">Password</label>
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

            {/* Confirm password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
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

            {/* Submit button */}
            <button type="submit" className={styles['button-rectangle']}>Create Account</button>
          </form>

          {/* Login section for existing users */}
          <div className={styles['login-section']}>
            <span className={styles['login-text']}>Already have an account?</span>
            <div className={styles['login-link']} onClick={handleLogin}>
              Login
              <img src="../src/assets/arrow.svg" alt="arrow" className={styles['arrow-icon']} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp; 