import { expect, test, type Page } from '@playwright/test';

const DEMO_EMAIL = 'admin@university.edu.sa';
const DEMO_PASS = '123456';

function attachRuntimeMonitors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} (${req.failure()?.errorText ?? 'failed'})`);
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
  await page.goto('/admin/login');
  await page.getByLabel(/^(البريد الإلكتروني|Email Address)/i).fill(DEMO_EMAIL);
  await page.getByLabel(/^(كلمة المرور|Password)/i).fill(DEMO_PASS);
  await page.getByTestId('admin-login-submit').click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('End-to-End Student & Admin Journeys', () => {
  test('JOURNEY 1: Arabic Registration (RTL, Tajawal, Submission & Reference Copy)', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await page.goto('/');

    // Select Arabic explicitly and verify RTL + Tajawal font
    await page.getByTestId('lang-btn-ar').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFont).toContain('Tajawal');

    await assertImagesLoaded(page);

    // Open registration modal via Hero CTA, verify close/reopen animation
    await page.getByTestId('hero-register-btn').click();
    const modal = page.getByTestId('registration-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('data-state', 'open');

    // Close via close button and verify modal disappears
    await page.getByTestId('close-registration-modal-btn').click();
    await expect(modal).toBeHidden();

    // Reopen via CTA section button
    await page.getByTestId('open-registration-modal-btn').click();
    await expect(modal).toBeVisible();

    // Fill required fields
    await modal.getByLabel(/الاسم الأول/).fill('سليم');
    await modal.getByLabel(/اللقب العائلي/).fill('منصوري');
    await modal.getByLabel(/رقم الهاتف/).fill('0550 44 55 66');
    await modal.getByLabel(/التخصص الدراسي/).selectOption('spec-se');
    await modal.getByLabel(/حساب Instagram/).fill('salim_creative');
    await expect(modal.getByTestId('instagram-live-preview')).toContainText('@salim_creative');
    await modal.getByRole('checkbox').check();

    // Submit registration
    await modal.getByTestId('submit-registration-btn').click();

    // Verify success screen & submitted details
    await expect(page).toHaveURL(/\/success\/REG-\d{6}/);
    await expect(page.getByTestId('registration-success-view')).toBeVisible();
    await expect(page.getByTestId('success-student-name')).toHaveText('سليم منصوري');
    await expect(page.getByTestId('success-phone')).toHaveText('0550 44 55 66');
    await expect(page.getByTestId('success-specialization')).toHaveText(
      'هندسة البرمجيات وتكنولوجيا المعلومات',
    );
    await expect(page.getByTestId('success-instagram')).toHaveText('@salim_creative');
    const refText = (await page.getByTestId('success-reference-id').textContent()) ?? '';
    expect(refText).toMatch(/^REG-\d{6}$/);

    // Copy reference ID and return home
    await page.getByTestId('copy-ref-inline-btn').click();
    await expect(page.getByText('تم نسخ رقم التسجيل بنجاح.')).toBeVisible();
    await page.getByTestId('return-home-btn').click();
    await expect(page).toHaveURL('/');

    monitors.assertClean();
  });

  test('JOURNEY 2: English Registration (LTR, Nunito Sans, Full English Success)', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await page.goto('/');

    // Switch to English
    await page.getByTestId('lang-btn-en').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFont).toContain('Nunito Sans');

    // Open registration modal and submit in English
    await page.getByTestId('hero-register-btn').click();
    const modal = page.getByTestId('registration-modal');
    await expect(modal).toBeVisible();

    await modal.getByLabel(/First Name/i).fill('Lina');
    await modal.getByLabel(/Last Name/i).fill('Haddad');
    await modal.getByLabel(/Phone Number/i).fill('+213 661 22 33 44');
    await modal.getByLabel(/Academic Specialization/i).selectOption('spec-design');
    await modal.getByLabel(/Instagram Username/i).fill('@lina.studio');
    await modal.getByRole('checkbox').check();
    await modal.getByTestId('submit-registration-btn').click();

    await expect(page).toHaveURL(/\/success\/REG-\d{6}/);
    await expect(page.getByTestId('success-student-name')).toHaveText('Lina Haddad');
    await expect(page.getByTestId('success-phone')).toHaveText('+213 661 22 33 44');
    await expect(page.getByTestId('success-specialization')).toHaveText(
      'Graphic Design & Digital Media',
    );
    await expect(page.getByTestId('success-instagram')).toHaveText('@lina.studio');
    await expect(page.getByText('Your Registration Request Has Been Received!')).toBeVisible();

    // Reload preserves selected English language and student data
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('success-student-name')).toHaveText('Lina Haddad');

    monitors.assertClean();
  });

  test('JOURNEY 3: Admin Login, Dashboard Navigation & Logout', async ({ page }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);

    await expect(page.getByTestId('kpi-total-count')).toBeVisible();
    await expect(page.getByTestId('kpi-pending-count')).toBeVisible();
    await expect(page.getByTestId('kpi-accepted-count')).toBeVisible();
    await assertImagesLoaded(page);

    // Navigate via sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('link', { name: 'تخصيص صفحة التسجيل' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'إعدادات النظام' })).toHaveCount(0);
    await sidebar.getByRole('link', { name: 'التخصصات', exact: true }).click();
    await expect(page).toHaveURL('/admin/specializations');
    await sidebar.getByRole('link', { name: 'إعدادات الفعالية', exact: true }).click();
    await expect(page).toHaveURL('/admin/event-settings');

    // Logout
    await page.getByTestId('sidebar-logout-btn').click();
    await expect(page).toHaveURL('/admin/login');

    // Protected route redirects back to login after logout
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/admin/login');

    monitors.assertClean();
  });

  test('JOURNEY 4: Registration Management (Search, Filters, Drawer, Accept, Edit, Delete)', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);

    await page.locator('aside').getByRole('link', { name: 'التسجيلات', exact: true }).click();
    await expect(page).toHaveURL('/admin/registrations');

    // Search for a student
    await page.getByTestId('registrations-search-input').fill('محمد بن أحمد');
    await expect(page.getByTestId('reg-row-REG-001250')).toBeVisible();
    await expect(page.getByTestId('reg-row-REG-001249')).not.toBeVisible();
    await page.getByTestId('reset-filters-btn').click();

    // Filter by specialization & status
    await page.getByTestId('filter-specialization').selectOption('spec-ai');
    await page.getByTestId('filter-status').selectOption('new');
    await expect(page.getByTestId('reg-row-REG-001250')).toBeVisible();
    await page.getByTestId('reset-filters-btn').click();

    // Open student details drawer & accept registration
    await page.getByTestId('view-reg-REG-001250').click();
    const drawer = page.getByTestId('student-details-drawer');
    await expect(drawer).toBeVisible();
    await page.getByTestId('drawer-accept-btn').click();
    await expect(drawer.getByText('مقبول')).toBeVisible();

    // Edit student info
    await page.getByTestId('drawer-edit-btn').click();
    const modal = page.getByTestId('student-form-modal');
    await modal.getByLabel(/الاسم الأول/).fill('محمد ياسين');
    await page.getByTestId('student-modal-save-btn').click();
    await expect(
      page.getByTestId('reg-row-REG-001250').getByText('محمد ياسين بن أحمد'),
    ).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'محمد ياسين بن أحمد' })).toBeVisible();

    // Delete with confirmation
    await page.getByTestId('drawer-delete-btn').click();
    await page.getByTestId('confirm-dialog-submit').click();
    await expect(page.getByTestId('reg-row-REG-001250')).not.toBeVisible();

    monitors.assertClean();
  });

  test('JOURNEY 5: Specializations CRUD Syncs with Public Dropdown', async ({ page }) => {
    const monitors = attachRuntimeMonitors(page);
    await loginAsAdmin(page);

    await page.locator('aside').getByRole('link', { name: 'التخصصات', exact: true }).click();
    await expect(page).toHaveURL('/admin/specializations');

    // Add specialization
    await page.getByTestId('add-specialization-btn').click();
    await page.getByLabel(/اسم التخصص \(بالعربية\)/).fill('الروبوتيك والأنظمة المدمجة');
    await page.getByLabel(/اسم التخصص \(بالإنجليزية\)/).fill('Robotics & Embedded Systems');
    await page.getByTestId('save-specialization-btn').click();
    await expect(page.getByText('الروبوتيك والأنظمة المدمجة')).toBeVisible();

    // Edit the newly added specialization
    const card = page.locator('article', { hasText: 'الروبوتيك والأنظمة المدمجة' });
    await card.getByRole('button', { name: 'تعديل' }).click();
    await page.getByLabel(/اسم التخصص \(بالعربية\)/).fill('الروبوتيك والأنظمة الذكية');
    await page.getByTestId('save-specialization-btn').click();
    await expect(page.getByText('الروبوتيك والأنظمة الذكية')).toBeVisible();

    // Verify it appears on public registration dropdown inside modal
    await page.goto('/');
    await page.getByTestId('open-registration-modal-btn').click();
    const dropdown = page.getByLabel(/التخصص الدراسي/);
    await expect(dropdown.locator('option', { hasText: 'الروبوتيك والأنظمة الذكية' })).toHaveCount(
      1,
    );

    // Return to Specializations and disable it
    await page.goto('/admin/specializations');
    const updatedCard = page.locator('article', { hasText: 'الروبوتيك والأنظمة الذكية' });
    await updatedCard.getByRole('button', { name: 'تعطيل' }).click();
    await expect(updatedCard.getByText('معطل')).toBeVisible();

    // Verify disabled specialization cannot be selected on public form
    await page.goto('/');
    await page.getByTestId('open-registration-modal-btn').click();
    const refreshedDropdown = page.getByLabel(/التخصص الدراسي/);
    await expect(
      refreshedDropdown.locator('option', { hasText: 'الروبوتيك والأنظمة الذكية' }),
    ).toHaveCount(0);

    monitors.assertClean();
  });

  test('JOURNEY 6: Responsive Check Across All 6 Viewports & Visual Screenshots', async ({
    page,
  }) => {
    const monitors = attachRuntimeMonitors(page);
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);

      // Public landing RTL & LTR
      await page.goto('/');
      await page.getByTestId('lang-btn-ar').click();
      await assertNoHorizontalOverflow(page);
      await assertImagesLoaded(page);

      await page.getByTestId('lang-btn-en').click();
      await assertNoHorizontalOverflow(page);

      // Admin login
      await page.goto('/admin/login');
      await page.getByTestId('lang-btn-ar').click();
      await assertNoHorizontalOverflow(page);
    }

    // Check authenticated admin pages on desktop & mobile viewports + capture visual QA screenshots
    const qaDir =
      'C:/Users/Admin/.gemini/antigravity/brain/cc946a11-5120-4b60-aab5-d0c9bcfb036e/scratch/qa';

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.getByTestId('lang-btn-ar').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.screenshot({
      path: `${qaDir}/01-public-landing-ar.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByTestId('hero-register-btn').click();
    await expect(page.getByTestId('registration-modal')).toHaveAttribute('data-state', 'open');
    await page.screenshot({
      path: `${qaDir}/09-registration-modal-desktop.png`,
      animations: 'disabled',
    });
    await page.getByTestId('close-registration-modal-btn').click();
    await expect(page.getByTestId('registration-modal')).toBeHidden();

    await page.getByTestId('lang-btn-en').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await page.screenshot({
      path: `${qaDir}/02-public-landing-en.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByTestId('lang-btn-ar').click();

    await page.goto('/success/REG-001250');
    await expect(page.getByTestId('registration-success-view')).toBeVisible();
    await page.screenshot({
      path: `${qaDir}/03-success-ar.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto('/admin/login');
    await expect(page.getByTestId('admin-login-form')).toBeVisible();
    await page.screenshot({
      path: `${qaDir}/04-admin-login.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/13-mobile-admin-login.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);
    await expect(page.getByTestId('kpi-total-count')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `${qaDir}/05-admin-dashboard.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto('/admin/registrations');
    await expect(page.getByTestId('reg-row-REG-001250')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/06-admin-registrations.png`,
      fullPage: true,
      animations: 'disabled',
    });

    // Medium screens QA (768x1024 Tablet & 1024x768 Medium Laptop)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/dashboard');
    await expect(page.getByTestId('kpi-total-count')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/14-tablet-admin-dashboard.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto('/admin/registrations');
    await expect(page.getByTestId('registrations-search-input')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/16-tablet-admin-registrations.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/dashboard');
    await expect(page.getByTestId('kpi-total-count')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/15-medium-1024-admin-dashboard.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto('/admin/registrations');
    await expect(page.getByTestId('registrations-search-input')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/17-medium-1024-admin-registrations.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('open-registration-modal-btn')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/07-mobile-public.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.getByTestId('hero-register-btn').click();
    await expect(page.getByTestId('registration-modal')).toHaveAttribute('data-state', 'open');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/10-registration-modal-mobile.png`,
      animations: 'disabled',
    });
    await page.getByTestId('close-registration-modal-btn').click();
    await expect(page.getByTestId('registration-modal')).toBeHidden();

    await page.goto('/success/REG-001250');
    await expect(page.getByTestId('registration-success-view')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/12-mobile-success.png`,
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto('/admin/dashboard');
    await expect(page.getByTestId('kpi-total-count')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/11-mobile-admin-dashboard.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto('/admin/registrations');
    await expect(page.getByTestId('registrations-search-input')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${qaDir}/08-mobile-admin-registrations.png`,
      fullPage: true,
      animations: 'disabled',
    });

    monitors.assertClean();
  });
});
