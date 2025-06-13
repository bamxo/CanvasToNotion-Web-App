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
    
    // Verify key elements are rendered - fix the date to match actual content
    expect(screen.getByText(/last updated: january 15, 2025/i)).toBeInTheDocument();
    
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

    // Check that all major section headings are rendered - updated to match actual content
    const sections = [
      '1. Information We Collect',
      '2. How We Collect Your Data',
      '3. Data Storage Locations',
      '4. How We Use Your Data',
      '5. Data Sharing and Third-Party Services',
      '6. Chrome Extension Permissions',
      '7. Data Security and Retention',
      '8. International Data Transfers',
      '9. Your Rights and Control',
      '10. Technical Implementation',
      '11. Children\'s Privacy',
      '12. Changes to This Policy',
      '13. Contact Us'
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
    
    // Check for specific subsections - updated to match actual content
    const subsectionTitles = [
      '1.1 Personal Information',
      '1.2 Canvas Academic Data',
      '3.1 Local Storage \\(Chrome Extension\\)',
      '3.2 Firebase Realtime Database'
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
    
    // Check section 5 for data sharing text (updated section number and content)
    const section5 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('5. Data Sharing and Third-Party Services'));
    expect(section5).toBeDefined();
    if (section5) {
      expect(section5.textContent).toMatch(/we do not sell, rent, or share your personal information with third parties for marketing purposes/i);
    }
    
    // Check section 7 for security text (updated section number and content)
    const section7 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('7. Data Security and Retention'));
    expect(section7).toBeDefined();
    if (section7) {
      expect(section7.textContent).toMatch(/https encryption for all api communications/i);
    }
    
    // Check section 11 for children's privacy text (updated section number)
    const section11 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('11. Children\'s Privacy'));
    expect(section11).toBeDefined();
    if (section11) {
      expect(section11.textContent).toMatch(/not intended for children under 13/i);
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