import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAtRoute } from '@/test/testUtils';
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from '@/test/mockBackendServices';

async function signInAsAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^البريد الإلكتروني/i), TEST_ADMIN_EMAIL);
  await user.type(screen.getByLabelText(/^كلمة المرور/i), TEST_ADMIN_PASSWORD);
  await user.click(screen.getByTestId('admin-login-submit'));
  expect(await screen.findByText('مرحباً بك في لوحة التحكم')).toBeInTheDocument();
}

describe('Admin Dashboard & Management Workflows', () => {
  it('validates login form, supports password toggle & forgot password, and rejects invalid credentials', async () => {
    const user = userEvent.setup();
    renderAtRoute('/admin/login');

    // Empty submit validation
    await user.click(await screen.findByTestId('admin-login-submit'));
    expect(await screen.findByText('يرجى إدخال البريد الإلكتروني.')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال كلمة المرور.')).toBeInTheDocument();

    // Password visibility toggle
    const pwdInput = screen.getByLabelText(/^كلمة المرور/i) as HTMLInputElement;
    expect(pwdInput.type).toBe('password');
    await user.click(screen.getByTestId('toggle-password-visibility'));
    expect(pwdInput.type).toBe('text');

    // Invalid credentials error
    await user.type(screen.getByLabelText(/^البريد الإلكتروني/i), 'wrong@university.edu.sa');
    await user.type(pwdInput, 'wrongpass');
    await user.click(screen.getByTestId('admin-login-submit'));
    expect(await screen.findByTestId('login-error-alert')).toBeInTheDocument();

    // Forgot password view
    await user.click(screen.getByTestId('forgot-password-btn'));
    expect(await screen.findByText('استعادة كلمة المرور')).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/البريد الإلكتروني الأكاديمي/i),
      TEST_ADMIN_EMAIL,
    );
    await user.click(screen.getByRole('button', { name: /إرسال رابط الاستعادة/i }));
    expect(await screen.findByTestId('forgot-success-alert')).toBeInTheDocument();
  });

  it('logs in cleanly without storing password in localStorage, shows 3 KPI cards, and logs out', async () => {
    const user = userEvent.setup();
    renderAtRoute('/admin/login');

    await signInAsAdmin(user);

    // Ensure password is never persisted in localStorage
    const allStorage = Object.values(window.localStorage).join(' ');
    expect(allStorage).not.toContain(TEST_ADMIN_PASSWORD);

    // Verify simplified KPI cards
    expect(screen.getByTestId('kpi-total-count')).toHaveTextContent('12');
    expect(screen.getByTestId('kpi-pending-count')).toHaveTextContent('6');
    expect(screen.getByTestId('kpi-accepted-count')).toHaveTextContent('5');

    // Logout
    await user.click(screen.getByTestId('sidebar-logout-btn'));
    expect(await screen.findByTestId('admin-login-form')).toBeInTheDocument();
  });

  it('searches, filters, paginates, edits, changes status, and deletes registrations with confirmation', async () => {
    const user = userEvent.setup();
    renderAtRoute('/admin/login');
    await signInAsAdmin(user);

    await user.click(screen.getByRole('link', { name: 'التسجيلات' }));
    expect(await screen.findByText('إدارة المشتركين')).toBeInTheDocument();

    // Search by Instagram handle
    const searchInput = screen.getByTestId('registrations-search-input');
    await user.type(searchInput, 'mohamed_dev');
    expect(screen.getByTestId('reg-row-REG-001250')).toBeInTheDocument();
    expect(screen.queryByTestId('reg-row-REG-001249')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('reset-filters-btn'));
    expect(screen.getByTestId('reg-row-REG-001249')).toBeInTheDocument();

    // Filter by status
    await user.selectOptions(screen.getByTestId('filter-status'), 'rejected');
    expect(screen.getByTestId('reg-row-REG-001245')).toBeInTheDocument();
    expect(screen.queryByTestId('reg-row-REG-001250')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('reset-filters-btn'));

    // Pagination check (change page size to 5 -> page 2 shows remaining rows)
    await user.selectOptions(screen.getByLabelText(/العدد في الصفحة/i), '5');
    expect(screen.queryByTestId('reg-row-REG-001244')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByTestId('reg-row-REG-001244')).toBeInTheDocument();

    // Open student drawer & accept registration
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByTestId('view-reg-REG-001250'));
    const drawer = await screen.findByTestId('student-details-drawer');
    expect(within(drawer).getByText('محمد بن أحمد')).toBeInTheDocument();

    await user.click(screen.getByTestId('drawer-accept-btn'));
    await waitFor(() => {
      expect(within(drawer).getByText('مقبول')).toBeInTheDocument();
    });

    // Edit student info
    await user.click(screen.getByTestId('drawer-edit-btn'));
    const modal = await screen.findByTestId('student-form-modal');
    const firstNameInput = within(modal).getByLabelText(/الاسم الأول/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'محمد أمين');
    await user.click(screen.getByTestId('student-modal-save-btn'));

    await waitFor(() => {
      const row = screen.getByTestId('reg-row-REG-001250');
      expect(within(row).getByText('محمد أمين بن أحمد')).toBeInTheDocument();
    });

    // Delete via confirmation modal
    await user.click(screen.getByTestId('drawer-delete-btn'));
    await user.click(await screen.findByTestId('confirm-dialog-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('reg-row-REG-001250')).not.toBeInTheDocument();
    });
  });

  it('supports Specializations CRUD and reflects changes in public registration dropdown', async () => {
    const user = userEvent.setup();
    renderAtRoute('/admin/login');
    await signInAsAdmin(user);

    const sidebar = screen.getByRole('complementary');
    await user.click(within(sidebar).getByRole('link', { name: 'التخصصات' }));
    expect(await screen.findByRole('heading', { name: 'إدارة التخصصات' })).toBeInTheDocument();

    // Add specialization
    await user.click(await screen.findByTestId('add-specialization-btn'));
    await user.type(screen.getByLabelText(/اسم التخصص \(بالعربية\)/i), 'الأمن السيبراني');
    await user.type(screen.getByLabelText(/اسم التخصص \(بالإنجليزية\)/i), 'Cybersecurity');
    await user.click(screen.getByTestId('save-specialization-btn'));

    expect(await screen.findByText('الأمن السيبراني')).toBeInTheDocument();

    // Navigate to public site to verify it appears inside registration modal
    await user.click(screen.getByRole('link', { name: 'معاينة الصفحة العامة' }));
    await user.click(await screen.findByTestId('open-registration-modal-btn'));
    const select = await screen.findByLabelText(/التخصص الدراسي/i);
    expect(Array.from(select.querySelectorAll('option')).map((o) => o.textContent)).toContain(
      'الأمن السيبراني',
    );
  });

  it('supports Event Settings updates reflected on public page and hides removed pages', async () => {
    const user = userEvent.setup();
    renderAtRoute('/admin/login');
    await signInAsAdmin(user);

    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).queryByRole('link', { name: 'تخصيص صفحة التسجيل' })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: 'إعدادات النظام' })).not.toBeInTheDocument();

    await user.click(within(sidebar).getByRole('link', { name: 'إعدادات الفعالية' }));
    expect(await screen.findByTestId('event-settings-form')).toBeInTheDocument();

    const locationInput = screen.getByLabelText(/المكان \(بالعربية\)/i);
    await user.clear(locationInput);
    await user.type(locationInput, 'المدرج المركزي للابتكار');
    await user.click(screen.getByTestId('save-event-settings-btn'));
    expect(await screen.findByText('تم حفظ إعدادات الفعالية وتحديث الصفحة العامة.')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'معاينة الصفحة العامة' }));
    expect(await screen.findByTestId('hero-register-btn')).toBeInTheDocument();
    expect(screen.getAllByText('المدرج المركزي للابتكار').length).toBeGreaterThan(0);
  });
});
