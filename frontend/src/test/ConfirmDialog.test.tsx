import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../components/ConfirmDialog';

afterEach(cleanup);

const baseProps = {
  open: true,
  title: 'Request a refund?',
  message: 'This cannot be undone.',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title, message and default labels when open', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Request a refund?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses custom labels', () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Request refund" cancelLabel="Keep Lifetime" />);
    expect(screen.getByRole('button', { name: 'Request refund' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Lifetime' })).toBeInTheDocument();
  });

  it('fires onConfirm / onCancel from the buttons', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels on Escape and on backdrop click', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    // backdrop is the dialog's parent element
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('locks dismissal and shows a spinner while busy', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} busy onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const confirm = screen.getByRole('button', { name: '' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
