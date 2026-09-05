/**
 * LegacyPlanCard
 *
 * The "Plan" section shown to grandfathered legacy-tier users: full access,
 * free, forever. `memberSince` (the account's real createdAt) is optional so
 * the card degrades gracefully for the rare user missing it; every other
 * element is decorative status, not a live metric.
 */
import React from 'react';
import styles from './LegacyPlanCard.module.css';

interface LegacyPlanCardProps {
  memberSince?: string;
}

const formatMemberSince = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // Format in UTC, not the viewer's local zone: createdAt is a UTC instant and
  // shifting it to local time can silently move the displayed calendar date.
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const LegacyPlanCard: React.FC<LegacyPlanCardProps> = ({ memberSince }) => {
  const formattedDate = formatMemberSince(memberSince);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.main}>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.badgeLegacy}`}>
              <span className={styles.dot} />
              Legacy (Active)
            </span>
            <span className={`${styles.badge} ${styles.badgeFree}`}>
              <span className={styles.dot} />
              Free for Life
            </span>
          </div>
          <h3 className={styles.heading}>Legacy Account</h3>
          <p className={styles.description}>
            Full access to everything, free, forever.
          </p>
        </div>

        <div className={styles.accessStatus}>
          <span className={styles.accessStatusLabel}>Access Status</span>
          {formattedDate && (
            <p className={styles.accessStatusLine}>Legacy member since: {formattedDate}</p>
          )}
          <span className={styles.verified}>
            <span className={styles.dot} />
            Verified
          </span>
        </div>
      </div>

      <div className={styles.syncCard}>
        <div className={styles.syncRow}>
          <span className={styles.syncLabel}>
            Sync Access: <span className={styles.syncHighlight}>Unlimited</span>
          </span>
          <div className={styles.syncBarTrack}>
            <div className={styles.syncBarFill} />
          </div>
        </div>

        <p className={styles.footnote}>
          Honoring early supporter status. Zero recurring fees and unlimited synchronizations for life.
        </p>
      </div>
    </div>
  );
};

export default LegacyPlanCard;
