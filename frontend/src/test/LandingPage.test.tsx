import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LandingPage from '../components/LandingPage';

// Mock all child components
vi.mock('../components/Navbar', () => ({
  default: ({ isScrolled }: { isScrolled: boolean }) => (
    <div data-testid="navbar" data-is-scrolled={isScrolled}>Navbar Component</div>
  ),
}));

vi.mock('../components/Hero', () => ({
  default: () => <div data-testid="hero">Hero Component</div>,
}));

vi.mock('../components/BrowserMockup', () => ({
  default: () => <div data-testid="browser-mockup">BrowserMockup Component</div>,
}));

vi.mock('../components/Features', () => ({
  default: () => <div data-testid="features">Features Component</div>,
}));

vi.mock('../components/FAQ', () => ({
  default: () => <div data-testid="faq">FAQ Component</div>,
}));

vi.mock('../components/FinalCTA', () => ({
  default: () => <div data-testid="final-cta">FinalCTA Component</div>,
}));

vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="footer">Footer Component</div>,
}));

vi.mock('../components/SplashScreen', () => ({
  default: ({ fadeOut }: { fadeOut: boolean }) => (
    <div data-testid="splash-screen" data-fade-out={String(fadeOut)}>
      Splash Screen
    </div>
  ),
}));

// Mock router components as needed
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
}));

describe('LandingPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    
    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn().mockImplementation((_) => {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
    
    // @ts-ignore - mock global
    window.IntersectionObserver = mockIntersectionObserver;
    
    // Mock scroll events
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    
    // Clean up any previous elements to avoid duplicate elements in DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders splash screen initially and transitions to main content', () => {
    const { container } = render(<LandingPage />);
    
    // Initially, splash screen should be visible
    const splashScreen = screen.getByTestId('splash-screen');
    expect(splashScreen).toBeInTheDocument();
    
    // Container should have hidden class initially
    const mainContainer = container.querySelector(`[class*="container"]`);
    expect(mainContainer?.className).toContain('hidden');
    
    // Fast-forward beyond the splash screen and fade durations
    act(() => {
      // Complete the entire transition
      vi.advanceTimersByTime(3000); // More than enough time for splash + fade
      vi.runAllTimers();
    });
    
    // After the transition, container should be visible
    expect(mainContainer?.className).toContain('visible');
    
    // Check that all components are rendered
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('browser-mockup')).toBeInTheDocument();
    expect(screen.getByTestId('features')).toBeInTheDocument();
    expect(screen.getByTestId('faq')).toBeInTheDocument();
    expect(screen.getByTestId('final-cta')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
  
  it('updates navbar when scrolling', () => {
    // Render the component in isolation for this test
    document.body.innerHTML = '';
    const { container } = render(<LandingPage />);
    
    // Skip splash screen
    act(() => {
      vi.advanceTimersByTime(3000); // Ensure we're past splash + fade
      vi.runAllTimers();
    });
    
    // Get the navbar within the current container to avoid duplicates
    const navbar = container.querySelector('[data-testid="navbar"]');
    if (!navbar) throw new Error('Navbar not found');
    
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
  
  it('sets up and cleans up properly', () => {
    // Mock for the addEventListener/removeEventListener
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<LandingPage />);
    
    // Check that scroll listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    
    // Unmount component
    unmount();
    
    // Check that scroll listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
  
  it('adds visibility class to elements when they intersect', () => {
    // Mock classList.add function to verify it's called
    const mockClassListAdd = vi.fn();
    
    render(<LandingPage />);
    
    // Get the IntersectionObserver mock
    const mockIntersectionObserver = window.IntersectionObserver;
    
    // Verify IntersectionObserver was created
    expect(mockIntersectionObserver).toHaveBeenCalled();
    
    // Get the callback that was passed to IntersectionObserver
    const [callback] = (mockIntersectionObserver as unknown as jest.Mock).mock.calls[0];
    
    // Create a mock entry with isIntersecting = true
    const mockEntry = {
      isIntersecting: true,
      target: {
        classList: {
          add: mockClassListAdd,
        },
      },
    };
    
    // Call the callback with the mock entry
    callback([mockEntry]);
    
    // Verify the class was added
    expect(mockClassListAdd).toHaveBeenCalled();
  });
  
  it('handles timing for splash screen fade transitions correctly', () => {
    const { container } = render(<LandingPage />);
    
    // Initially content should be hidden
    expect(container.querySelector(`[class*="visible"]`)).toBeNull();
    
    // Fast-forward to just after splash duration
    act(() => {
      vi.advanceTimersByTime(2050); // Just after splash screen duration
      vi.runAllTimers();
    });
    
    // ContentVisible should now be true, even if still fading
    expect(container.querySelector(`[class*="visible"]`)).not.toBeNull();
    
    // At this point, splash screen might still be visible during its fade out
    
    // Fast-forward more to complete the fade
    act(() => {
      vi.advanceTimersByTime(1000); // Complete any remaining transitions
      vi.runAllTimers();
    });
    
    // The container should be fully visible
    const mainContainer = container.querySelector(`[class*="container"]`);
    expect(mainContainer?.className).toContain('visible');
  });
}); 