# Passchain 🔐

Passchain is a professional-grade, decentralized password management solution. It combines client-side industry-standard encryption with the Stellar blockchain to provide a "Zero-Knowledge" storage vault for your most sensitive credentials. 

**Live Demo**: https://passchain.vercel.app/

## 🔗 Public Network Data

- **Deployed Contract ID**: `CDKMBJRDVC6G3QRIRS7ZBLG7RZHDGR5XDVFTBLVXWG4TUTRHPT6HWJJF`
- **Explorer Link**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDKMBJRDVC6G3QRIRS7ZBLG7RZHDGR5XDVFTBLVXWG4TUTRHPT6HWJJF)
- **Deployment Transaction**: [43848ced9218ac64ef4951bb4d344c7dc309c68743be5501c6852e4207022635](https://stellar.expert/explorer/testnet/tx/43848ced9218ac64ef4951bb4d344c7dc309c68743be5501c6852e4207022635)

---

## 🚀 Core Capabilities & Features

- **Advanced Smart Contracts**: The core `password-vault` uses the Soroban SDK to securely manage encrypted payloads directly on the Stellar testnet.
- **Inter-Contract Communication**: The vault seamlessly invokes a secondary `audit-logger` smart contract to autonomously record critical actions natively on-chain.
- **End-to-End Encryption (Zero-Knowledge)**: Credentials are never sent to the blockchain in plain text. We use your unique wallet signature to derive an AES-256-GCM master key on the client side. Only *you* can decrypt your data.
- **Real-Time Synchronization**: A sophisticated event-polling system monitors the Soroban RPC, instantly notifying the user and updating the UI when the vault changes.
- **Multi-Wallet Support**: Integrated with `StellarWalletsKit` for a seamless connection experience across **Freighter, xBull, Hana, and Albedo**.
- **Production-Ready CI/CD**: A fully automated GitHub Actions pipeline automatically builds the Rust contracts, compiles TypeScript bindings, and runs all frontend unit tests on every push.
- **Mobile Responsive Aesthetics**: The React/Vite app is powered by a custom vanilla CSS framework featuring a premium glassmorphism dark theme that scales perfectly across all devices.
- **Robust Error Handling**: Comprehensive UI feedback including loading spinners, disabled buttons during network requests, and graceful fallback modes (Demo Mode).
- **Comprehensive Testing**: Complete test coverage including `vitest` unit tests for React components and Rust snapshot testing for the smart contracts.

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
