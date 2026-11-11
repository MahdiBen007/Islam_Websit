import type { Language, StudentRegistration } from '@/types/domain';

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildRegistrationsCsv(
  registrations: StudentRegistration[],
  lang: Language,
): string {
  const headers =
    lang === 'ar'
      ? [
          'رقم التسجيل',
          'الاسم الأول',
          'اللقب العائلي',
          'التخصص الدراسي',
          'حساب Instagram',
          'الجامعة / الكلية',
          'البريد الإلكتروني',
          'الهاتف',
          'الحالة',
          'تاريخ التسجيل',
        ]
      : [
          'Reference ID',
          'First Name',
          'Last Name',
          'Specialization',
          'Instagram Handle',
          'University',
          'Email',
          'Phone',
          'Status',
          'Registered At',
        ];

  const statusLabels: Record<StudentRegistration['status'], { ar: string; en: string }> = {
    new: { ar: 'جديد', en: 'New' },
    pending: { ar: 'قيد المراجعة', en: 'Pending Review' },
    approved: { ar: 'مقبول', en: 'Approved' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };

  const rows = registrations.map((r) => [
    r.referenceId,
    r.firstName,
    r.lastName,
    lang === 'ar' ? r.specializationNameAr : r.specializationNameEn,
    r.instagramHandle,
    r.university ?? '',
    r.email ?? '',
    r.phone ?? '',
    statusLabels[r.status][lang],
    new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'en-US'),
  ]);

  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  // UTF-8 BOM ensures Excel renders Arabic text cleanly
  return `\uFEFF${lines.join('\r\n')}`;
}

export function exportRegistrationsToCsv(
  registrations: StudentRegistration[],
  lang: Language,
  filename = `registrations-${new Date().toISOString().slice(0, 10)}.csv`,
): string {
  const csvContent = buildRegistrationsCsv(registrations, lang);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return csvContent;
}
