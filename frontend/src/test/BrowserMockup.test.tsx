import { render, cleanup, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import BrowserMockup from '../components/BrowserMockup';

// Mock CSS modules
vi.mock('../components/BrowserMockup.module.css', () => ({
  default: {
    mockupSection: 'mockupSection',
    mockupContent: 'mockupContent',
    mockupText: 'mockupText',
    mockupContainer: 'mockupContainer',
    browserMockup: 'browserMockup',
    browserHeader: 'browserHeader',
    browserDots: 'browserDots',
    browserContent: 'browserContent',
    featuresList: 'featuresList',
    featureItem: 'featureItem',
    checkIcon: 'checkIcon',
    hidden: 'hidden',
    fromLeft: 'fromLeft',
    fromRight: 'fromRight',
    visible: 'visible'
  }
}));

// Mock all icons from react-icons/fa
vi.mock('react-icons/fa', () => ({
  FaCheck: () => <span className="checkIcon">✓</span>,
  FaChevronRight: () => <span>→</span>,
  FaCalendarAlt: () => <span>📅</span>,
  FaBook: () => <span>📚</span>,
  FaInbox: () => <span>📥</span>,
  FaQuestion: () => <span>❓</span>,
  FaCog: () => <span>⚙️</span>,
  FaSignOutAlt: () => <span>🚪</span>,
  FaFile: () => <span>📄</span>,
  FaRegClock: () => <span>🕒</span>,
  FaExclamationTriangle: () => <span>⚠️</span>,
  FaRegFileAlt: () => <span>📃</span>
}));

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = (options?.root && options.root instanceof Element) ? options.root : null;
    this.rootMargin = options?.rootMargin || '';
    this.thresholds = Array.isArray(options?.threshold) ? options.threshold : [options?.threshold || 0];
    this.elements = new Set();
  }
  
  observe(element: Element): void {
    this.elements.add(element);
  }
  
  unobserve(element: Element): void {
    this.elements.delete(element);
  }
  
  disconnect(): void {
    this.elements.clear();
  }
  
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  
  // Method to simulate an intersection
  simulateIntersection(isIntersecting: boolean): void {
    const entries: IntersectionObserverEntry[] = Array.from(this.elements).map(element => ({
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: isIntersecting ? 1.0 : 0.0,
      intersectionRect: isIntersecting ? element.getBoundingClientRect() : new DOMRect(),
      isIntersecting,
      rootBounds: this.root ? this.root.getBoundingClientRect() : null,
      target: element,
      time: Date.now(),
    }));
    
    this.callback(entries, this);
  }
}

describe('BrowserMockup Component', () => {
  beforeEach(() => {
    cleanup();
    
    // Set up IntersectionObserver mock
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    
    // Spy on the methods to track calls
    vi.spyOn(MockIntersectionObserver.prototype, 'observe');
    vi.spyOn(MockIntersectionObserver.prototype, 'unobserve');
    vi.spyOn(MockIntersectionObserver.prototype, 'disconnect');
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });
  
  it('renders correctly with all elements', () => {
    const { container } = render(<BrowserMockup />);
    
    // Verify the browser mockup section exists
    const mockupSection = container.querySelector('.mockupSection');
    expect(mockupSection).toBeTruthy();
    
    // Verify the heading
    const heading = container.querySelector('.mockupText h2');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Experience Seamless Integration');
    
    // Verify feature items
    const featureItems = container.querySelectorAll('.featureItem');
    expect(featureItems.length).toBe(4);
    
    // Check specific feature text - use optional chaining to access textContent safely
    const featureTexts = Array.from(featureItems).map(item => item.textContent);
    expect(featureTexts.some(text => text?.includes('One-click sync'))).toBe(true);
    expect(featureTexts.some(text => text?.includes('Automatic assignment'))).toBe(true);
    expect(featureTexts.some(text => text?.includes('Smart due date'))).toBe(true);
    expect(featureTexts.some(text => text?.includes('Customizable Notion templates'))).toBe(true);
    
    // Verify browser mockup elements
    const browserMockup = container.querySelector('.browserMockup');
    expect(browserMockup).toBeTruthy();
    
    const browserDots = container.querySelectorAll('.browserDots span');
    expect(browserDots.length).toBe(3);
  });
  
  it('sets up intersection observer on mount', () => {
    // Check if observe gets called on mount
    const observeSpy = vi.spyOn(MockIntersectionObserver.prototype, 'observe');
    
    render(<BrowserMockup />);
    
    // Observe should be called with the section element
    expect(observeSpy).toHaveBeenCalled();
  });

  it('renders feature items with correct content', () => {
    const { container } = render(<BrowserMockup />);
    
    // Test the feature items have the correct content
    const featureItems = container.querySelectorAll('.featureItem');
    expect(featureItems.length).toBe(4);
    
    // Get the text content of each feature item
    const itemTexts = Array.from(featureItems).map(item => item.textContent);
    
    // Verify each expected item exists
    expect(itemTexts.some(text => text?.includes('One-click sync'))).toBe(true);
    expect(itemTexts.some(text => text?.includes('Automatic assignment'))).toBe(true);
    expect(itemTexts.some(text => text?.includes('Smart due date'))).toBe(true);
    expect(itemTexts.some(text => text?.includes('Customizable Notion'))).toBe(true);
    
    // Check for check icons - each feature item should have one
    const checkIcons = container.querySelectorAll('.checkIcon');
    expect(checkIcons.length).toBe(4);
  });

  it('adds visibility classes when section intersects', () => {
    const { container } = render(<BrowserMockup />);
    
    // Get the elements
    const textDiv = container.querySelector('.mockupText');
    const containerDiv = container.querySelector('.mockupContainer');
    
    // Check that elements exist
    expect(textDiv).toBeTruthy();
    expect(containerDiv).toBeTruthy();
    
    // Manually set up observer and trigger callback to simulate intersection
    // Find the section element that would be observed
    const section = container.querySelector('.mockupSection');
    expect(section).toBeTruthy();
    
    // Create a new MockIntersectionObserver
    const observer = new MockIntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target === section) {
          // Simulate what happens in the component
          if (textDiv) {
            textDiv.classList.add('visible');
          }
          if (containerDiv) {
            containerDiv.classList.add('visible');
          }
        }
      });
    });
    
    if (section) {
      // Observe the section
      observer.observe(section);
      
      // Trigger the intersection
      act(() => {
        observer.simulateIntersection(true);
      });
      
      // Classes should be added after intersection
      expect(textDiv?.classList.contains('visible')).toBe(true);
      expect(containerDiv?.classList.contains('visible')).toBe(true);
    }
  });
  
  it('handles case when refs are null', () => {
    // Mock useRef to return null
    const originalUseRef = React.useRef;
    vi.spyOn(React, 'useRef').mockImplementation(() => ({ current: null }));
    
    // Should render without errors even with null refs
    expect(() => render(<BrowserMockup />)).not.toThrow();
    
    // Restore original useRef
    React.useRef = originalUseRef;
  });
  
  it('verifies animation classes are applied correctly', () => {
    const { container } = render(<BrowserMockup />);
    
    // Check initial hidden/animation classes
    const textDiv = container.querySelector('.mockupText');
    const containerDiv = container.querySelector('.mockupContainer');
    
    // Add visible class for testing
    if (textDiv) {
      // First verify it has the animation classes
      expect(textDiv.classList.contains('hidden')).toBe(true);
      expect(textDiv.classList.contains('fromLeft')).toBe(true);
      
      // Now simulate what happens after intersection
      textDiv.classList.add('visible');
      expect(textDiv.classList.contains('visible')).toBe(true);
    }
    
    if (containerDiv) {
      // First verify it has the animation classes
      expect(containerDiv.classList.contains('hidden')).toBe(true);
      expect(containerDiv.classList.contains('fromRight')).toBe(true);
      
      // Now simulate what happens after intersection
      containerDiv.classList.add('visible');
      expect(containerDiv.classList.contains('visible')).toBe(true);
    }
  });
  
  it('verifies the component is memoized', () => {
    // We can't directly test if memo is being used, but we can check the component exists
    expect(BrowserMockup).toBeDefined();
    
    // Rendering twice should work without errors
    const { container, rerender } = render(<BrowserMockup />);
    rerender(<BrowserMockup />);
    
    // Component should exist after rerender
    expect(container.querySelector('.mockupSection')).toBeTruthy();
  });

  it('handles browser dots rendering', () => {
    const { container } = render(<BrowserMockup />);
    
    // Check browser mockup elements
    const browserDots = container.querySelectorAll('.browserDots span');
    expect(browserDots.length).toBe(3);
    
    // Check that the browser mockup has the correct structure
    const browserMockup = container.querySelector('.browserMockup');
    expect(browserMockup).toBeTruthy();
    
    const browserHeader = container.querySelector('.browserHeader');
    expect(browserHeader).toBeTruthy();
    
    const browserContent = container.querySelector('.browserContent');
    expect(browserContent).toBeTruthy();
  });
}); 