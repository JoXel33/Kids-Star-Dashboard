import { api } from '../api.js';
import { getState, setState, subscribe } from '../state.js';
import { todayDate, nowTime } from '../time.js';
import { registerWalletReloader } from '../refresh.js';

export function mountWallet(container) {
  async function reload() {
    try {
      const res = await api.getWallet(todayDate(), nowTime());
      setState({ wallet: res.wallet });
    } catch (e) {
      console.error('wallet reload failed:', e);
    }
  }
  registerWalletReloader(reload);

  let lastHtml = '';
  function render() {
    const w = getState().wallet || { starsCollected: 0, starsSpent: 0, starBalance: 0 };
    const html = `
      <div class="card-title">Star Wallet</div>
      <div class="wallet-grid">
        <div class="wallet-cell">
          <div class="wallet-num">${w.starsCollected}</div>
          <div class="wallet-label">Stars Collected</div>
        </div>
        <div class="wallet-cell">
          <div class="wallet-num">${w.starBalance}</div>
          <div class="wallet-label">Star Balance</div>
        </div>
      </div>
    `;
    if (html === lastHtml) return;
    lastHtml = html;
    container.innerHTML = html;
  }

  reload();
  render();
  subscribe(render);
}
