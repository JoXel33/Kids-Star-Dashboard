// Lightweight cross-component reload registry. Wallet and Wants register their
// reload callbacks; Star and Rewards components call these after mutating actions
// so cross-section views stay in sync without coupling components directly.

let walletReloader = null;
let wantsReloader = null;

export function registerWalletReloader(fn) { walletReloader = fn; }
export function registerWantsReloader(fn) { wantsReloader = fn; }

export function reloadWallet() { if (walletReloader) walletReloader(); }
export function reloadWants() { if (wantsReloader) wantsReloader(); }
