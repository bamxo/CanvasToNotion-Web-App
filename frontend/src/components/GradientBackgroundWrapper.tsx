import React, { ReactNode } from 'react';
import { GradientBackground } from 'react-gradient-animation';
import styles from './GradientBackgroundWrapper.module.css';

interface GradientBackgroundWrapperProps {
  children: ReactNode;
}

const GradientBackgroundWrapper: React.FC<GradientBackgroundWrapperProps> = ({ children }) => {
  return (
    <>
      <div style={{ position: 'fixed', width: '105%', height: '120%', top: 0, left: 0, zIndex: -1 }}>
        <GradientBackground
          colors={{ 
            particles: ['#EA5C24', '#0E0E0E', '#560C68'],
            background: '#0E0E0E'
          }}
          blending="overlay"
          speed={{ x: { min: 0.5, max: 2 }, y: { min: 0.5, max: 2 } }}
        />
      </div>
      <div className={styles.pageWrapper}>
        {children}
      </div>
    </>
  );
};

export default GradientBackgroundWrapper; 