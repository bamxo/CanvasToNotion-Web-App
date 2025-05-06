import React, { memo } from 'react';
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
  return (
    <section className={styles.mockupSection}>
      <div className={styles.mockupContent}>
        <div className={styles.mockupText}>
          <h2>Experience Seamless Integration</h2>
          <div className={styles.featuresList}>
            <FeatureItem>One-click sync between Canvas and Notion</FeatureItem>
            <FeatureItem>Automatic assignment tracking and organization</FeatureItem>
            <FeatureItem>Smart due date management and reminders</FeatureItem>
            <FeatureItem>Customizable Notion templates for each course</FeatureItem>
          </div>
        </div>
        <div className={styles.mockupContainer}>
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