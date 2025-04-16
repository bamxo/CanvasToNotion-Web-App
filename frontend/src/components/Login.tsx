import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'

const Login: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Save the original background
    const originalBackground = document.body.style.background;
    
    // Set the gradient background
    document.body.style.background = 'linear-gradient(235deg, #9D2235 0%, #0E0E0E 50%, #560C68 100%)';
    
    // Cleanup function to restore original background when component unmounts
    return () => {
      document.body.style.background = originalBackground;
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>
        Welcome Back
      </h1>
      <p className={styles.subtext}>
        Login to your account
      </p>
      {/* Login form will be added here */}
    </div>
  )
}

export default Login
