import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiNotion } from 'react-icons/si';
import { FaBook, FaLock, FaPuzzlePiece, FaThumbtack } from 'react-icons/fa';
import styles from './GetStarted.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import { useNotionAuth } from '../hooks/useNotionAuth';

const C2NIcon = () => (
  <svg width="20" height="20" viewBox="0 0 184 108" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.0396 49.1958C13.0396 24.3373 21.2914 16.2918 33.0502 16.2918C44.8089 16.2918 49.8632 18.5611 58.9401 16.6013V40.6346C52.7513 37.3339 46.8719 35.9929 43.2617 35.9929C39.6516 35.9929 38.1044 37.6433 38.1044 40.944C38.1044 44.2447 40.0642 45.5856 43.2617 45.5856C46.4593 45.5856 52.7513 44.9668 58.9401 43.6258V78.3865C49.8632 76.4267 42.1271 78.6959 33.0502 78.6959C23.9732 78.6959 13.0396 67.6592 13.0396 49.0927V49.1958Z" fill="#F05323"/>
    <path d="M84.1081 36.3531C84.1081 34.3933 82.4577 33.7744 79.3633 33.7744C76.2689 33.7744 69.4612 36.1468 63.8912 42.6451L63.4786 17.1677C70.1832 21.0873 81.8388 16.2394 91.9473 16.2394C102.056 16.2394 106.594 20.159 106.594 31.0926C106.594 51.1032 85.5521 43.5734 85.5521 50.1749C85.5521 56.7763 87.5119 53.3724 90.1938 53.3724C94.7323 53.3724 101.643 50.6906 106.697 46.2553L105.975 76.89H62.5503V57.8078C62.5503 35.4248 83.9018 43.1608 83.9018 36.4563L84.1081 36.3531Z" fill="#F05323"/>
    <path d="M111.958 18.2547H125.058C132.587 18.2547 139.395 26.9191 140.014 40.5345C140.22 44.6604 140.633 50.7461 143.211 50.7461C147.75 50.7461 142.283 27.9505 140.942 18.2547H162.294C160.334 34.8614 160.334 54.4594 162.294 76.8424H137.435C136.919 63.0206 137.642 46.5171 134.135 46.5171C130.628 46.5171 131.453 63.5364 133.825 76.8424H110.204C113.092 60.2356 113.505 34.6551 111.752 18.2547H111.958Z" fill="#F05323"/>
  </svg>
);

const PinExtensionGraphic: React.FC = () => {
  return (
    <div className={styles.graphicContainer}>
      <div className={styles.browserBar}>
        <div className={styles.browserActions}>
          <span className={styles.browserDot}></span>
          <span className={styles.browserDot}></span>
          <span className={styles.browserDot}></span>
        </div>
        <div className={styles.urlBar}>
          <div className={styles.urlText}>
            <span>{/* empty url name for spacing*/}</span>
            <FaPuzzlePiece className={styles.puzzleIcon} />
          </div>
        </div>
        <div className={styles.browserContent}></div>
      </div>
      <div className={styles.extensionsPopup}>
        <div className={styles.extensionsHeader}>
          Extensions
        </div>
        <div className={styles.extensionItem}>
          <div className={styles.extensionIcon}>
            <C2NIcon />
          </div>
          <div className={styles.extensionInfo}>
            <span className={styles.extensionName}>Canvas to Notion</span>
            <FaThumbtack className={styles.pinIcon} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SyncCanvasGraphic: React.FC = () => {
  return (
    <div className={styles.graphicContainer}>
      <div className={styles.syncIllustration}>
        <div className={styles.canvasBox}>
          <div className={styles.boxHeader}>Select a Page</div>
          <div className={styles.boxContent}>
            <div className={styles.pageSelectorUI}>
              <div className={`${styles.pageOption} ${styles.createNew}`}>
                <span>Create New Page</span>
              </div>
              <div className={styles.pageOption}>My Assignments</div>
            </div>
          </div>
        </div>
        <div className={styles.syncArrows}>
          <div className={styles.arrow}>→</div>
        </div>
        <div className={styles.notionBox}>
          <div className={styles.boxHeader}>Dashboard</div>
          <div className={styles.boxContent}>
            <div className={styles.dashboardUI}>
              <div className={styles.assignmentTitle}>My Assignments</div>
              <div className={styles.syncItems}>
                <div className={styles.itemsLabel}>Items to Sync</div>
                <div className={styles.assignmentItem}>
                  <div className={styles.assignmentDot}></div>
                </div>
                <div className={styles.assignmentItem}>
                  <div className={styles.assignmentDot}></div>
                </div>
              </div>
              <div className={styles.syncButton}>Sync</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotionGraphic: React.FC = () => {
  return (
    <div className={styles.notionGraphicContainer}>
      <div className={styles.connectionFlow}>
        <div className={styles.appWindow}>
          <div className={styles.appHeader}>
            <div className={styles.appTitle}>Settings</div>
            <div className={styles.appDot}></div>
          </div>
          <div className={styles.appContent}>
            <div className={styles.manageConnectionsUI}>
              <button className={`${styles.addConnectionButton} ${styles.bounceAnimation}`}>
                Add<br />Connection
              </button>
            </div>
          </div>
        </div>
        
        <div className={styles.connectionLine}>
          <div className={styles.connectionDot}></div>
          <div className={styles.connectionDot}></div>
          <div className={styles.connectionDot}></div>
        </div>
        
        <div className={styles.notionWindow}>
          <div className={styles.notionHeader}>
            <div className={styles.notionLogo}>
              <SiNotion />
            </div>
            <div className={styles.notionTitle}>Notion</div>
          </div>
          <div className={styles.notionContent}>
            <div className={styles.notionPage}>
              <div className={styles.notionBlock}>
                <div className={styles.notionIcon}>
                  <FaBook />
                </div>
                <div className={styles.notionText}>Assignments</div>
              </div>
              <div className={styles.notionPermission}>
                <div className={styles.lockIcon}>
                  <FaLock />
                </div>
                <div className={styles.permissionText}>Allow Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionSetup: React.FC = () => {
  const navigate = useNavigate();
  const {
    userInfo,
    isLoading,
    error
  } = useNotionAuth();
  const [isSettingsButtonLoading, setIsSettingsButtonLoading] = useState(false);

  const handleSettingsNavigation = () => {
    setIsSettingsButtonLoading(true);
    // Navigate after a short delay to show the loading animation
    setTimeout(() => {
      navigate('/settings');
    }, 500);
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        {isLoading ? (
          <div className={styles.container}>
            <h1 className={styles.header}>Loading...</h1>
          </div>
        ) : error && !userInfo ? (
          <div className={styles.container}>
            <h1 className={styles.header}>Error</h1>
            <div className={styles.error}>{error}</div>
            <button 
              className={styles.buttonRectangle}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.headerContainer}>
              <h1 className={styles.header}>Welcome to Canvas to Notion!</h1>
            </div>

            {/* Cards Container */}
            <div className={styles.cardsContainer}>
              {/* Step 1: Pin Extension Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 1: Pin Extension</h2>
                <div className={styles.imageContainer}>
                  <PinExtensionGraphic />
                </div>
                <p className={styles.helperText}>
                  Pin the Canvas to Notion extension to your browser for easy access
                </p>
                <p className={styles.note}>
                  {/* Find the Canvas to Notion extension and click the pin icon */}
                </p>
              </div>

              {/* Step 2: Notion Connection Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 2: Connect Notion</h2>
                <div className={styles.imageContainer}>
                  <NotionGraphic />
                </div>
                <button 
                  className={`${styles.buttonRectangle} ${isSettingsButtonLoading ? styles.connecting : ''}`}
                  onClick={handleSettingsNavigation}
                  disabled={isSettingsButtonLoading}
                >
                  {isSettingsButtonLoading ? <div className={styles.spinner}></div> : 'Go to Settings'}
                </button>
                <p className={styles.helperText}>
                  Head to Settings and click "Add Connection" to authorize Notion
                </p>
                <p className={styles.note}>
                  Choose a page or workspace where you want your assignments to sync
                </p>
              </div>

              {/* Step 3: Start Syncing Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 3: Start Syncing</h2>
                <div className={styles.imageContainer}>
                  <SyncCanvasGraphic />
                </div>
                <p className={styles.helperText}>
                  Open Canvas and click the extension icon to start syncing your assignments
                </p>
                <p className={styles.note}>
                  Configure your sync preferences in the settings
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ConnectionSetup; 