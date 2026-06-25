// Update these when the apps are live in the stores.
const APP_STORE_URL = 'https://apps.apple.com/app/stamped/id0000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=au.umair.stamped';

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

function escapeHtml(v) {
  return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function getTokenFromUrl() {
  const url = new URL(window.location.href);
  const t = url.searchParams.get('t');
  if (t) return t.trim();

  // Optional legacy support: /join/<token>
  const parts = url.pathname.split('/').filter(Boolean);
  const joinIdx = parts.indexOf('join');
  const maybe = joinIdx >= 0 ? parts[joinIdx + 1] : null;
  return maybe ? maybe.trim() : null;
}

function normalizeUrlToCanonicalIfNeeded() {
  const url = new URL(window.location.href);
  const legacyToken = getTokenFromUrl();
  if (!url.searchParams.get('t') && legacyToken) {
    url.searchParams.set('t', legacyToken);
    // Keep the existing base path (project sites may not be hosted at '/').
    url.pathname = url.pathname.replace(/\/join\/?.*$/, '/join/');
    window.location.replace(url.toString());
    return true;
  }
  return false;
}

function requirePublicConfig() {
  const cfg = window.STAMPED_PUBLIC_CONFIG;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing STAMPED_PUBLIC_CONFIG. Ensure assets/config.js exists and contains SUPABASE_URL + SUPABASE_ANON_KEY.'
    );
  }
  return cfg;
}

function setSubtitle(text) {
  const el = document.getElementById('join-subtitle');
  if (el) el.textContent = text;
}

function setRoot(html) {
  const el = document.getElementById('join-root');
  if (el) el.innerHTML = html;
}

function renderError(title, body) {
  setSubtitle(title);
  setRoot(
    `<div class="card stack">
      <p class="error">${escapeHtml(title)}</p>
      <p class="muted">${escapeHtml(body)}</p>
      <div class="row">
        <a class="btn btn--secondary" href="../">Back to home</a>
      </div>
    </div>`
  );
}

function parseBirthMonthDay(value) {
  // value: "YYYY-MM-DD" from <input type="date">. We store month/day only.
  if (!value) return { birth_month: null, birth_day: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { birth_month: null, birth_day: null };
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return { birth_month: null, birth_day: null };
  return { birth_month: month, birth_day: day };
}

function requireChecked(el, message) {
  if (!el?.checked) {
    throw new Error(message);
  }
}

async function main() {
  if (normalizeUrlToCanonicalIfNeeded()) return;

  let cfg;
  try {
    cfg = requirePublicConfig();
  } catch (err) {
    renderError(
      'Setup required.',
      String(err?.message ?? err) + ' (Operator: configure assets/config.js and redeploy.)'
    );
    return;
  }

  const token = getTokenFromUrl();
  if (!token) {
    renderError('Missing code.', 'Please scan the QR code again or ask staff for help.');
    return;
  }

  setSubtitle('Loading…');
  setRoot(`<div class="card stack"><p class="muted">Checking the code…</p></div>`);

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // 1) Public cafe resolution (anon-safe)
  const cafeRes = await supabase.rpc('verify_cafe_qr_public', { p_token: token });
  if (cafeRes.error) {
    renderError('Invalid code.', 'This code is invalid or expired. Please ask staff for a new code.');
    return;
  }
  const cafe = Array.isArray(cafeRes.data) ? cafeRes.data[0] : cafeRes.data;
  if (!cafe?.brand_id || !cafe?.cafe_id) {
    renderError('Invalid code.', 'This code could not be resolved. Please ask staff for help.');
    return;
  }

  const cafeTitle = cafe?.brand_name
    ? `${cafe.brand_name}${cafe.cafe_name ? ` — ${cafe.cafe_name}` : ''}`
    : cafe?.cafe_name || 'This venue';

  // 2) Render signup
  setSubtitle(`Joining ${cafeTitle}`);

  setRoot(`
    <div class="card stack" id="step-form">
      <p class="muted">Create your Stamped account to start collecting stamps.</p>

      <div class="field">
        <label for="name">Full name</label>
        <input id="name" autocomplete="name" inputmode="text" placeholder="Your name" />
      </div>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" autocomplete="email" inputmode="email" placeholder="you@example.com" />
      </div>

      <div class="field">
        <label for="phone">Phone (optional)</label>
        <input id="phone" autocomplete="tel" inputmode="tel" placeholder="+61…" />
      </div>

      <div class="field">
        <label for="dob">Birthday (optional)</label>
        <input id="dob" type="date" />
        <p class="muted" style="margin: 0.35rem 0 0;">We store month/day only (no year).</p>
      </div>

      <label class="checkbox">
        <input id="accept-terms" type="checkbox" />
        <span>I agree to the <a href="../terms/">Terms</a> and <a href="../privacy/">Privacy Policy</a>.</span>
      </label>

      <label class="checkbox">
        <input id="marketing-opt-in" type="checkbox" />
        <span>Send me offers and updates from Stamped (optional).</span>
      </label>

      <p class="error" id="form-error" style="display:none;"></p>

      <div class="row">
        <button class="btn btn--primary" id="send-code">Send code</button>
        <a class="btn btn--secondary" href="../">Cancel</a>
      </div>
    </div>

    <div class="card stack" id="step-otp" style="display:none;">
      <p class="muted">We emailed you a one-time code.</p>

      <div class="field">
        <label for="otp">Code</label>
        <input id="otp" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" />
      </div>

      <p class="error" id="otp-error" style="display:none;"></p>

      <div class="row">
        <button class="btn btn--primary" id="verify-code">Verify</button>
        <button class="btn btn--secondary" id="resend-code" type="button">Resend</button>
      </div>
    </div>

    <div class="card stack" id="step-success" style="display:none;"></div>
  `);

  const $ = (id) => document.getElementById(id);
  const show = (id) => ($(id).style.display = '');
  const hide = (id) => ($(id).style.display = 'none');

  const formError = $('form-error');
  const otpError = $('otp-error');
  const setFormError = (msg) => {
    if (!msg) {
      formError.style.display = 'none';
      formError.textContent = '';
      return;
    }
    formError.style.display = '';
    formError.textContent = msg;
  };
  const setOtpError = (msg) => {
    if (!msg) {
      otpError.style.display = 'none';
      otpError.textContent = '';
      return;
    }
    otpError.style.display = '';
    otpError.textContent = msg;
  };

  const state = {
    email: null,
    brandId: cafe.brand_id,
    cafeId: cafe.cafe_id,
  };

  async function sendOtp() {
    setFormError('');
    try {
      const name = $('name').value.trim().replace(/\s+/g, ' ');
      const email = $('email').value.trim();
      const phone = $('phone').value.trim();
      const dob = $('dob').value;
      const acceptTerms = $('accept-terms');
      const marketingOptIn = $('marketing-opt-in').checked;

      if (name.length < 2) throw new Error('Please enter your name.');
      if (!email || !email.includes('@')) throw new Error('Please enter a valid email.');
      requireChecked(acceptTerms, 'Please accept the Terms and Privacy Policy to continue.');

      // Send code (email OTP / magic link depending on project settings).
      // We always support the "code" path via verifyOtp below.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.href,
          data: {
            display_name: name,
            phone: phone || null,
          },
        },
      });

      if (error) throw error;

      state.email = email;
      state.pendingProfile = {
        display_name: name,
        phone: phone || null,
        marketing_opt_in: Boolean(marketingOptIn),
        registration_completed_at: new Date().toISOString(),
        ...parseBirthMonthDay(dob),
      };

      hide('step-form');
      show('step-otp');
      $('otp').focus();
    } catch (err) {
      setFormError(String(err?.message ?? err));
    }
  }

  async function verifyOtp() {
    setOtpError('');
    try {
      const tokenInput = $('otp').value.trim().replace(/\s+/g, '');
      if (tokenInput.length < 4) throw new Error('Please enter the code from your email.');
      if (!state.email) throw new Error('Missing email. Please go back and request a code again.');

      const { data, error } = await supabase.auth.verifyOtp({
        email: state.email,
        token: tokenInput,
        type: 'email',
      });
      if (error) throw error;

      const userId = data?.user?.id ?? (await supabase.auth.getUser()).data?.user?.id;
      if (!userId) throw new Error('Sign-in failed. Please try again.');

      // 3) Upsert profile fields for the now-authenticated user.
      const upsertRes = await supabase.from('profiles').upsert({
        id: userId,
        ...state.pendingProfile,
      });
      if (upsertRes.error) throw upsertRes.error;

      // 4) Create/attach customer card for this brand/cafe.
      const cardRes = await supabase.rpc('find_or_create_customer_card', {
        p_customer_id: userId,
        p_brand_id: state.brandId,
        p_cafe_id: state.cafeId,
      });
      if (cardRes.error) throw cardRes.error;

      const cardRow = Array.isArray(cardRes.data) ? cardRes.data[0] : cardRes.data;
      state.customerCardId = cardRow?.id ?? null;

      hide('step-otp');
      show('step-success');
      renderSuccess(cafeTitle, state.customerCardId);
    } catch (err) {
      setOtpError(String(err?.message ?? err));
    }
  }

  async function resendOtp() {
    setOtpError('');
    try {
      if (!state.email) throw new Error('Missing email. Please go back and request a code again.');
      const { error } = await supabase.auth.signInWithOtp({
        email: state.email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.href },
      });
      if (error) throw error;
    } catch (err) {
      setOtpError(String(err?.message ?? err));
    }
  }

  function renderSuccess(title, customerCardId) {
    const onIos = isIosSafari();
    const walletSection = onIos && customerCardId
      ? `<button class="btn btn--primary" id="wallet-btn" type="button">Add to Apple Wallet</button>
         <p class="muted" id="wallet-msg" style="display:none;margin:0;"></p>`
      : '';
    $('step-success').innerHTML = `
      <p><strong>You're in!</strong></p>
      <p class="muted">Your ${escapeHtml(title)} loyalty card is ready. Collect stamps every visit — your reward is waiting.</p>
      ${walletSection}
      <p class="muted" style="margin-bottom:0.25rem;">Get the full app to manage all your cards:</p>
      <div class="row">
        <a class="btn btn--primary" href="${escapeHtml(APP_STORE_URL)}" target="_blank" rel="noopener">App Store</a>
        <a class="btn btn--secondary" href="${escapeHtml(PLAY_STORE_URL)}" target="_blank" rel="noopener">Google Play</a>
      </div>
    `;
    if (onIos && customerCardId) {
      $('wallet-btn').addEventListener('click', () => void addToWallet(customerCardId));
    }
  }

  async function addToWallet(customerCardId) {
    const btn = $('wallet-btn');
    const msg = $('wallet-msg');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
    try {
      const { data: sessionResp } = await supabase.auth.getSession();
      const jwt = sessionResp?.session?.access_token;
      if (!jwt) throw new Error('Session expired. Please refresh and sign in again.');

      const fnUrl = `${cfg.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/wallet_pass/issue`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.apple.pkpass, application/json',
        },
        body: JSON.stringify({ customerCardId }),
      });

      const ct = res.headers.get('Content-Type') ?? '';
      if (ct.includes('application/vnd.apple.pkpass') && res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stamped.pkpass';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        if (btn) btn.style.display = 'none';
      } else {
        let code = `http_${res.status}`;
        try { const j = await res.json(); code = j?.code ?? code; } catch { /* ignore */ }
        if (code === 'pkpass_certs_missing' || code === 'pkpass_signing_not_configured') {
          if (msg) { msg.style.display = ''; msg.textContent = 'Wallet passes are not yet configured. Download the app to manage your card.'; }
          if (btn) btn.style.display = 'none';
        } else {
          throw new Error(`Could not generate pass (${code}).`);
        }
      }
    } catch (err) {
      if (msg) { msg.style.display = ''; msg.textContent = String(err?.message ?? err); }
      if (btn) { btn.disabled = false; btn.textContent = 'Add to Apple Wallet'; }
    }
  }

  $('send-code').addEventListener('click', (e) => {
    e.preventDefault();
    void sendOtp();
  });
  $('verify-code').addEventListener('click', (e) => {
    e.preventDefault();
    void verifyOtp();
  });
  $('resend-code').addEventListener('click', (e) => {
    e.preventDefault();
    void resendOtp();
  });

  // Enter-to-submit convenience
  ['name', 'email', 'phone', 'dob'].forEach((id) => {
    $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void sendOtp();
      }
    });
  });
  $('otp').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void verifyOtp();
    }
  });
}

void main();

