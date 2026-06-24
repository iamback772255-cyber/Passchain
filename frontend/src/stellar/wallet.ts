/**
 * PasswordBlock — Freighter integration.
 *
 * Handles connecting to Freighter wallet directly.
 * Falls back to "demo mode" when needed.
 */

import { isConnected, getPublicKey, getNetworkDetails, signBlob } from '@stellar/freighter-api';

export interface WalletConnection {
  publicKey: string;
  network: string;
}

const UNLOCK_MESSAGE = 'Passchain_Master_Key_v2'; 

/**
 * Sign a deterministic message to act as the encryption key.
 */
export async function signUnlockMessage(publicKey: string): Promise<string> {
  try {
    const base64Message = btoa(UNLOCK_MESSAGE);
    const signedBlob = await signBlob(base64Message, { accountToSign: publicKey });
    
    if (!signedBlob) throw new Error('Signature was empty');
    return signedBlob;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('code: -1') || err.message.includes('closed') || err.message.includes('rejected')) {
        throw new Error('Wallet Signature Rejected: Please sign the message to unlock your vault.');
      }
      throw err;
    }
    throw new Error('Failed to sign unlock message.');
  }
}

/**
 * Connect to a wallet using Freighter and retrieve the user's public key + network.
 */
export async function connectWallet(): Promise<WalletConnection> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error('Freighter is not installed or connected.');
    }

    const address = await getPublicKey();
    if (!address) {
      throw new Error('Failed to get address from wallet.');
    }

    const { network } = await getNetworkDetails();

    return { publicKey: address, network: network || 'TESTNET' };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('closed') || err.message.includes('User declined')) {
        throw new Error('Connection Canceled: The request was closed.');
      }
      throw err;
    }
    throw new Error('Failed to connect to Stellar wallet.');
  }
}

/**
 * Get the current wallet address (if already connected).
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const connected = await isConnected();
    if (!connected) return null;
    const address = await getPublicKey();
    return address || null;
  } catch {
    return null;
  }
}

/**
 * Shorten a Stellar address for display: GABCD...WXYZ
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
