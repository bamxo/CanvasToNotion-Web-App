import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import GradientBackgroundWrapper from '../components/GradientBackgroundWrapper';
import { GradientBackground } from 'react-gradient-animation';

// Mock react-gradient-animation
vi.mock('react-gradient-animation', () => ({
  GradientBackground: vi.fn(() => <div data-testid="mocked-gradient-background" />)
}));

// Mock the CSS module
vi.mock('../components/GradientBackgroundWrapper.module.css', () => ({
  default: {
    backgroundContainer: 'backgroundContainer-mock',
    noiseOverlay: 'noiseOverlay-mock'
  }
}));

describe('GradientBackgroundWrapper Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    const { container } = render(<GradientBackgroundWrapper />);
    expect(container).toBeTruthy();
  });

  it('includes the GradientBackground component with correct props', () => {
    render(<GradientBackgroundWrapper />);
    
    expect(GradientBackground).toHaveBeenCalledWith(
      expect.objectContaining({
        colors: {
          particles: ['#EA5C24', '#0E0E0E', '#560C68'],
          background: '#0E0E0E'
        },
        blending: 'overlay',
        speed: { x: { min: 0.5, max: 2 }, y: { min: 0.5, max: 2 } }
      }),
      expect.anything()
    );
  });

  it('includes the noise overlay div', () => {
    const { container } = render(<GradientBackgroundWrapper />);
    const noiseOverlay = container.querySelector('.noiseOverlay-mock');
    expect(noiseOverlay).toBeInTheDocument();
  });

  it('applies the correct styling for the background container', () => {
    const { container } = render(<GradientBackgroundWrapper />);
    const backgroundContainer = container.firstChild;
    
    expect(backgroundContainer).toHaveClass('backgroundContainer-mock');
  });

  // Test that verifies the component structure
  it('renders the expected component structure', () => {
    const { container } = render(<GradientBackgroundWrapper />);
    
    // Component should have the following structure:
    // 1. A div with backgroundContainer class
    // 2. Inside it, a div with fixed position styling
    // 3. Inside that, the GradientBackground component
    // 4. A sibling div with noiseOverlay class
    
    const rootElement = container.firstChild;
    expect(rootElement).toBeInTheDocument();
    expect(rootElement?.childNodes.length).toBe(2);
    
    // Check that the gradient background and noise overlay are siblings
    const firstChild = rootElement?.childNodes[0];
    const secondChild = rootElement?.childNodes[1];
    
    expect(firstChild).toBeInTheDocument();
    expect(secondChild).toHaveClass('noiseOverlay-mock');
  });
  
  // Test for memoization behavior
  it('is wrapped with React.memo for performance optimization', () => {
    // Since we can't directly test that React.memo was used,
    // we can verify that the component doesn't rerender unnecessarily
    
    const { rerender } = render(<GradientBackgroundWrapper />);
    
    // First render should have called GradientBackground once
    expect(GradientBackground).toHaveBeenCalledTimes(1);
    
    // Rerender should not cause additional calls if properly memoized
    rerender(<GradientBackgroundWrapper />);
    
    // Should still be called only once if memo is working
    expect(GradientBackground).toHaveBeenCalledTimes(1);
  });
}); 