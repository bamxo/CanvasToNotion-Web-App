import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SplashScreen from '../components/SplashScreen';
import styles from '../components/SplashScreen.module.css';

describe('SplashScreen Component', () => {
  it('renders correctly without fadeOut prop', () => {
    const { container } = render(<SplashScreen />);
    
    // Check if the main container has the correct class
    const splashScreen = container.querySelector('div');
    expect(splashScreen?.className).toContain(styles.splashScreen);
    expect(splashScreen?.className).not.toContain(styles.fadeOut);
    
    // Check if logo is present
    const logo = container.querySelector('svg');
    expect(logo).toBeInTheDocument();
    expect(logo?.className).toContain(styles.logo);
    
    // Check if loading spinner is present
    const loadingSpinner = container.querySelector(`.${styles.loadingSpinner}`);
    expect(loadingSpinner).toBeInTheDocument();
  });
  
  it('renders correctly with fadeOut=true prop', () => {
    const { container } = render(<SplashScreen fadeOut={true} />);
    
    // Check if the main container has both classes
    const splashScreen = container.querySelector('div');
    expect(splashScreen?.className).toContain(styles.splashScreen);
    expect(splashScreen?.className).toContain(styles.fadeOut);
    
    // Check if content container is present
    const contentContainer = container.querySelector(`.${styles.content}`);
    expect(contentContainer).toBeInTheDocument();
  });
  
  it('renders correctly with fadeOut=false prop', () => {
    const { container } = render(<SplashScreen fadeOut={false} />);
    
    // Check if the main container has the splashScreen class but not fadeOut
    const splashScreen = container.querySelector('div');
    expect(splashScreen?.className).toContain(styles.splashScreen);
    expect(splashScreen?.className).not.toContain(styles.fadeOut);
  });
  
  it('renders the correct SVG elements', () => {
    const { container } = render(<SplashScreen />);
    
    // Check SVG is present with correct attributes
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '184');
    expect(svg).toHaveAttribute('height', '108');
    expect(svg).toHaveAttribute('viewBox', '0 0 184 108');
    
    // Check if SVG contains the path elements
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
    
    // Check the fill attribute of each path
    paths.forEach(path => {
      expect(path).toHaveAttribute('fill', '#F05323');
    });
  });
}); 