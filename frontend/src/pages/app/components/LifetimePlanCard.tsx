/**
 * LifetimePlanCard
 *
 * The "Plan" section shown to Lifetime (one-time payment) users: full access,
 * forever. Layout matches LegacyPlanCard - a status block on the right stating
 * how long they've been a lifetime member - with a Pro-style row of link
 * actions beneath it: open the Stripe billing history, and (only inside the
 * 7-day window) request a refund.
 *
 * `purchasedAt` is an ISO instant; it's optional so the card degrades
 * gracefully if the webhook hasn't populated it.
 */
import React, { useState } from 'react';
import styles from './LifetimePlanCard.module.css';

// Only "Billing history" navigates to Stripe and shows a spinner. "Request a
// refund" just opens a confirmation dialog (instant), so it gets no spinner -
// its feedback lives in the dialog.
type PendingAction = 'billing' | null;

interface LifetimePlanCardProps {
  purchasedAt?: string;
  refundEligibleUntil?: number | null;
  withinRefundWindow: boolean;
  refundDone: boolean;
  onBillingHistory: () => void;
  onRefund: () => void;
  busy: boolean;
}

// Format in UTC, matching LegacyPlanCard: stored values are UTC instants and
// shifting them to the viewer's zone can move the displayed calendar date.
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};

const formatDate = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', DATE_OPTS);
};

const formatEpoch = (epochSeconds?: number | null): string | null => {
  if (!epochSeconds) return null;
  const date = new Date(epochSeconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', DATE_OPTS);
};

const LifetimePlanCard: React.FC<LifetimePlanCardProps> = ({
  purchasedAt,
  refundEligibleUntil,
  withinRefundWindow,
  refundDone,
  onBillingHistory,
  onRefund,
  busy,
}) => {
  const since = formatDate(purchasedAt);
  const refundDeadline = formatEpoch(refundEligibleUntil);
  const showRefund = withinRefundWindow && !refundDone;

  const [pending, setPending] = useState<PendingAction>(null);
  // Reset the spinner once the action finishes, without waiting a tick for an
  // effect: adjust state during render when `busy` changes, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevBusy, setPrevBusy] = useState(busy);
  if (busy !== prevBusy) {
    setPrevBusy(busy);
    if (!busy) setPending(null);
  }

  const run = (action: Exclude<PendingAction, null>, fn: () => void) => () => {
    setPending(action);
    fn();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.main}>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.badgeLifetime}`}>
              <span className={styles.dot} />
              Lifetime (Active)
            </span>
          </div>
          <h3 className={styles.heading}>Lifetime Account</h3>
          <p className={styles.description}>
            Full access to everything, forever. One&#8209;time payment.
          </p>
        </div>

        <div className={styles.aside}>
          <div className={styles.accessStatus}>
            <span className={styles.accessStatusLabel}>Access Status</span>
            {refundDone ? (
              <p className={styles.accessStatusLine}>Refunded — your account is now Free.</p>
            ) : (
              <>
                {since ? (
                  <p className={styles.accessStatusLine}>Lifetime member since: {since}</p>
                ) : (
                  <p className={styles.accessStatusLineMuted}>Lifetime member</p>
                )}
                <span className={styles.verified}>
                  <span className={styles.dot} />
                  Verified
                </span>
              </>
            )}
          </div>
          {!refundDone && (
            <div className={styles.asideLinks}>
              <button
                className={styles.linkButton}
                onClick={run('billing', onBillingHistory)}
                disabled={busy}
                aria-label="Billing history"
                aria-busy={pending === 'billing'}
              >
                {pending === 'billing'
                  ? <span className={styles.btnSpinner} aria-hidden="true" />
                  : 'Billing history'}
              </button>
              {showRefund && (
                <button
                  className={styles.linkButton}
                  onClick={onRefund}
                  disabled={busy}
                >
                  Request a refund
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.syncCard}>
        <div className={styles.syncHeader}>
          <span className={styles.syncLabel}>
            Sync Access: <span className={styles.syncHighlight}>Unlimited</span>
          </span>
          {showRefund && (
            <span className={styles.refundWindow}>
              <span className={styles.refundWindowLabel}>Refund window:</span>{' '}
              <span className={styles.refundWindowValue}>
                {refundDeadline ? `until ${refundDeadline}` : '7 days'}
              </span>
            </span>
          )}
        </div>
        <div className={styles.syncBarTrack}>
          <div className={styles.syncBarFill} />
        </div>

        <p className={styles.footnote}>
          {showRefund
            ? 'Changed your mind? A full refund is available during the refund window.'
            : 'One payment, unlimited synchronizations and automation features for life.'}
        </p>
      </div>
    </div>
  );
};

export default LifetimePlanCard;
