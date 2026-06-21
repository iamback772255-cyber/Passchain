import { JSDOM } from 'jsdom';
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit-tech/stellar-wallets-kit';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const kit = new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: 'freighter',
    modules: allowAllModules(),
});

kit.openModal({
    onWalletSelected: async () => true,
    onClosed: () => {},
});

setTimeout(() => {
    console.log(document.body.innerHTML);
    process.exit(0);
}, 2000);
