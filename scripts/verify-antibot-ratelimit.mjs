import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx > 0 && !process.env[t.slice(0, idx).trim()]) {
      process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function testCase(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function postReg(body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, json };
}

const VALID_LIKE_BASE = {
  firstName: 'أمين',
  lastName: 'بلقاسم',
  phone: '+213 550 74 85 96',
  // Non-existent specialization UUID hits submit_public_registration rate limiter safely with 0 DB rows inserted
  specializationId: '00000000-0000-4000-8000-000000000099',
  instagramHandle: '@amine_real_test',
  confirmedAttendance: true,
};

await testCase('Rejects automated bot when honeypot (website/company) is filled', async () => {
  const r1 = await postReg({ ...VALID_LIKE_BASE, website: 'https://bot-spam.example' });
  assert(r1.status === 400 && r1.json?.error?.code === 'BOT_DETECTED', `Got ${r1.status}: ${JSON.stringify(r1.json)}`);

  const r2 = await postReg({ ...VALID_LIKE_BASE, company: 'SEO Bot Inc' });
  assert(r2.status === 400 && r2.json?.error?.code === 'BOT_DETECTED', `Got ${r2.status}`);
});

await testCase('Rejects fake/spam names (URLs, repeated chars, HTML injection)', async () => {
  for (const fakeName of ['https://spam.com', 'ههههههه', 'user<script>']) {
    const r = await postReg({ ...VALID_LIKE_BASE, firstName: fakeName });
    assert(r.status === 400 && r.json?.error?.code === 'INVALID_FIRST_NAME', `Accepted fake firstName "${fakeName}" with ${r.status}`);
  }
});

await testCase('Rejects fake/dummy phone numbers (repeated/sequential/low-diversity)', async () => {
  for (const fakePhone of ['00000000', '01234567', '11221122']) {
    const r = await postReg({ ...VALID_LIKE_BASE, phone: fakePhone });
    assert(r.status === 400 && r.json?.error?.code === 'INVALID_PHONE', `Accepted fake phone "${fakePhone}" with ${r.status}`);
  }
});

await testCase('Enforces 10-attempt IP rate limit, resists X-Forwarded-For spoofing, and returns HTTP 429 + Retry-After', async () => {
  let hit429At = -1;
  let retryAfter = null;

  for (let i = 1; i <= 12; i++) {
    const res = await postReg(VALID_LIKE_BASE, {
      'X-Forwarded-For': `198.51.100.${i}`,
    });
    if (res.status === 429) {
      hit429At = i;
      retryAfter = res.headers.get('retry-after');
      assert(res.json?.error?.code === 'RATE_LIMITED', `Expected RATE_LIMITED, got ${JSON.stringify(res.json)}`);
      break;
    }
    assert(res.status === 400, `Unexpected status at attempt ${i}: ${res.status}`);
  }

  assert(hit429At >= 2 && hit429At <= 11, `Rate limit did not trigger within 11 attempts (hit at ${hit429At})`);
  const retryNum = Number(retryAfter);
  assert(retryNum >= 890 && retryNum <= 900, `Expected Retry-After near 900, got ${retryAfter}`);

  // Confirm active block stays locked immediately after triggering even with different spoofed X-Forwarded-For
  const blockedAgain = await postReg(VALID_LIKE_BASE, {
    'X-Forwarded-For': '203.0.113.250',
  });
  assert(blockedAgain.status === 429 && blockedAgain.json?.error?.code === 'RATE_LIMITED', 'Cooldown lock did not persist!');
});

console.log(`\nSummary: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
