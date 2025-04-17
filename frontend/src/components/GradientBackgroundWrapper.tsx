/**
 * GradientBackgroundWrapper Component
 * 
 * A reusable component that wraps its children with an animated gradient background.
 * Uses react-gradient-animation for the background effect and implements performance
 * optimizations through React.memo and useMemo.
 */
import React, { ReactNode, useMemo } from 'react';
import { GradientBackground } from 'react-gradient-animation';
import styles from './GradientBackgroundWrapper.module.css';

// Interface defining the component's props
interface GradientBackgroundWrapperProps {
  children: ReactNode;
}

const GradientBackgroundWrapper: React.FC<GradientBackgroundWrapperProps> = ({ children }) => {
  // Memoize the gradient background to prevent unnecessary re-renders
  const memoizedBackground = useMemo(() => (
    <div style={{ position: 'fixed', width: '105%', height: '120%', top: 0, left: 0, zIndex: -1 }}>
      <GradientBackground
        colors={{ 
          particles: ['#EA5C24', '#0E0E0E', '#560C68'], // Define gradient colors for particles
          background: '#0E0E0E' // Base background color
        }}
        blending="overlay"
        speed={{ x: { min: 0.5, max: 2 }, y: { min: 0.5, max: 2 } }} // Animation speed configuration
      />
    </div>
  ), []); // Empty dependency array since values are constant

  return (
    <>
      {memoizedBackground}
      <div className={styles.pageWrapper}>
        {children}
      </div>
    </>
  );
};

// Export memoized component to prevent unnecessary re-renders
export default React.memo(GradientBackgroundWrapper); 