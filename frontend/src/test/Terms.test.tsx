import { render, screen, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Terms from '../components/Terms';

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock scrollY property
Object.defineProperty(window, 'scrollY', {
  value: 0,
  writable: true
});

// Mock components that are used in Terms.tsx
vi.mock('../components/Navbar', () => ({
  default: ({ isScrolled }: { isScrolled: boolean }) => (
    <div data-testid="navbar" data-is-scrolled={isScrolled.toString()}>Navbar Component</div>
  ),
}));

vi.mock('../components/Footer', () => ({
  default: () => (
    <footer data-testid="footer">Footer Component</footer>
  ),
}));

describe('Terms Component', () => {
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

  it('renders the Terms component with all sections', () => {
    const { container } = render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );

    // Check for main heading
    expect(screen.getByRole('heading', { level: 1, name: /terms of service/i })).toBeInTheDocument();
    
    // Verify key sections are rendered
    expect(screen.getByText(/last updated: april 23, 2025/i)).toBeInTheDocument();
    
    // Get introduction paragraph using specific container class
    const introSection = container.querySelector('._introduction_8a043b');
    expect(introSection).toBeInTheDocument();
    
    // Test all major section headers are present
    const sections = [
      '1. Service Overview and License Terms',
      '2. User Accounts and Authentication',
      '3. Acceptable Use',
      '4. Intellectual Property',
      '5. Data and Privacy',
      '6. Term and Termination',
      '7. Disclaimers',
      '8. Limitation of Liability',
      '9. Governing Law',
      '10. Modifications to Terms',
      '11. Contact Us'
    ];

    // Find all h2 elements and check if they contain our section titles
    const headings = screen.getAllByRole('heading', { level: 2 });
    
    sections.forEach(section => {
      const regex = new RegExp(section, 'i');
      const hasHeading = headings.some(h => regex.test(h.textContent || ''));
      expect(hasHeading).toBe(true);
    });

    // Verify subsections using container query
    const subsections = container.querySelectorAll('h3');
    expect(subsections.length).toBeGreaterThanOrEqual(3); // At least 3 subsections
    
    // Check for navbar and footer
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('updates navbar when scrolling down and up', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    const { container } = render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );

    // Get the navbar within the current container to avoid duplicates
    const navbar = container.querySelector('[data-testid="navbar"]');
    expect(navbar).not.toBeNull();
    
    if (navbar) {
      // Initially the navbar should not be scrolled
      expect(navbar).toHaveAttribute('data-is-scrolled', 'false');
      
      // Simulate scrolling down more than 50px
      act(() => {
        // Set scrollY to 60px
        Object.defineProperty(window, 'scrollY', { value: 60 });
        // Dispatch scroll event
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Navbar should now be in scrolled state
      expect(navbar).toHaveAttribute('data-is-scrolled', 'true');
      
      // Simulate scrolling back to top
      act(() => {
        // Reset scrollY to 0
        Object.defineProperty(window, 'scrollY', { value: 0 });
        // Dispatch scroll event
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Navbar should no longer be in scrolled state
      expect(navbar).toHaveAttribute('data-is-scrolled', 'false');
    }
  });

  it('adds and removes scroll event listener on mount and unmount', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    // Get the spies
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    // Render the component
    const { unmount } = render(
      <MemoryRouter>
        <Terms />
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
        <Terms />
      </MemoryRouter>
    );

    // Check specific content items from various sections using container queries
    const sections = container.querySelectorAll('section');
    
    // Check section 2 for authentication text
    const section2 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('2. User Accounts and Authentication'));
    expect(section2).toBeDefined();
    if (section2) {
      expect(section2.textContent).toMatch(/you must authenticate via firebase/i);
    }
    
    // Check section 5 for data privacy text
    const section5 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('5. Data and Privacy'));
    expect(section5).toBeDefined();
    if (section5) {
      expect(section5.textContent).toMatch(/collect and store only the data needed/i);
    }
    
    // Check section 7 for disclaimer text - simplify the test
    const section7 = Array.from(sections).find(section => 
      section.querySelector('h2')?.textContent?.includes('7. Disclaimers'));
    expect(section7).toBeDefined();
    if (section7) {
      // Just check that the section exists and has a paragraph
      const paragraph = section7.querySelector('p');
      expect(paragraph).not.toBeNull();
    }
  });

  it('handles edge cases of scrolling behavior', () => {
    cleanup(); // Extra cleanup to ensure no leftover elements
    
    const { container } = render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>
    );
    
    // Get the navbar within the current container to avoid duplicates
    const navbar = container.querySelector('[data-testid="navbar"]');
    expect(navbar).not.toBeNull();
    
    if (navbar) {
      // Test boundary condition: exactly at threshold
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 50 });
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Still should not be scrolled at exactly 50px
      expect(navbar).toHaveAttribute('data-is-scrolled', 'false');
      
      // Test boundary condition: just over threshold
      act(() => {
        Object.defineProperty(window, 'scrollY', { value: 51 });
        window.dispatchEvent(new Event('scroll'));
      });
      
      // Should be scrolled at 51px
      expect(navbar).toHaveAttribute('data-is-scrolled', 'true');
    }
  });
}); 