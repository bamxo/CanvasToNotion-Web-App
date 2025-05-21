import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Features from '../components/Features';

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

describe('Features Component', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    global.mockIntersectionObserverInstance = null;
    
    // Mock setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.mockIntersectionObserverInstance = null;
  });
  
  it('renders the component with the correct title', () => {
    render(<Features />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });
  
  it('renders all feature cards with correct content', () => {
    const { container } = render(<Features />);
    
    // Get the feature grid container
    const featureGrid = container.querySelector('[class*="featureGrid"]');
    expect(featureGrid).not.toBeNull();
    
    if (featureGrid) {
      // Check the number of feature cards
      const cards = featureGrid.querySelectorAll('[class*="featureCard"]');
      expect(cards.length).toBe(4);
      
      // Check the content of each card
      const cardContents = [
        {
          title: 'Automatic Sync',
          description: 'Your Canvas assignments are automatically synced to your Notion workspace in real-time.'
        },
        {
          title: 'Smart Organization',
          description: 'Assignments are organized by course and due date in your Notion database.'
        },
        {
          title: 'Stay on Track',
          description: 'Never miss a deadline with integrated Notion reminders and progress tracking.'
        },
        {
          title: 'Secure & Private',
          description: 'Your data is encrypted and securely synchronized between Canvas and Notion.'
        }
      ];
      
      cards.forEach((card, index) => {
        const { title, description } = cardContents[index];
        // Cast to HTMLElement to make TypeScript happy
        const cardElement = within(card as HTMLElement);
        
        expect(cardElement.getByText(title)).toBeInTheDocument();
        expect(cardElement.getByText(description)).toBeInTheDocument();
      });
    }
  });
  
  it('sets up an intersection observer that adds animation classes', () => {
    render(<Features />);
    
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
    const { unmount } = render(<Features />);
    
    expect(global.mockIntersectionObserverInstance).not.toBeNull();
    
    if (global.mockIntersectionObserverInstance) {
      expect(global.mockIntersectionObserverInstance.observe).toHaveBeenCalled();
      
      // Unmount the component
      unmount();
      
      // The useEffect cleanup should call disconnect
      expect(global.mockIntersectionObserverInstance.disconnect).toHaveBeenCalled();
    }
  });
});

// Augment the global interface
declare global {
  var mockIntersectionObserverInstance: IMockIntersectionObserver | null;
} 