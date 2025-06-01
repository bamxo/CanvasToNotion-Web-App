import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FAQ from '../components/FAQ';

describe('FAQ Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the FAQ section with title', () => {
    render(<FAQ />);
    
    // Check for section title
    expect(screen.getByText('Have Questions?')).toBeInTheDocument();
  });

  it('renders all FAQ items', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Check for all questions using within
      expect(within(faqContainer).getAllByText('Is Canvas to Notion free to use?').length).toBeGreaterThan(0);
      expect(within(faqContainer).getAllByText('How do I connect Notion and Canvas?').length).toBeGreaterThan(0);
      expect(within(faqContainer).getAllByText('Is my data secure?').length).toBeGreaterThan(0);
      expect(within(faqContainer).getAllByText('Does it work with all schools?').length).toBeGreaterThan(0);
    }
  });

  it('expands an FAQ item when clicked', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    expect(faqContainer).not.toBeNull();
    
    if (faqContainer) {
      // Get the first FAQ item directly from the container
      const firstFaqItem = within(faqContainer).getAllByText('Is Canvas to Notion free to use?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      expect(firstFaqItem).not.toBeNull();
      
      // Initially, no items should have the 'expanded' class
      const expandedItems = container.querySelectorAll('[class*="expanded"]');
      expect(expandedItems.length).toBe(0);
      
      // Click on the first FAQ item
      if (firstFaqItem) {
        fireEvent.click(firstFaqItem);
      }
      
      // After clicking, the item should be expanded
      const expandedItemsAfterClick = container.querySelectorAll('[class*="expanded"]');
      expect(expandedItemsAfterClick.length).toBe(1);
      
      // Verify the answer is visible by checking for the paragraph element within the answer div
      const answerElement = within(firstFaqItem).getByText(/Yes! Canvas to Notion is completely free to use/i);
      expect(answerElement).toBeVisible();
    }
  });

  it('collapses an expanded FAQ item when clicked again', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Get the first FAQ item directly from the container
      const firstFaqItem = within(faqContainer).getAllByText('Is Canvas to Notion free to use?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      
      // Click to expand
      if (firstFaqItem) {
        fireEvent.click(firstFaqItem);
        
        // Verify it's expanded
        expect(firstFaqItem.classList.toString()).toContain('expanded');
        
        // Click again to collapse
        fireEvent.click(firstFaqItem);
        
        // Verify it's collapsed
        expect(firstFaqItem.classList.toString()).not.toContain('expanded');
      }
    }
  });

  it('collapses previously expanded item when a new item is clicked', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Get the FAQ items directly from the container
      const firstFaqItem = within(faqContainer).getAllByText('Is Canvas to Notion free to use?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      const secondFaqItem = within(faqContainer).getAllByText('How do I connect Notion and Canvas?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      
      // Click first item to expand it
      if (firstFaqItem && secondFaqItem) {
        fireEvent.click(firstFaqItem);
        
        // Verify first item is expanded
        expect(firstFaqItem.classList.toString()).toContain('expanded');
        
        // Click second item
        fireEvent.click(secondFaqItem);
        
        // Verify first item is collapsed and second is expanded
        expect(firstFaqItem.classList.toString()).not.toContain('expanded');
        expect(secondFaqItem.classList.toString()).toContain('expanded');
      }
    }
  });

  it('correctly shows only one expanded item at a time', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Get all FAQ items
      const questions = [
        'Is Canvas to Notion free to use?',
        'How do I connect Notion and Canvas?',
        'Is my data secure?',
        'Does it work with all schools?'
      ];
      
      const faqItems = questions.map(q => {
        return within(faqContainer).getAllByText(q)[0].closest('div[class*="faqItem"]') as HTMLElement;
      });
      
      // Click each item in sequence and verify only one is expanded at a time
      faqItems.forEach((item, index) => {
        if (item) {
          fireEvent.click(item);
          
          // Check that only the current item is expanded
          faqItems.forEach((checkItem, checkIndex) => {
            if (checkItem) {
              const hasExpandedClass = checkItem.classList.toString().includes('expanded');
              expect(hasExpandedClass).toBe(index === checkIndex);
            }
          });
        }
      });
    }
  });

  it('verifies the rotation of chevron icon when expanded', () => {
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Get the first FAQ item
      const firstFaqItem = within(faqContainer).getAllByText('Is Canvas to Notion free to use?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      
      if (firstFaqItem) {
        // Get the icon within this item
        const icon = firstFaqItem.querySelector('svg');
        expect(icon).not.toBeNull();
        
        // Initially the icon should not have the 'rotate' class
        expect(icon?.classList.toString()).not.toContain('rotate');
        
        // Click to expand
        fireEvent.click(firstFaqItem);
        
        // After clicking, the icon should have the 'rotate' class
        expect(icon?.classList.toString()).toContain('rotate');
        
        // Click again to collapse
        fireEvent.click(firstFaqItem);
        
        // After collapsing, the icon should not have the 'rotate' class
        expect(icon?.classList.toString()).not.toContain('rotate');
      }
    }
  });

  it('tests the expandedFaq state updates correctly', () => {
    // We'll directly test the component's behavior instead of mocking useState
    const { container } = render(<FAQ />);
    
    // Get the FAQ container
    const faqContainer = container.querySelector('div[class*="faqContainer"]') as HTMLElement;
    
    if (faqContainer) {
      // Get the first FAQ item 
      const firstFaqItem = within(faqContainer).getAllByText('Is Canvas to Notion free to use?')[0].closest('div[class*="faqItem"]') as HTMLElement;
      expect(firstFaqItem).not.toBeNull();
      
      if (firstFaqItem) {
        // Click to expand
        fireEvent.click(firstFaqItem);
        
        // Verify it's expanded
        expect(firstFaqItem.classList.toString()).toContain('expanded');
        
        // Get the second FAQ item
        const secondFaqItem = within(faqContainer).getAllByText('How do I connect Notion and Canvas?')[0].closest('div[class*="faqItem"]') as HTMLElement;
        
        // Click the second item
        if (secondFaqItem) {
          fireEvent.click(secondFaqItem);
          
          // First should collapse, second should expand
          expect(firstFaqItem.classList.toString()).not.toContain('expanded');
          expect(secondFaqItem.classList.toString()).toContain('expanded');
          
          // Click the second item again to collapse it
          fireEvent.click(secondFaqItem);
          
          // Second should now be collapsed
          expect(secondFaqItem.classList.toString()).not.toContain('expanded');
        }
      }
    }
  });
}); 