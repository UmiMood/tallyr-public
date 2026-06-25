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
    renderError('Missing code.', 'Please scan the cafe QR code again or ask staff for help.');
    return;
  }

  setSubtitle('Loading cafe…');
  setRoot(`<div class="card stack"><p class="muted">Checking the cafe code…</p></div>`);

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // 1) Public cafe resolution (anon-safe)
  const cafeRes = await supabase.rpc('verify_cafe_qr_public', { p_token: token });
  if (cafeRes.error) {
    renderError('Invalid code.', 'This cafe code is invalid or expired. Please ask staff for a new code.');
    return;
  }
  const cafe = Array.isArray(cafeRes.data) ? cafeRes.data[0] : cafeRes.data;
  if (!cafe?.brand_id || !cafe?.cafe_id) {
    renderError('Invalid code.', 'This cafe code could not be resolved. Please ask staff for help.');
    return;
  }

  const cafeTitle = cafe?.brand_name
    ? `${cafe.brand_name}${cafe.cafe_name ? ` — ${cafe.cafe_name}` : ''}`
    : cafe?.cafe_name || 'Your cafe';

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

    <div class="card stack" id="step-success" style="display:none;">
      <p><strong>You’re in.</strong></p>
      <p class="muted">Your loyalty card is ready. Next: Add to Apple Wallet (coming in Task 97) or download the app.</p>
      <div class="row">
        <a class="btn btn--primary" href="../">Done</a>
        <a class="btn btn--secondary" href="../">Download the app</a>
      </div>
    </div>
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

      hide('step-otp');
      show('step-success');
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

