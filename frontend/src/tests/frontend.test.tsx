import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Header from '../components/Header';
import PasswordGenerator from '../components/PasswordGenerator';
import type { WalletState } from '../types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('Frontend Component Tests', () => {
  // Test 1: Header renders "Connect Wallet" when disconnected
  test('Header renders Connect Wallet button when disconnected', () => {
    const mockWallet: WalletState = {
      connected: false,
      publicKey: null,
      network: 'testnet',
      isDemo: false,
    };

    render(
      <Header
        wallet={mockWallet}
        isUnlocked={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onLock={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: /Connect Wallet/i });
    expect(button).toBeInTheDocument();
  });

  // Test 2: Header displays demo badge when in demo mode
  test('Header displays Demo Mode badge when in demo mode', () => {
    const mockWallet: WalletState = {
      connected: true,
      publicKey: 'DEMO_PUBLIC_KEY',
      network: 'testnet',
      isDemo: true,
    };

    render(
      <Header
        wallet={mockWallet}
        isUnlocked={true}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onLock={() => {}}
      />
    );

    expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    expect(screen.getByText('Demo Vault')).toBeInTheDocument();
  });

  // Test 3: PasswordGenerator renders input controls and generates a password
  test('PasswordGenerator renders length slider and default controls', () => {
    render(<PasswordGenerator compact={false} />);

    // Verify header exists
    expect(screen.getByText('Password Generator')).toBeInTheDocument();

    // Verify copy & refresh buttons exist
    const copyButton = document.getElementById('gen-copy-btn');
    const refreshButton = document.getElementById('gen-refresh-btn');
    expect(copyButton).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();

    // Verify character length slider exists
    const slider = document.getElementById('gen-length-slider');
    expect(slider).toBeInTheDocument();
  });
});
