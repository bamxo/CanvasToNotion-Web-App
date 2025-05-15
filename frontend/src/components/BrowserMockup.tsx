import React, { memo, useEffect, useRef } from 'react';
import styles from './BrowserMockup.module.css';
import { FaCheck } from 'react-icons/fa';

const FeatureItem = memo(({ children }: { children: React.ReactNode }) => (
  <div className={styles.featureItem}>
    <FaCheck className={styles.checkIcon} />
    <p>{children}</p>
  </div>
));

FeatureItem.displayName = 'FeatureItem';

const BrowserMockup: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (textRef.current) {
              textRef.current.classList.add(styles.visible);
            }
            if (containerRef.current) {
              containerRef.current.classList.add(styles.visible);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.mockupSection}>
      <div className={styles.mockupContent}>
        <div 
          ref={textRef} 
          className={`${styles.mockupText} ${styles.hidden} ${styles.fromLeft}`}
        >
          <h2>Experience Seamless Integration</h2>
          <div className={styles.featuresList}>
            <FeatureItem>One-click sync between Canvas and Notion</FeatureItem>
            <FeatureItem>Automatic assignment tracking and organization</FeatureItem>
            <FeatureItem>Smart due date management and reminders</FeatureItem>
            <FeatureItem>Customizable Notion templates for each course</FeatureItem>
          </div>
        </div>
        <div 
          ref={containerRef}
          className={`${styles.mockupContainer} ${styles.hidden} ${styles.fromRight}`}
        >
          <div className={styles.browserMockup}>
            <div className={styles.browserHeader}>
              <div className={styles.browserDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className={styles.browserContent}>
              {/* add screenshot or mockup here */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(BrowserMockup); 