import { render, screen, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Privacy from '../components/Privacy';

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock scrollY property
Object.defineProperty(window, 'scrollY', {
  value: 0,
  writable: true
});

// Mock components that are used in Privacy.tsx
vi.mock('../components/Navbar', () => ({
  default: ({ isScrolled }: { isScrolled: boolean }) => (
    <nav aria-label="main" data-scrolled={isScrolled.toString()}>
      Navbar Component
    </nav>
  ),
}));

vi.mock('../components/Footer', () => ({
  default: () => (
    <footer>Footer Component</footer>
  ),
}));

describe('Privacy Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset scrollY value before each test
    Object.defineProperty(window, 'scrollY', { value: 0 });
    
    // Clean up any previous renders
    cleanup();
  });

  afterEach(() => {
    vi.resetAllMocks();
    cleanup();
  });

  it('renders the Privacy component with all sections', () => {
    const { container } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    // Check for main heading
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
    
    // Verify key elements are rendered
    expect(screen.getByText(/last updated: april 23, 2025/i)).toBeInTheDocument();
    
    // Get introduction paragraph
    const introSection = container.querySelector('.' + Object.values(container.querySelector('div[class^="_introduction_"]')?.classList || [])[0]);
    expect(introSection).toBeInTheDocument();
    
    // Check for privacy policy explanation text
    expect(screen.getByText(/this privacy policy \("policy"\) explains how canvas to notion/i)).toBeInTheDocument();
  });

  it('renders all required sections of the Privacy page', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    // Check that all major section headings are rendered
    const sections = [
      '1. Information We Collect',
      '2. How We Use Your Data',
      '3. Data Sharing',
      '4. Cookies and Tracking',
      '5. Data Security',
      '6. Your Rights',
      '7. International Users',
      '8. Children\'s Privacy',
      '9. Retention',
      '10. Changes to This Policy',
      '11. Contact Us'
    ];

    // Find all h2 elements and check if they contain our section titles
    const headings = screen.getAllByRole('heading', { level: 2 }).filter(h => 
      h.textContent !== 'Canvas to Notion Sync Extension'
    );
    
    sections.forEach(section => {
      const regex = new RegExp(section, 'i');
      const hasHeading = headings.some(h => regex.test(h.textContent || ''));
      expect(hasHeading).toBe(true);
    });
    
    // Check for subsection headings
    const subsectionHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(subsectionHeadings.length).toBeGreaterThanOrEqual(4); // At least 4 subsections
    
    // Check for specific subsections
    const subsectionTitles = [
      '1.1 Types of Personal Information Collected',
      '1.2 Sources of Data',
      '3.1 Third-Party Services',
      '3.2 Legal Compliance'
    ];
    
    subsectionTitles.forEach(title => {
      const regex = new RegExp(title.replace(/\./g, '\\.'), 'i');
      const hasSubsection = subsectionHeadings.some(h => regex.test(h.textContent || ''));
      expect(hasSubsection).toBe(true);
    });
  });

  it('updates navbar when scrolling down and up', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    const { container } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    // Get the navbar within the current container to avoid duplicates
    const navbar = container.querySelector('[data-scrolled]');
    expect(navbar).not.toBeNull();
    
    if (navbar) {
      // Initially the navbar should not be scrolled
      expect(navbar.getAttribute('data-scrolled')).toBe('false');
      
      // Simulate scrolling down more than 50px
      act(() => {
        // Set scrollY to 60px
        Object.defineProperty(window, 'scrollY', { value: 60 });
        // Dispatch scroll event
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Navbar should now be in scrolled state
      expect(navbar.getAttribute('data-scrolled')).toBe('true');
      
      // Simulate scrolling back to top
      act(() => {
        // Reset scrollY to 0
        Object.defineProperty(window, 'scrollY', { value: 0 });
        // Dispatch scroll event
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Navbar should no longer be in scrolled state
      expect(navbar.getAttribute('data-scrolled')).toBe('false');
    }
  });

  it('adds and removes scroll event listener on mount and unmount', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    // Spy on addEventListener and removeEventListener
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    // Render the component
    const { unmount } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );
    
    // Verify the event listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    
    // Unmount the component
    unmount();
    
    // Verify the event listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('renders specific content sections correctly', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    const { container } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    // Check specific content in different sections using container queries
    const sections = container.querySelectorAll('section');
    
    // Check section 4 for cookies text
    const section4 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('4. Cookies and Tracking'));
    expect(section4).toBeDefined();
    if (section4) {
      expect(section4.textContent).toMatch(/we do not use tracking cookies or behavioral advertising/i);
    }
    
    // Check section 5 for security text
    const section5 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('5. Data Security'));
    expect(section5).toBeDefined();
    if (section5) {
      expect(section5.textContent).toMatch(/we use https encryption/i);
    }
    
    // Check section 8 for children's privacy text
    const section8 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('8. Children\'s Privacy'));
    expect(section8).toBeDefined();
    if (section8) {
      expect(section8.textContent).toMatch(/not intended for children under 13/i);
    }
    
    // Check for the contact email link
    const emailLinks = container.querySelectorAll('a[href^="mailto:canvastonotioninfo@gmail.com"]');
    expect(emailLinks.length).toBeGreaterThan(0);
  });

  it('handles edge cases of scrolling behavior', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    const { container } = render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );
    
    // Get the navbar within the current container to avoid duplicates
    const navbar = container.querySelector('[data-scrolled]');
    expect(navbar).not.toBeNull();
    
    if (navbar) {
      // Test boundary condition: exactly at threshold
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 50 });
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Still should not be scrolled at exactly 50px
      expect(navbar.getAttribute('data-scrolled')).toBe('false');
      
      // Test boundary condition: just over threshold
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 51 });
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Should be scrolled at 51px
      expect(navbar.getAttribute('data-scrolled')).toBe('true');
    }
  });
}); 