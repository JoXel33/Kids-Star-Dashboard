import { api } from '../api.js';
import { todayDate, nowTime } from '../time.js';

// Maximum end-date the picker will allow client-side (defence in depth — the
// server is still authoritative for the 90-day cap).
function todayPlusDays(today, days) {
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function weekdayName(dateStr) {
  // Day-of-week label derived from the source date in the local calendar
  // (per spec FR-005 — based on the source block's date, not today's).
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

function positionAnchored(popover, rowEl) {
  const rect = rowEl.getBoundingClientRect();
  const popW = 320;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  // Prefer placing the popover to the right of the source row.
  let left = rect.right + 8;
  if (left + popW > viewportW - 8) {
    // Fall back to placing it to the left, or centring it.
    left = rect.left - popW - 8;
    if (left < 8) left = Math.max(8, (viewportW - popW) / 2);
  }
  let top = rect.top;
  // Approximate popover height — used only to keep it inside the viewport.
  const popH = popover.offsetHeight || 320;
  if (top + popH > viewportH - 8) top = Math.max(8, viewportH - popH - 8);
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

// Kid-friendly mapping of error codes → on-screen messages (FR-017 voice).
const ERROR_MESSAGES = {
  invalid_until_date: "Hmm, that day isn't on the calendar — try another one!",
  until_not_future: "Pick a day that hasn't happened yet ✨",
  until_too_far: "Let's pick a day within the next 90 days",
  source_empty: 'Try again from a row with an activity in it',
  source_elapsed: 'That hour is in the past — try a different row',
  source_not_found: 'Try again from a row with an activity in it',
  invalid_input: 'Something looked off — please try again',
  internal: "Hmm, something went wrong — let's try that again!",
  network: "We couldn't reach the server — let's try that again!",
};

export function mountRepeatPopover({ rowEl, sourceDate, sourceHour, sourceActivity, today, onApplied }) {
  // Guard against double-mount.
  if (document.querySelector('.repeat-popover')) return null;

  const maxUntil = todayPlusDays(today, 90);
  const weekdayLabel = `Every ${weekdayName(sourceDate)}`;

  const scrim = document.createElement('div');
  scrim.className = 'repeat-popover-scrim';

  const popover = document.createElement('div');
  popover.className = 'repeat-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'true');
  popover.setAttribute('aria-labelledby', 'repeat-popover-title');
  popover.innerHTML = `
    <h2 id="repeat-popover-title">Repeat ✨</h2>
    <fieldset>
      <legend>How often?</legend>
      <label><input type="radio" name="repeat-type" value="daily" checked /> Every day</label>
      <!-- US2 (T024) adds the weekly option here -->
    </fieldset>
    <label for="repeat-until">Until</label>
    <input type="date" id="repeat-until" max="${maxUntil}" aria-describedby="repeat-until-hint" />
    <div class="hint" id="repeat-until-hint">Tap to pick a day</div>
    <p class="repeat-error" id="repeat-error" role="alert" aria-live="polite"></p>
    <div class="repeat-popover-actions">
      <button type="button" id="repeat-cancel">Not now</button>
      <button type="button" id="repeat-confirm" class="primary" aria-label="Confirm repeat">Confirm</button>
    </div>
  `;

  document.body.appendChild(scrim);
  document.body.appendChild(popover);
  positionAnchored(popover, rowEl);

  const untilInput = popover.querySelector('#repeat-until');
  const confirmBtn = popover.querySelector('#repeat-confirm');
  const cancelBtn = popover.querySelector('#repeat-cancel');
  const errorEl = popover.querySelector('#repeat-error');
  const actionsEl = popover.querySelector('.repeat-popover-actions');

  // Remember what was focused before the popover opened, so we can restore on close.
  const previouslyFocused = document.activeElement;

  let busy = false;

  function setBusy(v) {
    busy = !!v;
    confirmBtn.disabled = busy;
    cancelBtn.disabled = busy;
    if (busy) {
      // Replace the action row with the wand spinner (FR-022).
      actionsEl.innerHTML = `
        <div class="repeat-spinner" aria-label="Saving your repeat" role="status">
          <span class="sparkle" aria-hidden="true">✨</span>
          <span class="wand" aria-hidden="true">🪄</span>
          <span class="sparkle" aria-hidden="true">✨</span>
        </div>
      `;
    } else {
      // Restore the action buttons (used on failure so the child can retry).
      actionsEl.innerHTML = `
        <button type="button" id="repeat-cancel">Not now</button>
        <button type="button" id="repeat-confirm" class="primary" aria-label="Confirm repeat">Confirm</button>
      `;
      actionsEl.querySelector('#repeat-cancel').addEventListener('click', close);
      actionsEl.querySelector('#repeat-confirm').addEventListener('click', onConfirm);
    }
  }

  function showError(code) {
    errorEl.textContent = ERROR_MESSAGES[code] || ERROR_MESSAGES.internal;
  }
  function clearError() { errorEl.textContent = ''; }

  function close() {
    if (busy) return; // FR-022/023 — cannot close while writing.
    popover.remove();
    scrim.remove();
    document.removeEventListener('keydown', onKeyDown, true);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  // Pre-flight validation. Returns null on success, error code on failure.
  function preflight() {
    const until = untilInput.value;
    if (!until) return 'invalid_input';
    // Browser native date input always yields YYYY-MM-DD when valid.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return 'invalid_until_date';
    if (until <= sourceDate) return 'until_not_future';
    if (until > maxUntil) return 'until_too_far';
    return null;
  }

  async function onConfirm() {
    if (busy) return;
    clearError();
    const preflightCode = preflight();
    if (preflightCode) { showError(preflightCode); return; }

    setBusy(true);
    const selectedType = popover.querySelector('input[name="repeat-type"]:checked').value;
    try {
      const res = await api.applyRecurrence(sourceDate, sourceHour, {
        type: selectedType,
        until: untilInput.value,
        clientDate: today,
        clientTime: nowTime(),
      });
      // Success — invoke caller's invalidation hook and close.
      busy = false;
      popover.remove();
      scrim.remove();
      document.removeEventListener('keydown', onKeyDown, true);
      if (typeof onApplied === 'function') onApplied(res.dates || []);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    } catch (e) {
      setBusy(false);
      const code = e?.status >= 500 ? 'internal'
        : (e?.code && ERROR_MESSAGES[e.code]) ? e.code
        : (e?.code) || 'internal';
      showError(code);
    }
  }

  function focusableElements() {
    return Array.from(popover.querySelectorAll(
      'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
  }

  function onKeyDown(ev) {
    if (busy) {
      // FR-022: ESC ignored during busy state.
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); }
      return;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key === 'Tab') {
      // Focus trap.
      const focusables = focusableElements();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  }

  // Wire interactions.
  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', onConfirm);
  scrim.addEventListener('click', close);  // FR-021: backdrop = Not now (when not busy)
  document.addEventListener('keydown', onKeyDown, true);

  setTimeout(() => untilInput.focus(), 0);

  return { close, element: popover };
}
