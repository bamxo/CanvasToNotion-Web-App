import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GetStarted from '../components/GetStarted';
import * as useNotionAuthModule from '../hooks/useNotionAuth';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Setup function to render the component
const renderGetStarted = () => {
  return render(
    <BrowserRouter>
      <GetStarted />
    </BrowserRouter>
  );
};

describe('GetStarted Component', () => {
  // Spy on useNotionAuth hook with proper type
  let useNotionAuthSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = ''; // Clear the body to avoid test interference
    
    // Default mock implementation for the hook
    useNotionAuthSpy = vi.spyOn(useNotionAuthModule, 'useNotionAuth');
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useNotionAuthSpy.mockRestore();
  });

  it('renders the welcome message correctly', () => {
    renderGetStarted();
    
    expect(screen.getByRole('heading', { name: 'Welcome to Canvas to Notion!' })).toBeInTheDocument();
  });

  it('renders the three step cards correctly', () => {
    const { container } = renderGetStarted();
    
    const cards = container.querySelectorAll('[class*="card_"]');
    expect(cards.length).toBe(3);
    
    // Get only the direct child headers of the cards
    const cardHeaders = Array.from(cards).map(card => 
      card.querySelector('[class*="cardHeader_"]')
    );
    
    expect(cardHeaders.length).toBe(3);
    expect(cardHeaders[0]?.textContent).toBe('Step 1: Pin Extension');
    expect(cardHeaders[1]?.textContent).toBe('Step 2: Connect Notion');
    expect(cardHeaders[2]?.textContent).toBe('Step 3: Start Syncing');
  });

  it('navigates to settings when the Go to Settings button is clicked', async () => {
    const { container } = renderGetStarted();
    
    // Find the "Go to Settings" button directly by its text content
    const settingsButton = screen.getByText('Go to Settings', { selector: 'button' });
    expect(settingsButton).toBeInTheDocument();
    
    fireEvent.click(settingsButton);
    
    // Use setTimeout in the component, so we need to wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    }, { timeout: 1000 });
  });

  it('shows loading state when isLoading is true', () => {
    useNotionAuthSpy.mockReturnValue({
      userInfo: null,
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: true,
      setNotionConnection: vi.fn(),
    });
    
    renderGetStarted();
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message when there is an error and no userInfo', () => {
    const errorMessage = 'Authentication failed';
    useNotionAuthSpy.mockReturnValue({
      userInfo: null,
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: errorMessage,
      isLoading: false,
      setNotionConnection: vi.fn(),
    });
    
    renderGetStarted();
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Check for Back to Login button
    const backButton = screen.getByRole('button', { name: 'Back to Login' });
    expect(backButton).toBeInTheDocument();
    
    // Click the button and check navigation
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('shows settings button in a loading state when clicked', async () => {
    const { container } = renderGetStarted();
    
    // Find the "Go to Settings" button directly by its text content
    const settingsButton = screen.getByText('Go to Settings', { selector: 'button' });
    expect(settingsButton).toBeInTheDocument();
    
    // Before click, button should not be disabled
    expect(settingsButton).not.toHaveAttribute('disabled');
    
    // Click the button
    fireEvent.click(settingsButton);
    
    // After click, button should be disabled
    expect(settingsButton).toHaveAttribute('disabled');
    
    // After the timeout, navigation should occur
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    }, { timeout: 1000 });
  });

  // Test the specific UI components/graphics by checking for elements by their role or position
  it('renders the correct UI components', () => {
    const { container } = renderGetStarted();
    
    // Verify cards are rendered
    const cards = container.querySelectorAll('[class*="card_"]');
    expect(cards.length).toBe(3);
    
    // Check for graphics containers inside each card
    const imageContainers = container.querySelectorAll('[class*="imageContainer_"]');
    expect(imageContainers.length).toBe(3);
    
    // Check for helper texts
    const helperTexts = container.querySelectorAll('[class*="helperText_"]');
    expect(helperTexts.length).toBe(3);
    
    // Check specific content in helper texts
    const helperTextContents = Array.from(helperTexts).map(el => el.textContent);
    expect(helperTextContents.some(text => text?.includes('Pin the Canvas to Notion'))).toBe(true);
    expect(helperTextContents.some(text => text?.includes('Head to Settings'))).toBe(true);
    expect(helperTextContents.some(text => text?.includes('Open Canvas'))).toBe(true);
    
    // Check note texts
    const noteTexts = container.querySelectorAll('[class*="note_"]');
    expect(noteTexts.length).toBe(3);
  });
}); 