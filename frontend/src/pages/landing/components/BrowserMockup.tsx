import React, { memo, useEffect, useRef } from 'react';
import styles from './BrowserMockup.module.css';
import {
  FaCheck,
  FaChevronRight,
  FaChevronLeft,
  FaCalendarAlt,
  FaCog,
  FaSignOutAlt,
  FaUserCircle,
  FaRegClock,
  FaExclamationTriangle,
  FaClipboard,
  FaBook,
  FaInbox,
  FaQuestion,
} from 'react-icons/fa';

interface SyncAssignment {
  id: string;
  title: string;
  course: string;
  overdueText: string;
  points: string;
}

const SYNC_ASSIGNMENTS: SyncAssignment[] = [
  {
    id: 'hw1',
    title: 'Assignment Homework 1',
    course: 'Introduction to Management of Technology II',
    overdueText: 'Due in 3 days',
    points: '10 pts',
  },
  {
    id: 'quiz2',
    title: 'Quiz 2: Market Structures',
    course: 'Principles of Microeconomics',
    overdueText: '12 days overdue',
    points: '25 pts',
  },
  {
    id: 'lab3',
    title: 'Lab Report 3',
    course: 'Intro to Biology',
    overdueText: '3 days overdue',
    points: '50 pts',
  },
];

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
          <h2>Features</h2>
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
                      <div className={styles.courseCardHeader} style={{ backgroundColor: '#60a5fa' }}>
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
                      <div className={styles.courseCardHeader} style={{ backgroundColor: '#f97316' }}>
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
                      <div className={styles.courseCardHeader} style={{ backgroundColor: '#8b5cf6' }}>
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

              <div className={styles.popupOverlay}>
                <div className={styles.popup}>
                  <div className={styles.popupHeader}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        <FaUserCircle />
                      </div>
                      <div className={styles.userDetails}>
                        <h3 className={styles.userName}>User</h3>
                        <div className={styles.tierBadge}>
                          <span className={styles.tierDot}></span>
                          <span>Lifetime Member</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.headerActions}>
                      <button className={styles.headerButton} aria-label="Settings">
                        <FaCog />
                      </button>
                      <button className={styles.headerButton} aria-label="Log out">
                        <FaSignOutAlt />
                      </button>
                    </div>
                  </div>

                  <div className={styles.pageNav}>
                    <FaChevronLeft className={styles.navBack} />
                    <span className={styles.navDots}>
                      <span className={styles.navDot}></span>
                      <span className={styles.navDot}></span>
                    </span>
                    <span className={styles.pageTitle}>Another Page</span>
                  </div>

                  <div className={styles.classSelector}>
                    <FaCalendarAlt className={styles.classIcon} />
                    <span className={styles.classLabel}>Classes: 1 selected</span>
                    <FaChevronRight className={styles.classChevron} />
                  </div>

                  <div className={styles.syncCard}>
                    <div className={styles.syncCardHeader}>
                      <div className={styles.syncWarning}>
                        <FaExclamationTriangle className={styles.warningIcon} />
                        <h4>Items to Sync</h4>
                      </div>
                      <div className={styles.syncCount}>
                        <span className={styles.countBadge}>16</span>
                        <button className={styles.clearButton}>Clear</button>
                      </div>
                    </div>

                    <div className={styles.syncList}>
                      {SYNC_ASSIGNMENTS.map((assignment) => (
                        <div className={styles.syncItem} key={assignment.id}>
                          <div className={styles.syncItemIndicator}>
                            <FaClipboard />
                          </div>
                          <div className={styles.syncItemDetails}>
                            <h5>{assignment.title}</h5>
                            <p>{assignment.course}</p>
                            <div className={styles.syncItemInfo}>
                              <span className={styles.syncItemOverdue}>
                                <FaRegClock />
                                {assignment.overdueText}
                              </span>
                              <span className={styles.syncItemPoints}>{assignment.points}</span>
                            </div>
                          </div>
                        </div>
                      ))}
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
    </section>
  );
};

export default memo(BrowserMockup); 