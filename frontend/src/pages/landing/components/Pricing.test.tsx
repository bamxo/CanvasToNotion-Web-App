import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BrowserRouter } from 'react-router-dom';
import Pricing from './Pricing';

// Mock useNavigate so we can assert on it without needing real routing
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPricing = () => render(
  <BrowserRouter>
    <Pricing />
  </BrowserRouter>
);

const originalOpen = window.open;

// Create an interface for our mock
interface IMockIntersectionObserver {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  callback: IntersectionObserverCallback;
  simulateIntersection: (isIntersecting: boolean) => void;
}

// Mock the IntersectionObserver implementation
class MockIntersectionObserver implements IMockIntersectionObserver {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();

    // Store for tests to use
    global.mockIntersectionObserverInstance = this;
  }

  // Helper to simulate intersection
  simulateIntersection(isIntersecting: boolean): void {
    this.callback([
      {
        isIntersecting,
        target: document.createElement('div'),
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      },
    ], this as unknown as IntersectionObserver);
  }
}

describe('Pricing Component', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    global.mockIntersectionObserverInstance = null;
    mockNavigate.mockClear();
    window.open = vi.fn();

    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.mockIntersectionObserverInstance = null;
    window.open = originalOpen;
  });

  it('renders the component with the correct title', () => {
    renderPricing();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  it('renders all pricing tiers with correct content', () => {
    const { container } = renderPricing();

    // Get the pricing grid container
    const pricingGrid = container.querySelector('[class*="pricingGrid"]');
    expect(pricingGrid).not.toBeNull();

    if (pricingGrid) {
      // Check the number of pricing cards
      const cards = pricingGrid.querySelectorAll('[class*="pricingCard"]');
      expect(cards.length).toBe(3);

      const tierNames = ['Free', 'Pro', 'Lifetime'];
      const tierPrices = ['$0', '$1', '$10'];

      cards.forEach((card, index) => {
        const cardElement = within(card as HTMLElement);
        expect(cardElement.getByText(tierNames[index])).toBeInTheDocument();
        expect(cardElement.getByText(tierPrices[index])).toBeInTheDocument();
      });

      // The Lifetime tier is called out as the popular option
      expect(within(container).getByText('MOST POPULAR')).toBeInTheDocument();
    }
  });

  it('sets up an intersection observer that adds animation classes', () => {
    renderPricing();

    // Check that the intersection observer was set up
    expect(global.mockIntersectionObserverInstance).not.toBeNull();

    // Only proceed if the instance exists
    if (global.mockIntersectionObserverInstance) {
      expect(global.mockIntersectionObserverInstance.observe).toHaveBeenCalled();

      // Simulate intersection
      global.mockIntersectionObserverInstance.simulateIntersection(true);

      // Run the timers to process any setTimeout calls
      vi.runAllTimers();

      // Verify that the disconnect was called (since we set a timeout to disconnect after animation)
      expect(global.mockIntersectionObserverInstance.disconnect).toHaveBeenCalled();
    }
  });

  it('properly cleans up the observer on unmount', () => {
    const { unmount } = renderPricing();

    expect(global.mockIntersectionObserverInstance).not.toBeNull();

    if (global.mockIntersectionObserverInstance) {
      expect(global.mockIntersectionObserverInstance.observe).toHaveBeenCalled();

      // Unmount the component
      unmount();

      // The useEffect cleanup should call disconnect
      expect(global.mockIntersectionObserverInstance.disconnect).toHaveBeenCalled();
    }
  });

  it('opens the Chrome Web Store when the Free tier CTA is clicked', () => {
    renderPricing();

    fireEvent.click(screen.getByRole('button', { name: 'Start Free' }));

    expect(window.open).toHaveBeenCalledWith(
      'https://chromewebstore.google.com/detail/ngnhijamcbadkalghdpbnecgjlocnmke?utm_source=item-share-cb',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to /settings when the Pro tier CTA is clicked', () => {
    renderPricing();

    fireEvent.click(screen.getByRole('button', { name: 'Go Pro' }));

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('navigates to /settings when the Lifetime tier CTA is clicked', () => {
    renderPricing();

    fireEvent.click(screen.getByRole('button', { name: 'Claim Lifetime Access' }));

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(window.open).not.toHaveBeenCalled();
  });
});

// Augment the global interface
declare global {
  // eslint-disable-next-line no-var
  var mockIntersectionObserverInstance: IMockIntersectionObserver | null;
}
