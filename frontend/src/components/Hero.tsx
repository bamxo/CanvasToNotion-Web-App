import React, { memo, useEffect, useState } from 'react';
import styles from './Hero.module.css';
import { FaArrowRight, FaChrome, FaGraduationCap } from 'react-icons/fa';
import { SiNotion, SiCanvas } from 'react-icons/si';

const Hero: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleInstallClick = () => {
    window.open('https://chromewebstore.google.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={`${styles.heroContent} ${isVisible ? styles.visible : ''}`}>
          <div className={styles.tagline}>

            {/* For Release */}
            {/* <span className={styles.tag}>New</span> */}
            {/* <span className={styles.tagText}>Canvas Integration Available</span> */}

            {/* For Current Deployment */}
            <span className={styles.tag}>Coming Soon</span>
            <span className={styles.tagText}>Canvas Integration</span>
          </div>
          
          <h1 className={styles.heroTitle}>
            Sync <span className={styles.highlight}>Canvas</span> <span className={styles.highlight}>Assignments</span> into Notion
          </h1>
          
          <p className={styles.heroSubtitle}>
            Seamlessly sync your Canvas assignments, deadlines, and materials directly to Notion. 
            Stay organized and focused on what matters most.
          </p>

          <div className={styles.ctaGroup}>
            <button 
              onClick={handleInstallClick} 
              className={styles.ctaButton}
              aria-label="Add to Chrome"
            >
              <div className={styles.buttonContent}>
                <FaChrome className={styles.chromeIcon} />
                {/* For Release */}
                {/* <span>Add to Chrome</span> */}

                {/* For Current Deployment */}
                <span>Coming Soon</span>
                <FaArrowRight className={styles.arrowIcon} />
              </div>
            </button>
            <div className={styles.valueProps}>
              <div className={styles.valueProp}>
                <div className={styles.valueIcon}>
                  <FaGraduationCap />
                </div>
                <div className={styles.valueContent}>
                  <h3>Built for Students, by Students</h3>
                  <p>Created by students who got tired of copy-pasting from Canvas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.heroVisual} ${isVisible ? styles.visible : ''}`}>
          <div className={styles.visualContainer}>
            <div className={styles.mainVisual}>
              <div className={styles.particleContainer}>
                <div className={styles.syncCircle}>
                  <div className={styles.canvasNode}>
                    <SiCanvas className={styles.nodeIcon} />
                  </div>
                  <div className={styles.notionNode}>
                    <SiNotion className={styles.nodeIcon} />
                  </div>
                  <div className={styles.connectionPath} />
                  <div className={styles.dataFlow}>
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={`flow-${i}`} 
                        className={styles.dataPacket} 
                        style={{ animationDelay: `${i * 1.2}s` }} 
                      />
                    ))}
                  </div>
                  <div className={styles.pulseRing} />
                </div>
                <div className={styles.glowEffect} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.waveContainer}>
        <svg 
          className={styles.wave} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            className={styles.shapeFill}
          />
        </svg>
      </div>
    </section>
  );
};

export default memo(Hero); 