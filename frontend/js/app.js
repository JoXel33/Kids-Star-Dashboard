import { api, hasToken, clearToken } from './api.js';
import { getState, setState, subscribe } from './state.js';
import { todayDate } from './time.js';
import { mountAuth, hideAuth } from './components/auth.js';
import { mountGreeting } from './components/greeting.js';
import { mountCalendar } from './components/calendar.js';
import { mountAgenda } from './components/agenda.js';
import { mountStar } from './components/star.js';
import { mountWallet } from './components/wallet.js';
import { mountRewards } from './components/rewards.js';
import { mountSettings } from './components/settings.js';

const authScreen = document.querySelector('#auth-screen');
const dashboard = document.querySelector('#dashboard');
const loading = document.querySelector('#loading');

let dashboardMounted = false;

function showAuth() {
  loading.hidden = true;
  dashboard.hidden = true;
  mountAuth(authScreen, { onAuthenticated: onSignedIn });
}

function showLoading() {
  authScreen.hidden = true;
  dashboard.hidden = true;
  loading.hidden = false;
}

async function showDashboard() {
  loading.hidden = true;
  authScreen.hidden = true;
  dashboard.hidden = false;

  const today = todayDate();
  setState({ today, selectedDate: today });

  if (!dashboardMounted) {
    // US1: greeting + calendar + agenda
    mountGreeting(document.querySelector('#greeting-card'));
    mountCalendar(document.querySelector('#calendar-card'));
    mountAgenda(document.querySelector('#agenda-card'));

    // US2: star + wallet
    mountStar(document.querySelector('#star-card'));
    mountWallet(document.querySelector('#wallet-card'));

    // US3: rewards
    mountRewards(document.querySelector('#rewards-card'));

    // Principle V — data deletion control (floating gear)
    mountSettings();

    renderTodayDateCard();
    dashboardMounted = true;
  }

  await loadDay(today);
}

function renderTodayDateCard() {
  const card = document.querySelector('#today-date-card');
  card.innerHTML = `<div class="card-title">Today's Date</div><div class="today-date" id="today-date-text"></div>`;
  updateTodayDateText();
  setInterval(updateTodayDateText, 30_000);
}

function updateTodayDateText() {
  const el = document.querySelector('#today-date-text');
  if (!el) return;
  const t = todayDate();
  if (t !== getState().today) setState({ today: t });
  el.textContent = new Date(`${t}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

async function loadDay(date) {
  try {
    const res = await api.getDay(date);
    setState({ day: res.day });
  } catch (e) {
    if (e.status === 401) { clearToken(); showAuth(); return; }
    console.error('loadDay error:', e);
    setState({ error: e.message });
  }
}

async function onSignedIn(child) {
  setState({ child });
  hideAuth(authScreen);
  await showDashboard();
}

let lastSelected = null;
subscribe((state) => {
  if (state.selectedDate && state.selectedDate !== lastSelected) {
    lastSelected = state.selectedDate;
    loadDay(state.selectedDate);
  }
});

async function boot() {
  if (!hasToken()) return showAuth();
  showLoading();
  try {
    const res = await api.me();
    setState({ child: res.child });
    await showDashboard();
  } catch (_e) {
    clearToken();
    showAuth();
  }
}

boot();
