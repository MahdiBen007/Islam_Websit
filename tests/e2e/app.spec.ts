import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';
const NON_ADMIN_EMAIL = process.env.E2E_USER_EMAIL || '';
const NON_ADMIN_PASSWORD = process.env.E2E_USER_PASSWORD || '';

const MINI_PNG_BUFFER = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0,
  2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174,
  66, 96, 130,
]);

function attachRuntimeMonitors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore intentional 400/401/403/409 responses triggered while testing auth/duplicate guards
      if (!text.includes('status of 400') && !text.includes('status of 401') && !text.includes('status of 403') && !text.includes('status of 409')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    const errText = req.failure()?.errorText ?? 'failed';
    if (errText !== 'net::ERR_ABORTED') {
      failedRequests.push(`${req.url()} (${errText})`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 500) {
      failedRequests.push(`${res.url()} (HTTP ${res.status()})`);
    }
  });

  return {
    assertClean() {
      expect(consoleErrors, `Console errors: ${consoleErrors.join('; ')}`).toEqual([]);
      expect(pageErrors, `Page errors: ${pageErrors.join('; ')}`).toEqual([]);
      expect(failedRequests, `Failed requests: ${failedRequests.join('; ')}`).toEqual([]);
    },
  };
}

async function assertImagesLoaded(page: Page) {
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.getAttribute('src') || img.alt);
  });
  expect(brokenImages, `Broken images found: ${brokenImages.join(', ')}`).toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });
  expect(overflow, 'Horizontal page overflow detected').toBeLessThanOrEqual(1);
}

async function loginAsAdmin(page: Page) {
  expect(ADMIN_EMAIL && ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set').toBeTruthy();
  await page.goto('/admin/login');
  await page.getByLabel(/^(البريد الإلكتروني|Email Address)/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/^(كلمة المرور|Password)/i).fill(ADMIN_PASSWORD);
  await page.getByTestId('admin-login-submit').click();
  await expect(page).toHaveURL(/\/admin\/(dashboard|registrations|specializations|event-settings)/, {
    timeout: 15000,
  });
}

test.describe.serial('Live Supabase Full-Stack End-to-End Verification', () => {
  const suffix = Date.now().toString().slice(-6);
  const studentHandle = `e2e_student_${suffix}`;
  const manualHandle = `e2e_manual_${suffix}`;
  let submittedRefId = '';

  test('JOURNEY 1 & 2: Public registration via Edge Function, duplicate prevention, and success slip', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await page.goto('/');
    await assertImagesLoaded(page);
    await assertNoHorizontalOverflow(page);

    // Open modal & validate required fields
    await page.getByTestId('hero-register-btn').click();
    await expect(page.getByTestId('registration-modal')).toHaveAttribute('data-state', 'open');
    await page.getByTestId('submit-registration-btn').click();
    await expect(page.getByText('يرجى إدخال الاسم الأول (حرفان على الأقل).')).toBeVisible();

    // Fill real student registration
    await page.getByLabel(/الاسم الأول/).fill('ياسين');
    await page.getByLabel(/اللقب العائلي/).fill('مقدم');
    await page.getByLabel(/رقم الهاتف/).fill('+213 550 81 92 03');
    const select = page.getByLabel(/التخصص الدراسي/);
    const secondOption = select.locator('option').nth(1);
    const specValue = await secondOption.getAttribute('value');
    expect(specValue).toBeTruthy();
    await select.selectOption(specValue!);

    await page.getByLabel(/حساب Instagram/).fill(studentHandle);
    await expect(page.getByTestId('instagram-live-preview')).toContainText(`@${studentHandle}`);
    await page.locator('#confirmedAttendance').check();
    await page.getByTestId('submit-registration-btn').click();

    // Verify navigation to success page with real reference ID
    await expect(page).toHaveURL(/\/success\/REG-\d+/, { timeout: 15000 });
    await expect(page.getByTestId('registration-success-view')).toBeVisible();
    await expect(page.getByTestId('success-student-name')).toHaveText('ياسين مقدم');
    await expect(page.getByTestId('success-instagram')).toHaveText(`@${studentHandle}`);
    submittedRefId = (await page.getByTestId('success-reference-id').textContent())?.trim() ?? '';
    expect(submittedRefId).toMatch(/^REG-\d{6}$/);

    // Page reload preserves session receipt without exposing public DB reads
    await page.reload();
    await expect(page.getByTestId('success-reference-id')).toHaveText(submittedRefId);

    // Duplicate registration rejection test
    await page.goto('/');
    await page.getByTestId('open-registration-modal-btn').click();
    await page.getByLabel(/الاسم الأول/).fill('ياسين');
    await page.getByLabel(/اللقب العائلي/).fill('مقدم');
    await page.getByLabel(/رقم الهاتف/).fill('+213 550 81 92 03');
    await page.getByLabel(/التخصص الدراسي/).selectOption(specValue!);
    await page.getByLabel(/حساب Instagram/).fill(studentHandle.toUpperCase());
    await page.locator('#confirmedAttendance').check();
    await page.getByTestId('submit-registration-btn').click();
    await expect(
      page.getByTestId('student-registration-form').getByText(/يوجد طلب تسجيل نشط مسجل مسبقاً/i),
    ).toBeVisible({ timeout: 10000 });

    monitors.assertClean();
  });

  test('JOURNEY 3: Protected admin routes, non-admin rejection, and valid admin session persistence', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);

    // Unauthenticated route redirect
    await page.goto('/admin/registrations');
    await expect(page).toHaveURL(/\/admin\/login/);

    // Invalid password
    await page.getByLabel(/^البريد الإلكتروني/).fill(ADMIN_EMAIL);
    await page.getByLabel(/^كلمة المرور/).fill('WrongPassword123!');
    await page.getByTestId('admin-login-submit').click();
    await expect(page.getByTestId('login-error-alert')).toBeVisible({ timeout: 10000 });

    // Non-admin authenticated user must be rejected
    if (NON_ADMIN_EMAIL && NON_ADMIN_PASSWORD) {
      await page.getByLabel(/^البريد الإلكتروني/).fill(NON_ADMIN_EMAIL);
      await page.getByLabel(/^كلمة المرور/).fill(NON_ADMIN_PASSWORD);
      await page.getByTestId('admin-login-submit').click();
      await expect(page.getByTestId('login-error-alert')).toContainText(/غير مخوّل/i, {
        timeout: 10000,
      });
    }

    // Valid active admin login (returns to requested /admin/registrations route)
    await page.getByLabel(/^البريد الإلكتروني/).fill(ADMIN_EMAIL);
    await page.getByLabel(/^كلمة المرور/).fill(ADMIN_PASSWORD);
    await page.getByTestId('admin-login-submit').click();
    await expect(page).toHaveURL(/\/admin\/registrations/, { timeout: 15000 });
    await expect(page.getByTestId('registrations-search-input')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await page.locator('aside').getByRole('link', { name: 'لوحة التحكم', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId('kpi-total-count')).toBeVisible({ timeout: 10000 });

    // Ensure no secret/password stored in localStorage
    const storageValues = await page.evaluate(() => Object.values(window.localStorage).join(' '));
    expect(storageValues).not.toContain(ADMIN_PASSWORD);

    // Session persists cleanly after full page reload
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId('kpi-total-count')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    monitors.assertClean();
  });

  test('JOURNEY 4: Admin registration lifecycle (search, drawer, status, notes, edit, manual add, delete)', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);

    // Verify notification from public submission is visible
    await page.getByTestId('notifications-bell-btn').click();
    await expect(page.getByText(new RegExp(studentHandle, 'i')).first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId('notifications-bell-btn').click();

    await page.locator('aside').getByRole('link', { name: 'التسجيلات', exact: true }).click();
    await expect(page).toHaveURL('/admin/registrations');

    // Search for the public student submitted in Journey 1
    await page.getByTestId('registrations-search-input').fill(studentHandle);
    const targetRow = page.getByTestId(`reg-row-${submittedRefId}`);
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Open drawer, accept, add internal note, edit student
    await page.getByTestId(`view-reg-${submittedRefId}`).click();
    const drawer = page.getByTestId('student-details-drawer');
    await expect(drawer).toBeVisible();
    await page.getByTestId('drawer-accept-btn').click();
    await expect(drawer.getByText('مقبول')).toBeVisible({ timeout: 10000 });

    await drawer.locator('textarea').fill('E2E internal audit note');
    await drawer.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.getByText('تم حفظ الملاحظة الداخلية.')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('drawer-edit-btn').click();
    const modal = page.getByTestId('student-form-modal');
    await modal.getByLabel(/الاسم الأول/).fill('ياسين المعدل');
    await page.getByTestId('student-modal-save-btn').click();
    await expect(targetRow).toContainText('ياسين المعدل مقدم', { timeout: 10000 });

    // Close drawer and verify DB persistence across reload
    await page.getByTestId('close-drawer-btn').click();
    await page.waitForLoadState('networkidle');
    await page.reload();
    await page.getByTestId('registrations-search-input').fill(studentHandle);
    await expect(page.getByTestId(`reg-row-${submittedRefId}`)).toContainText('ياسين المعدل مقدم', {
      timeout: 10000,
    });

    // Manual add by admin
    await page.getByTestId('reset-filters-btn').click();
    await page.getByTestId('add-student-btn').click();
    const addModal = page.getByTestId('student-form-modal');
    await addModal.getByLabel(/الاسم الأول/).fill('سلمى');
    await addModal.getByLabel(/اللقب العائلي/).fill('بن عيسى');
    await addModal.getByLabel(/حساب Instagram/).fill(manualHandle);
    await page.getByTestId('student-modal-save-btn').click();
    await page.getByTestId('registrations-search-input').fill(manualHandle);
    await expect(page.locator('tbody').getByText(`@${manualHandle}`)).toBeVisible({ timeout: 10000 });

    // Delete both temporary E2E test registrations so DB stays spotless
    for (const handle of [manualHandle, studentHandle]) {
      await page.getByTestId('registrations-search-input').fill(handle);
      const row = page.locator('tbody tr').filter({ hasText: `@${handle}` }).first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole('button', { name: /عرض التفاصيل الكاملة/i }).click();
      await page.getByTestId('drawer-delete-btn').click();
      await page.getByTestId('confirm-dialog-submit').click();
      await expect(page.getByText('تم حذف التسجيل بنجاح.')).toBeVisible({ timeout: 10000 });
    }
    await page.waitForLoadState('networkidle');

    monitors.assertClean();
  });

  test('JOURNEY 5: Dashboard toggle close/open registration reflects live on public landing page', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');

    // Close registration
    await page.getByTestId('dashboard-reg-toggle').click();
    await expect(page.getByText('التسجيلات مغلقة حالياً').first()).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    // Public site shows closed state
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'التسجيل مغلق مؤقتاً' })).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    // Reopen registration
    await page.goto('/admin/dashboard');
    await page.getByTestId('dashboard-reg-toggle').click();
    await expect(page.getByText('التسجيلات مفتوحة حالياً').first()).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    monitors.assertClean();
  });

  test('JOURNEY 6: Specializations CRUD + Storage Logo Upload + Event Settings Live Persistence', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');

    // Specializations CRUD
    await page.locator('aside').getByRole('link', { name: 'التخصصات', exact: true }).click();
    await expect(page).toHaveURL('/admin/specializations');

    const specNameAr = `الأمن السحابي ${suffix}`;
    const specNameEn = `Cloud Security ${suffix}`;
    await page.getByTestId('add-specialization-btn').click();
    await page.getByLabel(/اسم التخصص \(بالعربية\)/).fill(specNameAr);
    await page.getByLabel(/اسم التخصص \(بالإنجليزية\)/).fill(specNameEn);
    await page.getByTestId('save-specialization-btn').click();
    const specCard = page.locator('article', { hasText: specNameAr });
    await expect(specCard).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify active specialization shows in public modal
    await page.goto('/');
    await page.getByTestId('open-registration-modal-btn').click();
    await expect(
      page.getByLabel(/التخصص الدراسي/).locator('option', { hasText: specNameAr }),
    ).toHaveCount(1);
    await page.waitForLoadState('networkidle');

    // Delete temporary specialization cleanly
    await page.goto('/admin/specializations');
    await specCard.getByRole('button', { name: 'حذف' }).click();
    await page.getByTestId('confirm-dialog-submit').click();
    await expect(page.getByText('تم حذف التخصص بنجاح.').first()).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Event Settings: upload real PNG to Storage + update location + verify on public page + restore
    await page.locator('aside').getByRole('link', { name: 'إعدادات الفعالية', exact: true }).click();
    await expect(page).toHaveURL('/admin/event-settings');

    const originalLocation = await page.getByLabel(/المكان \(بالعربية\)/).inputValue();
    const testLocation = `قاعة الابتكار الحية ${suffix}`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `e2e-logo-${suffix}.png`,
      mimeType: 'image/png',
      buffer: MINI_PNG_BUFFER,
    });
    await expect(page.getByText('تم رفع الشعار الرسمي إلى التخزين السحابي بنجاح.').first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByLabel(/المكان \(بالعربية\)/).fill(testLocation);
    await page.getByTestId('save-event-settings-btn').click();
    await expect(page.getByText('تم حفظ إعدادات الفعالية وتحديث الصفحة العامة.').first()).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    await page.goto('/');
    await expect(page.getByText(testLocation).first()).toBeVisible({ timeout: 10000 });
    await assertImagesLoaded(page);
    await page.waitForLoadState('networkidle');

    // Restore original location and official logo
    await page.goto('/admin/event-settings');
    await page.getByLabel(/المكان \(بالعربية\)/).fill(originalLocation);
    await page.getByRole('button', { name: 'استعادة الشعار الرسمي' }).click();
    await page.getByTestId('save-event-settings-btn').click();
    await expect(page.getByText('تم حفظ إعدادات الفعالية وتحديث الصفحة العامة.').first()).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    monitors.assertClean();
  });

  test('JOURNEY 7: Responsive layout & language toggle check across mobile & desktop', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('open-registration-modal-btn')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertImagesLoaded(page);

    await page.getByTestId('lang-btn-en').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await assertNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);
    await assertNoHorizontalOverflow(page);
    await assertImagesLoaded(page);

    monitors.assertClean();
  });
});
