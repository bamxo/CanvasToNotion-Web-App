import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import Navbar from '../components/Navbar';

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock scrollY property
Object.defineProperty(window, 'scrollY', {
  value: 0,
  writable: true
});

// Mock window.location.href
Object.defineProperty(window, 'location', {
  value: {
    href: '/',
  },
  writable: true
});

// Mock window.open
const openMock = vi.fn();
window.open = openMock;

// Mock components
vi.mock('../components/Footer', () => ({
  default: () => <footer>Footer Component</footer>
}));

// Create a custom test wrapper that includes Navbar
function TestWrapper({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div>
      <Navbar isScrolled={isScrolled} />
      {children}
    </div>
  );
}

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    
    // Reset scrollY value before each test
    Object.defineProperty(window, 'scrollY', { value: 0 });
  });

  afterEach(() => {
    vi.resetAllMocks();
    cleanup();
  });

  it('renders with correct structure', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Check if a navigation element exists
    const navbar = container.querySelector('nav');
    expect(navbar).toBeInTheDocument();
    
    // Check if logo is rendered within navbar
    const logo = container.querySelector('nav img');
    expect(logo).toBeInTheDocument();
    
    // Check if navigation links are rendered
    const homeLink = container.querySelector('nav a[href="/"]');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink?.textContent).toMatch(/home/i);
    
    const aboutLink = container.querySelector('nav a[href="/about"]');
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink?.textContent).toMatch(/about/i);
    
    // Check if install button is rendered
    const button = container.querySelector('nav button');
    expect(button).toBeInTheDocument();
    expect(button?.textContent).toMatch(/coming soon/i);
  });

  it('applies scrolled style when scrolling down', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Get the navbar
    const navbar = container.querySelector('nav');
    expect(navbar).toBeInTheDocument();
    
    // Initially not scrolled
    expect(navbar?.className).not.toContain('navbarScrolled');
    
    // Simulate scrolling
    act(() => {
      // Set scrollY to 60px (greater than the 50px threshold)
      Object.defineProperty(window, 'scrollY', { value: 60 });
      // Dispatch scroll event
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Now should have scrolled class
    expect(navbar?.className).toContain('navbarScrolled');
  });

  it('navigates to home when logo is clicked', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Find logo within navbar and click it
    const logo = container.querySelector('nav img');
    expect(logo).toBeInTheDocument();
    if (logo) {
      fireEvent.click(logo);
    }
    
    // Check if window.location.href was updated
    expect(window.location.href).toBe('/');
  });

  it('opens Chrome Web Store when install button is clicked', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Find install button within navbar and click it
    const button = container.querySelector('nav button');
    expect(button).toBeInTheDocument();
    if (button) {
      fireEvent.click(button);
    }
    
    // Check if window.open was called with correct URL
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith(
      'https://chromewebstore.google.com/',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('removes scrolled style when scrolling back to top', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Get the navbar
    const navbar = container.querySelector('nav');
    expect(navbar).toBeInTheDocument();
    
    // Scroll down first
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 100 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Should be scrolled
    expect(navbar?.className).toContain('navbarScrolled');
    
    // Now scroll back to top
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 0 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Should no longer be scrolled
    expect(navbar?.className).not.toContain('navbarScrolled');
  });

  it('handles exact boundary condition of scroll threshold', () => {
    const { container } = render(
      <TestWrapper>
        <div>App Content</div>
      </TestWrapper>
    );

    // Get the navbar
    const navbar = container.querySelector('nav');
    expect(navbar).toBeInTheDocument();
    
    // Set exactly at threshold
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Should not be scrolled at exactly 50px (threshold)
    expect(navbar?.className).not.toContain('navbarScrolled');
    
    // Just over threshold
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 51 });
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Should be scrolled just over threshold
    expect(navbar?.className).toContain('navbarScrolled');
  });
}); 