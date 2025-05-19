import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AboutUs from '../components/AboutUs';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock child components used in AboutUs
vi.mock('../components/Navbar', () => ({
  default: ({ isScrolled }: { isScrolled: boolean }) => (
    <div aria-label="navbar" data-is-scrolled={isScrolled}>
      Navbar Component
    </div>
  ),
}));

vi.mock('../components/Footer', () => ({
  default: () => <div>Footer Component</div>,
}));

vi.mock('../components/Carousel', () => ({
  default: () => <div>Team Carousel Component</div>,
}));

describe('AboutUs', () => {
  // Store mocked callbacks and elements
  let observerCallback: IntersectionObserverCallback | null = null;
  let observedElement: Element | null = null;
  let unobserveSpy = vi.fn();
  let disconnectSpy = vi.fn();
  let observeSpy = vi.fn();
  let mockIntersectionObserver: any;
  
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    
    // Reset stored references
    observerCallback = null;
    observedElement = null;
    
    // Create fresh spies
    observeSpy = vi.fn().mockImplementation((element: Element) => {
      observedElement = element;
    });
    unobserveSpy = vi.fn();
    disconnectSpy = vi.fn();
    
    // Mock IntersectionObserver
    mockIntersectionObserver = vi.fn().mockImplementation((callback, _) => {
      observerCallback = callback;
      
      return {
        observe: observeSpy,
        unobserve: unobserveSpy,
        disconnect: disconnectSpy,
      };
    });
    
    // @ts-ignore
    window.IntersectionObserver = mockIntersectionObserver;
    
    // Mock window.open
    window.open = vi.fn();
    
    // Mock scroll events
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    
    // Clean up DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const renderAboutUs = () => {
    return render(
      <BrowserRouter>
        <AboutUs />
      </BrowserRouter>
    );
  };

  it('renders About Us page with all main components', () => {
    const { container } = renderAboutUs();
    
    // Check that main heading is present by looking for the h1 first
    const heading = container.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('About Canvas to Notion');
    
    // Check that key sections are rendered
    expect(screen.getByText('Our Story')).toBeInTheDocument();
    expect(screen.getByText('Meet Our Team')).toBeInTheDocument();
    
    // Check for the mocked components
    expect(screen.getByText('Navbar Component')).toBeInTheDocument();
    expect(screen.getByText('Team Carousel Component')).toBeInTheDocument();
    expect(screen.getByText('Footer Component')).toBeInTheDocument();
    
    // Check for button 
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('updates navbar when scrolling', () => {
    renderAboutUs();
    
    // Get navbar element
    const navbar = screen.getByLabelText('navbar');
    
    // Initially navbar should not be scrolled
    expect(navbar).toHaveAttribute('data-is-scrolled', 'false');
    
    // Simulate scrolling
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 100 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Navbar should now be scrolled
    expect(navbar).toHaveAttribute('data-is-scrolled', 'true');
    
    // Simulate scrolling back to top
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 0 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Navbar should not be scrolled again
    expect(navbar).toHaveAttribute('data-is-scrolled', 'false');
  });

  it('animates story section when it comes into view', () => {
    const { container } = renderAboutUs();
    
    // CSS modules are applied with dynamic classes, so we need to find the element using a class name that contains 'storySection'
    const storySection = container.querySelector('[class*="storySection"]');
    expect(storySection).not.toBeNull();
    
    // Verify the observe function was called
    expect(observeSpy).toHaveBeenCalled();
    
    // Only proceed with the test if we have both the callback and an observed element
    if (!observerCallback || !observedElement || !storySection) {
      // This should never happen in a successful test, but we need this check for TypeScript
      throw new Error('Required test elements or mocks are missing');
    }
    
    // Now TypeScript knows these values are not null
    const callback = observerCallback;
    const element = observedElement;
    
    // Simulate intersection observer callback being triggered
    act(() => {
      const entries: IntersectionObserverEntry[] = [{
        isIntersecting: true,
        target: element,
        boundingClientRect: new DOMRect(),
        intersectionRatio: 1,
        intersectionRect: new DOMRect(),
        rootBounds: null,
        time: 0,
      }];
      
      callback(entries, {} as IntersectionObserver);
    });
    
    // After intersection, storyVisible should be true, which adds a specific class
    const hasVisibleClass = storySection.classList.toString().includes('storyVisible');
    expect(hasVisibleClass).toBe(true);
  });

  it('opens Chrome Web Store when button is clicked', () => {
    renderAboutUs();
    
    // Find and click the CTA button
    const ctaButton = screen.getByRole('button', { name: /coming soon/i });
    fireEvent.click(ctaButton);
    
    // Verify window.open was called with the correct URL
    expect(window.open).toHaveBeenCalledWith(
      'https://chromewebstore.google.com/',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('cleans up event listeners on unmount', () => {
    // Spy on window event listeners
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    // Mock React's useEffect cleanup function
    const useEffectCleanupMock = vi.fn();
    
    // Override useEffect to capture cleanup functions
    vi.spyOn(React, 'useEffect').mockImplementation((effect, _) => {
      // Call the effect function and store any returned cleanup function
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        useEffectCleanupMock.mockImplementationOnce(cleanup);
      }
      return undefined;
    });
    
    // Render the component
    const { unmount } = renderAboutUs();
    
    // Verify that addEventListener was called for scroll
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    
    // Restore React.useEffect before unmount to avoid interference
    vi.mocked(React.useEffect).mockRestore();
    
    // Unmount the component
    unmount();
    
    // Verify that removeEventListener was called for scroll
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
}); 