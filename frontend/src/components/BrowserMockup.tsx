import React, { memo, useEffect, useRef } from 'react';
import styles from './BrowserMockup.module.css';
import { FaCheck, FaChevronRight, FaCalendarAlt, FaListUl, FaUsers, FaBook, FaInbox, FaQuestion, FaClock, FaCog, FaSignOutAlt, FaFile, FaQuestionCircle, FaRegClock, FaExclamationTriangle, FaFileAlt, FaRegFileAlt } from 'react-icons/fa';

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
              <div className={styles.canvasDashboard}>
                <div className={styles.canvasSidebar}>
                  <div className={styles.sidebarItem}>
                    <div className={styles.avatarCircle}></div>
                  </div>
                  <div className={styles.sidebarItem}>
                    <FaBook />
                  </div>
                  <div className={styles.sidebarItem}>
                    <FaCalendarAlt />
                  </div>
                  <div className={styles.sidebarItem}>
                    <FaInbox />
                  </div>
                  <div className={styles.sidebarItem}>
                    <FaQuestion />
                  </div>
                </div>
                <div className={styles.canvasMain}>
                  <div className={styles.canvasHeader}>
                    <h2>Dashboard</h2>
                    <div className={styles.headerOptions}>⋮</div>
                  </div>
                  <div className={styles.courseGrid}>
                    <div className={styles.courseCard}>
                      <div className={styles.courseCardHeader} style={{backgroundColor: '#60a5fa'}}>
                        <div className={styles.courseCardMenu}>⋮</div>
                      </div>
                      <div className={styles.courseCardBody}>
                        <h3>Zoology 101</h3>
                        <p>ZOO 101</p>
                        <div className={styles.courseCardIcons}>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.courseCard}>
                      <div className={styles.courseCardHeader} style={{backgroundColor: '#f97316'}}>
                        <div className={styles.courseCardMenu}>⋮</div>
                      </div>
                      <div className={styles.courseCardBody}>
                        <h3>Biology 101</h3>
                        <p>BIO 101</p>
                        <div className={styles.courseCardIcons}>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.courseCard}>
                      <div className={styles.courseCardHeader} style={{backgroundColor: '#8b5cf6'}}>
                        <div className={styles.courseCardMenu}>⋮</div>
                      </div>
                      <div className={styles.courseCardBody}>
                        <h3>Classic Literature</h3>
                        <p>LIT</p>
                        <div className={styles.courseCardIcons}>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                          <span className={styles.icon}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.todoSection}>
                    <div className={styles.todoHeader}>
                      <h3>To Do</h3>
                      <span className={styles.todoHeaderIcon}><FaChevronRight /></span>
                    </div>
                    <div className={styles.todoItems}>
                      <div className={styles.todoItem}>
                        <div className={styles.todoCircle}></div>
                        <div className={styles.todoText}>
                          <p>Study Biology Overview</p>
                          <span>BIO 101 • Due 11 at 11pm</span>
                        </div>
                      </div>
                      <div className={styles.todoItem}>
                        <div className={styles.todoCircle}></div>
                        <div className={styles.todoText}>
                          <p>Grade Reading Assignment</p>
                          <span>BIO 101 • Due 14 at 11pm</span>
                        </div>
                      </div>
                      <div className={styles.todoItem}>
                        <div className={styles.todoCircle}></div>
                        <div className={styles.todoText}>
                          <p>Create Magic Stories</p>
                          <span>LIT • Due 22 at 5pm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extension Dashboard Overlay */}
              <div className={styles.extensionOverlay}>
                <div className={styles.extensionDashboard}>
                  <div className={styles.extensionHeader}>
                    <div className={styles.extensionUserInfo}>
                      <div className={styles.extensionAvatar}></div>
                      <div className={styles.extensionUserDetails}>
                        <h3>User</h3>
                        <p>Signed In</p>
                      </div>
                    </div>
                    <div className={styles.extensionActions}>
                      <button className={styles.extensionButton}><FaCog /></button>
                      <button className={styles.extensionButton}><FaSignOutAlt /></button>
                    </div>
                  </div>
                  
                  <div className={styles.extensionContent}>
                    <div className={styles.notionSection}>
                      <div className={styles.notionHeader}>
                        <div className={styles.notionIcon}>
                          <FaRegFileAlt className={styles.notionFileIcon} />
                        </div>
                        <h3>Notion Page</h3>
                      </div>
                      
                      <div className={styles.assignmentSection}>
                        <div className={styles.assignmentHeader}>
                          <div className={styles.assignmentEmojiTitle}>
                            <span>🐶</span>
                            <h4>Assignments Page</h4>
                          </div>
                          <button className={styles.changePageButton}>Change Page</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.syncSection}>
                      <div className={styles.syncHeader}>
                        <div className={styles.syncWarning}>
                          <FaExclamationTriangle className={styles.warningIcon} />
                          <h4>Items to Sync</h4>
                        </div>
                        <div className={styles.syncCount}>
                          <span className={styles.countBadge}>5</span>
                          <button className={styles.clearButton}>Clear</button>
                        </div>
                      </div>
                      
                      <div className={styles.syncItems}>
                        <div className={styles.syncItem}>
                          <div className={styles.syncItemIcon}>
                            <FaFile className={styles.fileIcon} />
                          </div>
                          <div className={styles.syncItemDetails}>
                            <h5>Final Project</h5>
                            <p>ZOO 101</p>
                            <div className={styles.syncItemInfo}>
                              <div className={styles.syncItemDue}>
                                <FaRegClock />
                                <span>Due in 25 days</span>
                              </div>
                              <div className={styles.syncItemPoints}>
                                <span>100 pts</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button className={styles.syncAllButton}>
                      Sync All Assignments
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(BrowserMockup); 