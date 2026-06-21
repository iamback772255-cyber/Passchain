# Passchain 🔐

Passchain is a professional-grade, decentralized password management solution. It combines client-side industry-standard encryption with the Stellar blockchain to provide a "Zero-Knowledge" storage vault for your most sensitive credentials. 

![Live Demo](https://passchain-dccb.vercel.app) *(Your live Vercel link)*

## 🚀 Key Features

- **Multi-Wallet Support**: Integrated with `StellarWalletsKit` for a seamless connection experience across **Freighter, xBull, Hana, and Albedo**.
- **On-Chain Persistence**: All vault metadata and encrypted entries are stored on the **Stellar Testnet** using high-performance Soroban smart contracts.
- **End-to-End Encryption (Zero-Knowledge)**: Credentials are never sent to the blockchain in plain text. We use your unique wallet signature to derive an AES-256-GCM master key on the client side. Only *you* can decrypt your data.
- **Real-Time Synchronization**: A sophisticated event-polling system ensures your vault is always in sync with the latest on-chain state, triggering live UI updates when transactions clear.
- **Transaction Transparency**: Full visibility into every on-chain action with integrated toast notifications linking directly to the Stellar Expert explorer.
- **Robust Error Handling**: Graceful handling of wallet rejections, missing extensions, and network-level exceptions to ensure a smooth, premium user experience.

---

## ✅ Hackathon Requirements Checklist

This project was meticulously built to fulfill all Advanced Smart Contract requirements:

1. **Advanced smart contract development**: `password-vault` uses the Soroban SDK to securely manage encrypted payloads on the Stellar testnet.
2. **Inter-contract communication**: The vault seamlessly invokes a secondary `audit-logger` smart contract to record critical actions natively on-chain.
3. **Event streaming & real-time updates**: Implemented `events.ts` to actively poll Soroban RPC, instantly notifying the user and updating the UI when the vault changes.
4. **CI/CD pipeline setup**: GitHub Actions workflow (`ci.yml`) automatically builds the Rust contracts, compiles the TypeScript bindings, and runs all frontend tests on every push.
5. **Smart contract deployment workflow**: Automated bindings generation and deployment instructions are thoroughly documented below.
6. **Mobile responsive frontend development**: React/Vite app powered by custom CSS features a premium glassmorphism dark theme that scales perfectly across all devices.
7. **Error handling & loading states**: Comprehensive UI feedback including loading spinners, disabled buttons during network requests, and graceful fallback modes.
8. **Writing tests for contracts and frontend**: Includes `vitest` unit tests for React components (`frontend/src/tests/`) and Rust snapshot testing (`contracts/password_vault/test_snapshots/`).
9. **Production-ready architecture practices**: Secure `.env` configuration management, fully automated Vercel deployments via `prebuild` scripts, and strict TypeScript integration.
10. **Documentation & demo presentation**: This comprehensive `README.md` and the accompanying live Vercel deployment.

---

## 🛠️ Technical Stack

- **Frontend**: React (Vite) + TypeScript
- **Styling**: Premium Vanilla CSS (Glassmorphism & Responsive Design)
- **Blockchain**: Soroban (Rust) Smart Contracts
- **Wallet SDK**: StellarWalletsKit v2 
- **Communication**: Soroban RPC with auto-generated TypeScript bindings
- **CI/CD & Hosting**: GitHub Actions & Vercel

---

## 🏁 Local Development Setup

### Prerequisites
- Node.js (v18+)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- Rust Toolchain (`wasm32-unknown-unknown` target)
- A Stellar wallet extension (e.g., [Freighter](https://www.freighter.app/))

### 1. Smart Contracts
Compile the contracts locally using the Stellar CLI:
```bash
stellar contract build
```

### 2. Frontend Application
Clone the repository and install the dependencies:
```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 CI/CD & Deployment

### GitHub Actions Pipeline
This project is configured with a robust CI/CD pipeline (`.github/workflows/ci.yml`). On every push to the `main` branch, the pipeline automatically:
1. Caches Rust and Cargo dependencies.
2. Builds the `password-vault` and `audit-logger` smart contracts.
3. Compiles the TypeScript bindings.
4. Runs the frontend Vitest suite.

### Vercel Deployment
The frontend is built to be deployed seamlessly on Vercel:
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Output Directory**: `dist`
- *Note: We utilize a custom `prebuild` script in `package.json` to automatically compile the smart contract bindings on Vercel's servers before building the Vite application.*

---

## 🔗 Public Network Data

- **Deployed Contract ID**: `CDKMBJRDVC6G3QRIRS7ZBLG7RZHDGR5XDVFTBLVXWG4TUTRHPT6HWJJF`
- **Explorer Link**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDKMBJRDVC6G3QRIRS7ZBLG7RZHDGR5XDVFTBLVXWG4TUTRHPT6HWJJF)
- **Deployment Transaction**: [43848ced9218ac64ef4951bb4d344c7dc309c68743be5501c6852e4207022635](https://stellar.expert/explorer/testnet/tx/43848ced9218ac64ef4951bb4d344c7dc309c68743be5501c6852e4207022635)
