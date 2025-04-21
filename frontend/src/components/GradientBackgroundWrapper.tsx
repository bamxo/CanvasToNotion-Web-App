/**
 * GradientBackgroundWrapper Component
 * 
 * A component that creates an animated gradient background.
 * Uses react-gradient-animation for the background effect and implements performance
 * optimizations through React.memo and useMemo.
 */
import React, { useMemo } from 'react';
import { GradientBackground } from 'react-gradient-animation';
import styles from './GradientBackgroundWrapper.module.css';

const GradientBackgroundWrapper: React.FC = () => {
  // Memoize the gradient background to prevent unnecessary re-renders
  const memoizedBackground = useMemo(() => (
    <div className={styles.backgroundContainer}>
      <div style={{ position: 'fixed', width: '105%', height: '120%', top: 0, left: 0, zIndex: -2 }}>
        <GradientBackground
          colors={{ 
            particles: ['#EA5C24', '#0E0E0E', '#560C68'], // Define gradient colors for particles
            background: '#0E0E0E' // Base background color
          }}
          blending="overlay"
          speed={{ x: { min: 0.5, max: 2 }, y: { min: 0.5, max: 2 } }} // Animation speed configuration
        />
      </div>
      <div className={styles.noiseOverlay} />
    </div>
  ), []); // Empty dependency array since values are constant

  return memoizedBackground;
};

// Export memoized component to prevent unnecessary re-renders
export default React.memo(GradientBackgroundWrapper); 