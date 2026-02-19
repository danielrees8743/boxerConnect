import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectButton } from '../ConnectButton';

describe('ConnectButton', () => {
  it('renders "Connect" button in idle state by default', () => {
    render(<ConnectButton onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('does not call onConnect when already in connected state', () => {
    const onConnect = vi.fn();
    render(<ConnectButton onConnect={onConnect} initialState="connected" />);
    fireEvent.click(screen.getByRole('button', { name: /connected/i }));
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('calls onConnect and transitions to pending when clicked from idle', () => {
    const onConnect = vi.fn();
    render(<ConnectButton onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /request sent/i })).toBeInTheDocument();
  });

  it('renders "Request Sent" and is disabled when initialState is pending', () => {
    render(<ConnectButton onConnect={vi.fn()} initialState="pending" />);
    const btn = screen.getByRole('button', { name: /request sent/i });
    expect(btn).toBeDisabled();
  });

  it('renders "Connected" and is disabled when initialState is connected', () => {
    render(<ConnectButton onConnect={vi.fn()} initialState="connected" />);
    const btn = screen.getByRole('button', { name: /connected/i });
    expect(btn).toBeDisabled();
  });

  it('does not call onConnect when already in pending state', () => {
    const onConnect = vi.fn();
    render(<ConnectButton onConnect={onConnect} initialState="pending" />);
    fireEvent.click(screen.getByRole('button', { name: /request sent/i }));
    expect(onConnect).not.toHaveBeenCalled();
  });
});
