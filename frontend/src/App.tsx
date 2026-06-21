/**
 * App.tsx — PasswordBlock main application shell.
 *
 * Manages the overall app state flow:
 * Landing → Connect Wallet → Setup/Unlock Master Password → Dashboard
 */

import React, { useState, useCallback, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import type { AppView, PasswordEntry } from './types';
import { useWallet } from './hooks/useWallet';
import { usePasswords } from './hooks/usePasswords';
import Header from './components/Header';
import PasswordList from './components/PasswordList';
import AddPassword from './components/AddPassword';
import { fetchContractEvents } from './stellar/events';

// ── App Component ───────────────────────────────────────────────────────
const App: React.FC = () => {
  const { wallet, loading: walletLoading, connect, disconnect, displayAddress } = useWallet();
  const [appView, setAppView] = useState<AppView>('landing');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    entries,
    loading: entriesLoading,
    actionLoading,
    addEntry,
    updateEntry,
    removeEntry,
    toggleFavorite,
    loadEntries,
  } = usePasswords(wallet.publicKey, wallet.signature || null, wallet.isDemo);

  // ── Route to dashboard upon connection ───────────────────────────────
  useEffect(() => {
    if (wallet.connected && wallet.signature) {
      setAppView('dashboard');
    } else {
      setAppView('landing');
    }
  }, [wallet.connected, wallet.signature]);

  // ── Load entries when dashboard opens ───────────────────────────────
  useEffect(() => {
    if (appView === 'dashboard' && wallet.signature) {
      loadEntries();
    }
  }, [appView, wallet.signature, loadEntries]);

  // ── Poll for on-chain events for real-time updates ──────────────────
  useEffect(() => {
    if (appView !== 'dashboard' || !wallet.publicKey || wallet.isDemo) return;

    const interval = setInterval(async () => {
      const newEvents = await fetchContractEvents(wallet.publicKey!);
      if (newEvents.length > 0) {
        toast.success('On-chain changes detected. Updating vault...', {
          icon: '🔄',
          style: {
            background: '#111827',
            color: '#F1F5F9',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          },
        });
        loadEntries();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [appView, wallet.publicKey, wallet.isDemo, loadEntries]);

  // ── Track mouse for gradient glow effect & Style SWK Modal ──────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Advanced dynamic styling for the Stellar Wallets Kit Modal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check for shadow DOM host or generic SWK wrappers
            const swkHost = node.tagName.toLowerCase().includes('stellar-wallets') ? node : node.querySelector('*[id*="stellar-wallets"]');
            
            const injectStyles = (targetRoot: DocumentFragment | HTMLElement) => {
              const styleId = 'passchain-swk-theme';
              if (targetRoot.querySelector(`#${styleId}`)) return;
              
              const style = document.createElement('style');
              style.id = styleId;
              style.innerHTML = `
                /* Passchain Premium Glassmorphism Theme for SWK */
                :host {
                  --swk-color-bg: rgba(17, 24, 39, 0.95) !important;
                  --swk-color-text: #F1F5F9 !important;
                  --swk-color-border: rgba(59, 130, 246, 0.2) !important;
                  --swk-color-primary: #3B82F6 !important;
                  --swk-color-button: rgba(30, 41, 59, 0.7) !important;
                  --swk-color-button-hover: rgba(59, 130, 246, 0.2) !important;
                  --swk-border-radius: 16px !important;
                }
                * {
                  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                }
                
                /* Override white backgrounds and borders */
                div[style*="background"], div[class*="container"], div[class*="modal"] {
                  background: var(--swk-color-bg) !important;
                  backdrop-filter: blur(12px) !important;
                  color: var(--swk-color-text) !important;
                  border-color: var(--swk-color-border) !important;
                }
                
                /* Style the wallet list items */
                button, div[role="button"], li {
                  background: var(--swk-color-button) !important;
                  border: 1px solid rgba(255, 255, 255, 0.05) !important;
                  border-radius: 12px !important;
                  color: var(--swk-color-text) !important;
                  transition: all 0.3s ease !important;
                  margin-bottom: 8px !important;
                }
                
                button:hover, div[role="button"]:hover, li:hover {
                  background: var(--swk-color-button-hover) !important;
                  border-color: rgba(59, 130, 246, 0.4) !important;
                  transform: translateY(-1px) !important;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1) !important;
                }
                
                /* Install buttons specifically */
                button[class*="install"] {
                  background: rgba(59, 130, 246, 0.1) !important;
                  color: #3B82F6 !important;
                  border: 1px solid rgba(59, 130, 246, 0.2) !important;
                }
                
                /* Texts and Titles */
                span, p, h1, h2, h3, h4 {
                  color: #F8FAFC !important;
                }
                
                /* Footer text */
                div[class*="powered"] {
                  opacity: 0.7 !important;
                  font-size: 0.8rem !important;
                  border-top: 1px solid var(--swk-color-border) !important;
                  margin-top: 12px !important;
                  padding-top: 12px !important;
                }
                
                /* Hide the weird white gradient fade at bottom if it exists */
                div[style*="linear-gradient"] {
                  display: none !important;
                }
              `;
              targetRoot.appendChild(style);
            };

            // If it uses Shadow DOM (standard for SWK v2)
            if (swkHost && swkHost.shadowRoot) {
              injectStyles(swkHost.shadowRoot);
            } else if (node.innerHTML && node.innerHTML.includes('Connect Wallet')) {
              // Fallback for non-shadow DOM injection
              injectStyles(node);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  // ── Helper to show Tx toast ──────────────────────────────────────────
  const showTxToast = (message: string, hash?: string) => {
    toast.success(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 600 }}>{message}</span>
          {hash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: '#3B82F6',
                textDecoration: 'underline',
              }}
              onClick={() => toast.dismiss(t.id)}
            >
              View on Explorer: {hash.slice(0, 8)}...{hash.slice(-8)}
            </a>
          )}
        </div>
      ),
      {
        duration: 5000,
        style: {
          background: '#111827',
          color: '#F1F5F9',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        },
      }
    );
  };

  // ── Handle delete with confirmation ───────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      if (deleteConfirm === id) {
        const loadingToast = toast.loading('Transaction pending...', {
          style: {
            background: '#111827',
            color: '#F1F5F9',
            border: '1px solid rgba(255,255,255,0.06)',
          },
        });
        try {
          const result = await removeEntry(id);
          toast.dismiss(loadingToast);
          if (result.success) {
            showTxToast('Password deleted.', result.hash);
          } else {
            toast.error(result.error || 'Failed to delete password.');
          }
        } catch {
          toast.dismiss(loadingToast);
          toast.error('An unexpected error occurred.');
        }
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(id);
        toast('Click delete again to confirm.', {
          icon: '⚠️',
          style: {
            background: '#111827',
            color: '#F59E0B',
            border: '1px solid rgba(245,158,11,0.2)',
          },
        });
        setTimeout(() => setDeleteConfirm(null), 3000);
      }
    },
    [deleteConfirm, removeEntry]
  );

  // ── Handle save / update ──────────────────────────────────────────
  const handleSave = useCallback(
    async (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const loadingToast = toast.loading('Sharing with the blockchain...', {
        style: {
          background: '#111827',
          color: '#F1F5F9',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      });
      const result = await addEntry(data);
      toast.dismiss(loadingToast);
      if (result.success) {
        showTxToast('Password saved on-chain!', result.hash);
      } else {
        toast.error(result.error || 'Failed to save password.');
      }
    },
    [addEntry]
  );

  const handleUpdate = useCallback(
    async (entry: PasswordEntry) => {
      const loadingToast = toast.loading('Updating on-chain...', {
        style: {
          background: '#111827',
          color: '#F1F5F9',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      });
      const result = await updateEntry(entry);
      toast.dismiss(loadingToast);
      if (result.success) {
        showTxToast('Password updated on-chain!', result.hash);
      } else {
        toast.error(result.error || 'Failed to update password.');
      }
    },
    [updateEntry]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
    },
    [toggleFavorite]
  );

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'toast-custom',
        }}
      />

      <Header
        wallet={wallet}
        isUnlocked={appView === 'dashboard'}
        onConnect={connect}
        onDisconnect={disconnect}
        onLock={disconnect}
      />

      {/* Landing */}
      {appView === 'landing' && !wallet.connected && (
        <div className="landing-container">
          <div className="glass-card landing-card">
            <div className="landing-icon">🔐</div>
            <h1 className="landing-title">Passchain</h1>
            <p className="landing-subtitle">
              A decentralized, blockchain-powered password manager.
              Your credentials, encrypted and stored on the Stellar network.
            </p>
            <div className="landing-features">
              <div className="landing-feature">
                <span className="landing-feature-icon">🔒</span>
                <span>AES-256-GCM client-side encryption</span>
              </div>
              <div className="landing-feature">
                <span className="landing-feature-icon">⛓️</span>
                <span>Stored on Stellar blockchain via Soroban</span>
              </div>
              <div className="landing-feature">
                <span className="landing-feature-icon">👁️</span>
                <span>Zero-knowledge architecture</span>
              </div>
              <div className="landing-feature">
                <span className="landing-feature-icon">🌐</span>
                <span>Access from any browser, anywhere</span>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={connect}
              disabled={walletLoading}
              id="landing-connect-btn"
              style={{ width: '100%', padding: '14px' }}
            >
              {walletLoading ? (
                <span className="spinner" />
              ) : (
                'Connect Wallet & Get Started'
              )}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
              No Freighter wallet? The app will launch in <strong>demo mode</strong> (offline, localStorage).
            </p>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {appView === 'dashboard' && (
        <>
          <PasswordList
            entries={entries}
            loading={entriesLoading}
            onAdd={() => {
              setEditEntry(null);
              setShowAddModal(true);
            }}
            onEdit={(entry) => {
              setEditEntry(entry);
              setShowAddModal(true);
            }}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
          <AddPassword
            isOpen={showAddModal}
            editEntry={editEntry}
            onClose={() => {
              setShowAddModal(false);
              setEditEntry(null);
            }}
            onSave={handleSave}
            onUpdate={handleUpdate}
          />
        </>
      )}
    </>
  );
};

export default App;
