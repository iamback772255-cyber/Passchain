import '@testing-library/jest-dom';

// Polyfill for lowercase localstorage used by StellarWalletsKit in jsdom environment
if (typeof window !== 'undefined') {
  (window as any).localstorage = window.localStorage;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).localstorage = (globalThis as any).localStorage;
}

// Polyfill for crypto.getRandomValues in jsdom
import { webcrypto } from 'crypto';
if (typeof window !== 'undefined' && !window.crypto) {
  (window as any).crypto = webcrypto;
}
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
