import { api, setToken } from '../api.js';
import { todayDate } from '../time.js';

let onAuthenticated = () => {};

export function mountAuth(container, callbacks) {
  onAuthenticated = callbacks.onAuthenticated;
  renderMode('pick', container);
  container.hidden = false;
}

export function hideAuth(container) {
  container.hidden = true;
}

function renderMode(mode, container) {
  if (mode === 'pick') return renderPick(container);
  if (mode === 'setup') return renderSetup(container);
  if (mode === 'login') return renderLogin(container);
  if (mode === 'recover') return renderRecover(container);
}

function renderPick(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1>Welcome ✨</h1>
      <p class="lead">Are you new here, or do you already have a code?</p>
      <button class="primary" data-mode="setup">I'm new — set me up!</button>
      <button class="primary" data-mode="login"
        style="margin-top:10px;background:linear-gradient(135deg,#80d0ff,#a0c0ff)">I have a code</button>
      <div class="links"><a data-mode="recover">I forgot my code</a></div>
    </div>`;
  for (const el of container.querySelectorAll('[data-mode]')) {
    el.addEventListener('click', () => renderMode(el.dataset.mode, container));
  }
}

function renderSetup(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1>Let's set you up! 🌟</h1>
      <p class="lead">Pick a code only you'll remember.</p>
      <label>Your name<input id="setup-name" maxlength="40" placeholder="What should we call you?" /></label>
      <label>Your secret code<input id="setup-code" maxlength="20" placeholder="4–20 letters or numbers" /></label>
      <label>What is the name of your school?
        <input id="setup-answer" maxlength="60" placeholder="If you forget your code, we'll ask this" />
      </label>
      <div class="error-msg" id="setup-error"></div>
      <button class="primary" id="setup-submit">Let's go!</button>
      <div class="links"><a data-back>Back</a></div>
    </div>`;
  container.querySelector('[data-back]').addEventListener('click', () => renderPick(container));
  container.querySelector('#setup-submit').addEventListener('click', async () => {
    const name = container.querySelector('#setup-name').value.trim();
    const accessCode = container.querySelector('#setup-code').value.trim();
    const recoveryAnswer = container.querySelector('#setup-answer').value.trim();
    const err = container.querySelector('#setup-error');
    err.textContent = '';
    if (accessCode.length < 4) { err.textContent = 'Code must be at least 4 characters.'; return; }
    if (!recoveryAnswer) { err.textContent = "Please answer the recovery question."; return; }
    try {
      const res = await api.createChild({ name, accessCode, recoveryAnswer, createdDate: todayDate() });
      setToken(res.sessionToken);
      onAuthenticated(res.child);
    } catch (e) {
      err.textContent = e.code === 'access_code_taken'
        ? 'That code is taken — please choose another.'
        : (e.message || 'Something went wrong.');
    }
  });
}

function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1>Welcome back! 🐚</h1>
      <p class="lead">Type your secret code.</p>
      <label>Your code<input id="login-code" maxlength="20" /></label>
      <div class="error-msg" id="login-error"></div>
      <button class="primary" id="login-submit">Let me in</button>
      <div class="links"><a data-back>Back</a><a data-mode="recover">I forgot my code</a></div>
    </div>`;
  container.querySelector('[data-back]').addEventListener('click', () => renderPick(container));
  container.querySelector('[data-mode="recover"]').addEventListener('click', () => renderRecover(container));
  container.querySelector('#login-submit').addEventListener('click', async () => {
    const accessCode = container.querySelector('#login-code').value.trim();
    const err = container.querySelector('#login-error');
    err.textContent = '';
    try {
      const res = await api.login(accessCode);
      setToken(res.sessionToken);
      onAuthenticated(res.child);
    } catch (e) {
      err.textContent = e.code === 'invalid_access_code'
        ? "That code doesn't match. Try again, or use the recovery option."
        : (e.message || 'Something went wrong.');
    }
  });
}

function renderRecover(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1>Let's get you back in 🌟</h1>
      <p class="lead">Tell us your name and answer the recovery question.</p>
      <label>Your name<input id="rec-name" maxlength="40" /></label>
      <label>What is the name of your school?<input id="rec-answer" maxlength="60" /></label>
      <label>Pick a new code<input id="rec-code" maxlength="20" /></label>
      <div class="error-msg" id="rec-error"></div>
      <button class="primary" id="rec-submit">Save my new code</button>
      <div class="links"><a data-back>Back</a></div>
    </div>`;
  container.querySelector('[data-back]').addEventListener('click', () => renderPick(container));
  container.querySelector('#rec-submit').addEventListener('click', async () => {
    const name = container.querySelector('#rec-name').value.trim();
    const recoveryAnswer = container.querySelector('#rec-answer').value.trim();
    const newAccessCode = container.querySelector('#rec-code').value.trim();
    const err = container.querySelector('#rec-error');
    err.textContent = '';
    if (newAccessCode.length < 4) { err.textContent = 'New code must be at least 4 characters.'; return; }
    try {
      const res = await api.recover({ name, recoveryAnswer, newAccessCode });
      setToken(res.sessionToken);
      onAuthenticated(res.child);
    } catch (e) {
      err.textContent =
        e.code === 'recovery_no_match' ? "We couldn't find a match. Ask a parent or teacher to help." :
        e.code === 'recovery_ambiguous' ? 'More than one match — please ask an adult to help.' :
        e.code === 'access_code_taken' ? 'That code is taken — please choose another.' :
        (e.message || 'Something went wrong.');
    }
  });
}
