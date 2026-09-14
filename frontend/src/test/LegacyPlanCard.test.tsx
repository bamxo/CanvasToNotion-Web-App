import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LegacyPlanCard from '../components/LegacyPlanCard';

afterEach(cleanup);

describe('LegacyPlanCard', () => {
  it('renders the legacy badges, heading and description', () => {
    render(<LegacyPlanCard memberSince="2024-01-15T00:00:00.000Z" />);
    expect(screen.getByText('Legacy (Active)')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Legacy Account')).toBeInTheDocument();
    expect(
      screen.getByText(/full access to everything\./i)
    ).toBeInTheDocument();
  });

  it('formats memberSince into a human-readable date', () => {
    render(<LegacyPlanCard memberSince="2024-01-15T00:00:00.000Z" />);
    expect(screen.getByText(/legacy member since: jan 15, 2024/i)).toBeInTheDocument();
  });

  it('always shows Verified for a legacy user, even without a memberSince', () => {
    render(<LegacyPlanCard />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText(/legacy member since/i)).not.toBeInTheDocument();
  });

  it('renders the decorative unlimited sync-access indicator', () => {
    render(<LegacyPlanCard />);
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });
});
