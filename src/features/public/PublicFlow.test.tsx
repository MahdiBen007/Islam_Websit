import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '@/test/testUtils';
import { specializationService } from '@/services/specializations/specializationService';

describe('Public Student Registration Experience', () => {
  it('opens and closes the registration modal smoothly and validates form + Instagram formats', async () => {
    const user = userEvent.setup();
    renderAtRoute('/');

    // Modal should be closed initially
    expect(screen.queryByTestId('registration-modal')).not.toBeInTheDocument();

    // Open modal via Hero CTA
    await user.click(screen.getByTestId('hero-register-btn'));
    expect(await screen.findByTestId('registration-modal')).toBeInTheDocument();

    // Close modal via close button and verify removal after exit animation
    await user.click(screen.getByTestId('close-registration-modal-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('registration-modal')).not.toBeInTheDocument();
    });

    // Reopen modal via CTA section button
    await user.click(screen.getByTestId('open-registration-modal-btn'));
    expect(await screen.findByTestId('registration-modal')).toBeInTheDocument();

    // Submit empty form
    await user.click(screen.getByTestId('submit-registration-btn'));

    expect(
      await screen.findByText('يرجى إدخال الاسم الأول (حرفان على الأقل).'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('يرجى إدخال اللقب العائلي (حرفان على الأقل).'),
    ).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال رقم الهاتف.')).toBeInTheDocument();
    expect(screen.getByText('يرجى اختيار التخصص الدراسي.')).toBeInTheDocument();
    expect(screen.getByText('يرجى إدخال اسم مستخدم Instagram.')).toBeInTheDocument();
    expect(
      screen.getByText('يجب تأكيد صحة المعلومات والالتزام بالحضور للمتابعة.'),
    ).toBeInTheDocument();

    // Enter invalid phone format
    const phoneInput = screen.getByLabelText(/رقم الهاتف/i);
    await user.type(phoneInput, '123');
    await user.click(screen.getByTestId('submit-registration-btn'));
    expect(
      await screen.findByText('رقم الهاتف غير صالح. يرجى إدخال رقم صحيح مكوّن من 8 إلى 15 رقماً.'),
    ).toBeInTheDocument();

    // Enter valid phone number
    await user.clear(phoneInput);
    await user.type(phoneInput, '0550 12 34 56');

    // Enter invalid Instagram handle with spaces
    const instaInput = screen.getByLabelText(/حساب Instagram/i);
    await user.type(instaInput, 'bad handle!');
    await user.click(screen.getByTestId('submit-registration-btn'));

    expect(
      await screen.findByText(/اسم المستخدم غير صالح/i),
    ).toBeInTheDocument();

    // Enter valid Instagram handle without @ and verify live preview
    await user.clear(instaInput);
    await user.type(instaInput, 'creativity_dz');
    expect(screen.getByTestId('instagram-live-preview')).toHaveTextContent('@creativity_dz');
  });

  it('switches language between Arabic (RTL) and English (LTR) and persists selection', async () => {
    const user = userEvent.setup();
    renderAtRoute('/');

    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByText('أطلق إبداعك وكن جزءاً من التغيير!')).toBeInTheDocument();

    // Switch to English
    await user.click(screen.getByTestId('lang-btn-en'));

    await waitFor(() => {
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
    expect(screen.getByTestId('open-registration-modal-btn')).toHaveTextContent(
      'Register Your Spot Now',
    );
    expect(window.localStorage.getItem('cic_language_v1')).toBe('en');

    // Open modal in English and verify translated title
    await user.click(screen.getByTestId('open-registration-modal-btn'));
    expect(await screen.findByText('Registration Form')).toBeInTheDocument();

    // Close modal with Escape and switch back to Arabic
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByTestId('registration-modal')).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId('lang-btn-ar'));
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
    });
  });

  it('populates specializations dynamically inside modal and excludes disabled ones', async () => {
    const user = userEvent.setup();
    await specializationService.toggleActive('spec-humanities');
    renderAtRoute('/');

    await user.click(screen.getByTestId('open-registration-modal-btn'));
    const select = await screen.findByLabelText(/التخصص الدراسي/i);
    const optionTexts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);

    expect(optionTexts).toContain('هندسة البرمجيات وتكنولوجيا المعلومات');
    expect(optionTexts).not.toContain('العلوم الإنسانية واللغات');
  });

  it('submits registration via modal and renders submitted student details with copy reference action', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    renderAtRoute('/');

    await user.click(screen.getByTestId('header-register-btn'));
    await user.type(await screen.findByLabelText(/الاسم الأول/i), 'أنس');
    await user.type(screen.getByLabelText(/اللقب العائلي/i), 'بلحاج');
    await user.type(screen.getByLabelText(/رقم الهاتف/i), '+213 550 98 76 54');
    await user.selectOptions(screen.getByLabelText(/التخصص الدراسي/i), 'spec-ai');
    await user.type(screen.getByLabelText(/حساب Instagram/i), 'anas_creator');
    await user.click(screen.getByRole('checkbox'));

    await user.click(screen.getByTestId('submit-registration-btn'));

    // Verify success screen renders submitted values
    expect(await screen.findByTestId('registration-success-view')).toBeInTheDocument();
    expect(screen.getByTestId('success-student-name')).toHaveTextContent('أنس بلحاج');
    expect(screen.getByTestId('success-phone')).toHaveTextContent('+213 550 98 76 54');
    expect(screen.getByTestId('success-specialization')).toHaveTextContent(
      'علوم الحاسب والذكاء الاصطناعي',
    );
    expect(screen.getByTestId('success-instagram')).toHaveTextContent('@anas_creator');

    const refId = screen.getByTestId('success-reference-id').textContent ?? '';
    expect(refId).toMatch(/^REG-\d{6}$/);

    // Copy reference ID
    await user.click(screen.getByTestId('copy-ref-inline-btn'));
    expect(writeTextMock).toHaveBeenCalledWith(refId);
    expect(await screen.findByText('تم نسخ رقم التسجيل بنجاح.')).toBeInTheDocument();
  });
});
