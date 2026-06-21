import '@testing-library/jest-dom';

// Polyfill for lowercase localstorage used by StellarWalletsKit in jsdom environment
if (typeof window !== 'undefined') {
  (window as any).localstorage = window.localStorage;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).localstorage = (globalThis as any).localStorage;
}
