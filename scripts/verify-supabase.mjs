import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_EMAIL = process.env.SUPABASE_TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SUPABASE_TEST_ADMIN_PASSWORD;
const USER_EMAIL = process.env.SUPABASE_TEST_USER_EMAIL;
const USER_PASSWORD = process.env.SUPABASE_TEST_USER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !USER_EMAIL || !USER_PASSWORD) {
  throw new Error(
    'Missing SUPABASE_TEST_ADMIN_EMAIL/PASSWORD or SUPABASE_TEST_USER_EMAIL/PASSWORD env vars',
  );
}

const results = [];
let hasFailure = false;

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    hasFailure = true;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, message });
    console.error(`FAIL  ${name}: ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const nonAdminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Valid 1x1 transparent PNG bytes
const MINI_PNG_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0,
  2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174,
  66, 96, 130,
]);

let createdRegistrationId = null;
let createdReferenceId = null;
let tempSpecId = null;
let uploadedLogoPath = null;
let seededActiveSpecId = null;

async function callSubmitEdge(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

try {
  // 1. Sign in test admin & test non-admin
  const adminSignIn = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  assert(!adminSignIn.error && adminSignIn.data.session, `Admin login failed: ${adminSignIn.error?.message}`);

  const userSignIn = await nonAdminClient.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  assert(!userSignIn.error && userSignIn.data.session, `Non-admin login failed: ${userSignIn.error?.message}`);

  // 2. Anon read checks
  await check('Anon can read active specializations only', async () => {
    const { data, error } = await anonClient.from('specializations').select('*');
    assert(!error, error?.message);
    assert(Array.isArray(data) && data.length >= 1, 'Expected active specializations');
    assert(data.every((s) => s.is_active === true), 'Disabled specialization leaked to anon');
    seededActiveSpecId = data[0].id;
  });

  await check('Anon can read public event_settings & page_settings', async () => {
    const [ev, pg] = await Promise.all([
      anonClient.from('event_settings').select('club_name_ar, is_registration_open').single(),
      anonClient.from('page_settings').select('hero_title_ar, is_registration_open').single(),
    ]);
    assert(!ev.error && ev.data, ev.error?.message || 'No event_settings');
    assert(!pg.error && pg.data, pg.error?.message || 'No page_settings');
  });

  await check('Anon cannot read restricted tables (students, registrations, profiles, admin_notes, audit_logs, admin_notifications)', async () => {
    const tables = [
      'students',
      'registrations',
      'profiles',
      'admin_notes',
      'audit_logs',
      'admin_notifications',
    ];
    for (const table of tables) {
      const { error } = await anonClient.from(table).select('*').limit(1);
      assert(error !== null, `Anon SELECT succeeded on restricted table ${table}`);
    }
  });

  await check('Anon cannot mutate public config or invoke admin/private RPCs', async () => {
    const mut1 = await anonClient
      .from('event_settings')
      .update({ club_name_en: 'Hacked' })
      .eq('singleton_key', true);
    assert(mut1.error !== null, 'Anon updated event_settings!');

    const mut2 = await anonClient
      .from('specializations')
      .insert({ name_ar: 'تجربة', name_en: 'Hack Spec' });
    assert(mut2.error !== null, 'Anon inserted specialization!');

    const rpc1 = await anonClient.rpc('admin_list_registrations', {});
    assert(rpc1.error !== null, 'Anon called admin_list_registrations!');

    const rpc2 = await anonClient.rpc('submit_public_registration', {
      p_first_name: 'Bypass',
      p_last_name: 'Test',
      p_phone: '+213550112233',
      p_specialization_id: seededActiveSpecId,
      p_instagram_username: '@bypass_direct',
      p_confirmed_attendance: true,
    });
    assert(rpc2.error !== null, 'Anon called submit_public_registration directly bypassing Edge Function!');
  });

  // 3. Ordinary authenticated non-admin checks
  await check('Non-admin authenticated user cannot read students/registrations/admin_notes/audit_logs/profiles', async () => {
    for (const table of ['students', 'registrations', 'admin_notes', 'audit_logs', 'admin_notifications']) {
      const { data, error } = await nonAdminClient.from(table).select('*').limit(5);
      assert(error !== null || (Array.isArray(data) && data.length === 0), `Non-admin read data from ${table}`);
    }
    const { data: profData } = await nonAdminClient.from('profiles').select('*');
    assert(!profData || profData.length === 0, 'Non-admin saw admin profiles!');
  });

  await check('Non-admin cannot self-promote in profiles, mutate settings, or upload storage objects', async () => {
    const selfPromote = await nonAdminClient.from('profiles').insert({
      id: userSignIn.data.user.id,
      email: USER_EMAIL,
      full_name: 'Attacker',
      role: 'super_admin',
      is_active: true,
    });
    assert(selfPromote.error !== null, 'Non-admin inserted own admin profile!');

    const mutEvent = await nonAdminClient
      .from('event_settings')
      .update({ is_registration_open: false })
      .eq('singleton_key', true)
      .select();
    assert(
      mutEvent.error !== null || (Array.isArray(mutEvent.data) && mutEvent.data.length === 0),
      'Non-admin updated event_settings!',
    );

    const rpcStats = await nonAdminClient.rpc('get_registration_stats');
    assert(rpcStats.error !== null, 'Non-admin called get_registration_stats!');

    const storageTry = await nonAdminClient.storage
      .from('club-logos')
      .upload(`logos/unauthorized-${Date.now()}.png`, MINI_PNG_BYTES, { contentType: 'image/png' });
    assert(storageTry.error !== null, 'Non-admin uploaded logo to storage!');
  });

  // 4. Edge Function validation, submission & duplicate checks
  await check('Edge Function rejects invalid inputs cleanly', async () => {
    const bad = await callSubmitEdge({
      firstName: 'A',
      lastName: 'Student',
      phone: '12',
      specializationId: seededActiveSpecId,
      instagramHandle: 'bad handle!',
      confirmedAttendance: true,
    });
    assert(bad.status === 400, `Expected 400, got ${bad.status}`);
  });

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testHandle = `Test_Verify_${uniqueSuffix}`;

  await check('Edge Function submits valid public registration with normalized Instagram', async () => {
    const res = await callSubmitEdge({
      firstName: 'نور',
      lastName: 'اختبار',
      phone: '+213 550 77 88 99',
      specializationId: seededActiveSpecId,
      instagramHandle: `@${testHandle}`,
      confirmedAttendance: true,
    });
    assert(res.status === 201 && res.json?.registration, `Expected 201, got ${res.status}: ${JSON.stringify(res.json)}`);
    createdRegistrationId = res.json.registration.id;
    createdReferenceId = res.json.registration.referenceId;
    assert(res.json.registration.instagramHandle === `@${testHandle.toLowerCase()}`, 'Instagram not normalized to lowercase');
    assert(res.json.registration.status === 'new', 'Initial status should be new');
  });

  await check('Edge Function rejects duplicate registration by same normalized Instagram (409)', async () => {
    const dup = await callSubmitEdge({
      firstName: 'نور',
      lastName: 'مكرر',
      phone: '+213 550 77 88 99',
      specializationId: seededActiveSpecId,
      instagramHandle: testHandle.toUpperCase(),
      confirmedAttendance: true,
    });
    assert(dup.status === 409 && dup.json?.error?.code === 'DUPLICATE_REGISTRATION', `Expected 409 duplicate, got ${dup.status}`);
  });

  // 5. Admin workflows, audit log immutability, FK protection & closed registration gate
  await check('Active admin can search, paginate, update status, and save internal notes', async () => {
    const searchRes = await adminClient.rpc('admin_list_registrations', {
      p_page: 1,
      p_page_size: 5,
      p_search: createdReferenceId,
    });
    assert(!searchRes.error, searchRes.error?.message);
    assert(searchRes.data.totalCount === 1, `Expected 1 matching registration, got ${searchRes.data.totalCount}`);

    const upd = await adminClient.rpc('admin_update_registration', {
      p_registration_id: createdRegistrationId,
      p_status: 'accepted',
      p_admin_note: 'Verified during live integration test.',
    });
    assert(!upd.error, upd.error?.message);

    const { data: regRow, error: regErr } = await adminClient
      .from('registrations')
      .select('status, reviewed_at, reviewed_by')
      .eq('id', createdRegistrationId)
      .single();
    assert(!regErr && regRow.status === 'accepted' && regRow.reviewed_at && regRow.reviewed_by, 'Review metadata not populated');

    const { data: noteRows, error: noteErr } = await adminClient
      .from('admin_notes')
      .select('note')
      .eq('registration_id', createdRegistrationId);
    assert(!noteErr && noteRows?.[0]?.note === 'Verified during live integration test.', 'Admin note not persisted');
  });

  await check('Closing registration blocks public Edge Function submission and reopening restores it', async () => {
    const closeRes = await adminClient
      .from('page_settings')
      .update({ is_registration_open: false })
      .eq('singleton_key', true);
    assert(!closeRes.error, closeRes.error?.message);

    const blocked = await callSubmitEdge({
      firstName: 'طارق',
      lastName: 'مغلق',
      phone: '+213 551 00 11 22',
      specializationId: seededActiveSpecId,
      instagramHandle: `@closed_test_${uniqueSuffix}`,
      confirmedAttendance: true,
    });
    assert(blocked.status === 403 && blocked.json?.error?.code === 'REGISTRATION_CLOSED', `Expected 403 closed, got ${blocked.status}`);

    const reopenRes = await adminClient
      .from('page_settings')
      .update({ is_registration_open: true })
      .eq('singleton_key', true);
    assert(!reopenRes.error, reopenRes.error?.message);
  });

  await check('Specialization CRUD, disabled exclusion for anon, and ON DELETE RESTRICT protection', async () => {
    const { data: newSpec, error: specErr } = await adminClient
      .from('specializations')
      .insert({
        name_ar: `تخصص اختبار ${uniqueSuffix}`,
        name_en: `Test Specialization ${uniqueSuffix}`,
        icon: 'cpu',
        is_active: false,
        display_order: 99,
      })
      .select('*')
      .single();
    assert(!specErr && newSpec, specErr?.message);
    tempSpecId = newSpec.id;

    // Anon must not see inactive specialization
    const { data: anonSpecs } = await anonClient
      .from('specializations')
      .select('id')
      .eq('id', tempSpecId);
    assert(Array.isArray(anonSpecs) && anonSpecs.length === 0, 'Inactive specialization visible to anon');

    // Edge Function must reject disabled specialization
    const badSpecSubmit = await callSubmitEdge({
      firstName: 'علي',
      lastName: 'تخصص',
      phone: '+213 552 33 44 55',
      specializationId: tempSpecId,
      instagramHandle: `@spec_disabled_${uniqueSuffix}`,
      confirmedAttendance: true,
    });
    assert(badSpecSubmit.status === 400, `Expected 400 for disabled specialization, got ${badSpecSubmit.status}`);

    // Referenced specialization cannot be hard deleted (ON DELETE RESTRICT)
    const delUsed = await adminClient.from('specializations').delete().eq('id', seededActiveSpecId);
    assert(delUsed.error !== null && delUsed.error.code === '23503', 'Expected 23503 FK protect on used specialization');
  });

  await check('Audit logs record admin mutations cleanly and are immutable via Data API', async () => {
    const { data: logs, error: logErr } = await adminClient
      .from('audit_logs')
      .select('action, entity_type')
      .eq('entity_id', createdRegistrationId)
      .order('created_at', { ascending: false });
    assert(!logErr && Array.isArray(logs) && logs.some((l) => l.action === 'registration_accepted'), 'Missing registration_accepted audit log');

    const tamper = await adminClient
      .from('audit_logs')
      .delete()
      .eq('entity_id', createdRegistrationId);
    assert(tamper.error !== null, 'Admin was able to delete audit logs!');
  });

  await check('Storage bucket enforces MIME whitelist & admin can upload/read/delete club logo', async () => {
    const badMime = await adminClient.storage
      .from('club-logos')
      .upload(`logos/bad-${uniqueSuffix}.txt`, new Blob(['not an image'], { type: 'text/plain' }), {
        contentType: 'text/plain',
      });
    assert(badMime.error !== null, 'Bucket accepted disallowed text/plain MIME type!');

    uploadedLogoPath = `logos/verify-${uniqueSuffix}.png`;
    const up = await adminClient.storage
      .from('club-logos')
      .upload(uploadedLogoPath, MINI_PNG_BYTES, { contentType: 'image/png' });
    assert(!up.error, up.error?.message);

    const { data: pub } = adminClient.storage.from('club-logos').getPublicUrl(uploadedLogoPath);
    const httpRes = await fetch(pub.publicUrl);
    assert(httpRes.ok, `Public logo URL returned ${httpRes.status}`);
  });
} finally {
  // Ensure registration availability is restored & remove verification artifacts safely
  try {
    await adminClient
      .from('page_settings')
      .update({ is_registration_open: true })
      .eq('singleton_key', true);
  } catch {}

  if (uploadedLogoPath) {
    try {
      await adminClient.storage.from('club-logos').remove([uploadedLogoPath]);
    } catch {}
  }
  if (createdRegistrationId) {
    try {
      const { data: regInfo } = await adminClient
        .from('registrations')
        .select('student_id')
        .eq('id', createdRegistrationId)
        .maybeSingle();
      await adminClient.from('registrations').delete().eq('id', createdRegistrationId);
      if (regInfo?.student_id) {
        await adminClient.from('students').delete().eq('id', regInfo.student_id);
      }
    } catch {}
  }
  if (tempSpecId) {
    try {
      await adminClient.from('specializations').delete().eq('id', tempSpecId);
    } catch {}
  }
}

console.log(`\nSummary: ${results.filter((r) => r.ok).length}/${results.length} passed`);
if (hasFailure) {
  process.exit(1);
}
