/**
 * Skeleton
 *
 * A single shimmering placeholder block. Compose several of these to mirror the
 * shape of content that is still loading, so users never see a default/stale
 * state (e.g. the Free plan card) before their real data arrives.
 */
import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  radius,
  circle = false,
  className,
  style,
}) => (
  <span
    aria-hidden="true"
    data-testid="skeleton"
    className={`${styles.skeleton} ${circle ? styles.circle : ''} ${className ?? ''}`}
    style={{
      width,
      height,
      borderRadius: circle ? '50%' : radius,
      ...style,
    }}
  />
);

export default Skeleton;
