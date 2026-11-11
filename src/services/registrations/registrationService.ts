import type { IRegistrationService } from '@/services/api/types';
import { mockRepository } from '@/services/storage/mockRepository';
import type {
  CreateRegistrationInput,
  RegistrationStats,
  RegistrationStatus,
  StudentRegistration,
  UpdateRegistrationInput,
} from '@/types/domain';
import { normalizeInstagramHandle } from '@/utils/formatters';

function delay(ms: number): Promise<void> {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const registrationService: IRegistrationService = {
  async list(): Promise<StudentRegistration[]> {
    const items = mockRepository.getRegistrations();
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getById(id: string): Promise<StudentRegistration | undefined> {
    return mockRepository.getRegistrations().find((r) => r.id === id);
  },

  async getByReferenceId(referenceId: string): Promise<StudentRegistration | undefined> {
    return mockRepository
      .getRegistrations()
      .find((r) => r.referenceId.toLowerCase() === referenceId.toLowerCase());
  },

  async getStats(): Promise<RegistrationStats> {
    const registrations = mockRepository.getRegistrations();
    const eventSettings = mockRepository.getEventSettings();
    const total = registrations.length;
    const newCount = registrations.filter((r) => r.status === 'new').length;
    const pending = registrations.filter((r) => r.status === 'pending' || r.status === 'new').length;
    const approved = registrations.filter((r) => r.status === 'approved').length;
    const rejected = registrations.filter((r) => r.status === 'rejected').length;
    const capacity = eventSettings.capacity;
    const remainingSeats = Math.max(0, capacity - total);

    return {
      total,
      newCount,
      pending,
      approved,
      rejected,
      capacity,
      remainingSeats,
    };
  },

  async create(input: CreateRegistrationInput): Promise<StudentRegistration> {
    await delay(250);

    const specializations = mockRepository.getSpecializations();
    const spec = specializations.find((s) => s.id === input.specializationId);
    if (!spec || !spec.isActive) {
      throw new Error('Selected specialization is unavailable or inactive.');
    }

    const now = new Date().toISOString();
    const referenceId = mockRepository.getNextReferenceId();
    const normalizedHandle = normalizeInstagramHandle(input.instagramHandle);

    const newRecord: StudentRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      referenceId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      specializationId: spec.id,
      specializationNameAr: spec.nameAr,
      specializationNameEn: spec.nameEn,
      instagramHandle: normalizedHandle,
      university: input.university?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      status: 'pending',
      confirmedAttendance: input.confirmedAttendance,
      createdAt: now,
      updatedAt: now,
    };

    const existing = mockRepository.getRegistrations();
    mockRepository.saveRegistrations([newRecord, ...existing]);

    // Also add an admin notification
    const notifications = mockRepository.getNotifications();
    mockRepository.saveNotifications([
      {
        id: `notif-${Date.now()}`,
        titleAr: 'طلب تسجيل جديد',
        titleEn: 'New Student Registration',
        messageAr: `قام ${newRecord.firstName} ${newRecord.lastName} (${newRecord.instagramHandle}) بالتسجيل برقم ${newRecord.referenceId}.`,
        messageEn: `${newRecord.firstName} ${newRecord.lastName} (${newRecord.instagramHandle}) registered with ID ${newRecord.referenceId}.`,
        isRead: false,
        createdAt: now,
        registrationId: newRecord.id,
      },
      ...notifications,
    ]);

    return newRecord;
  },

  async update(id: string, input: UpdateRegistrationInput): Promise<StudentRegistration> {
    await delay(120);
    const items = mockRepository.getRegistrations();
    const index = items.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error('Registration not found.');
    }

    const current = items[index];
    let specAr = current.specializationNameAr;
    let specEn = current.specializationNameEn;
    let specId = current.specializationId;

    if (input.specializationId && input.specializationId !== current.specializationId) {
      const spec = mockRepository.getSpecializations().find((s) => s.id === input.specializationId);
      if (spec) {
        specId = spec.id;
        specAr = spec.nameAr;
        specEn = spec.nameEn;
      }
    }

    const updated: StudentRegistration = {
      ...current,
      ...input,
      firstName: input.firstName !== undefined ? input.firstName.trim() : current.firstName,
      lastName: input.lastName !== undefined ? input.lastName.trim() : current.lastName,
      instagramHandle:
        input.instagramHandle !== undefined
          ? normalizeInstagramHandle(input.instagramHandle)
          : current.instagramHandle,
      specializationId: specId,
      specializationNameAr: specAr,
      specializationNameEn: specEn,
      updatedAt: new Date().toISOString(),
    };

    const next = [...items];
    next[index] = updated;
    mockRepository.saveRegistrations(next);
    return updated;
  },

  async updateStatus(id: string, status: RegistrationStatus): Promise<StudentRegistration> {
    return this.update(id, { status });
  },

  async bulkUpdateStatus(ids: string[], status: RegistrationStatus): Promise<void> {
    await delay(120);
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    const next = mockRepository.getRegistrations().map((item) =>
      idSet.has(item.id) ? { ...item, status, updatedAt: now } : item,
    );
    mockRepository.saveRegistrations(next);
  },

  async remove(id: string): Promise<void> {
    await delay(100);
    const next = mockRepository.getRegistrations().filter((item) => item.id !== id);
    mockRepository.saveRegistrations(next);
  },

  async bulkRemove(ids: string[]): Promise<void> {
    await delay(120);
    const idSet = new Set(ids);
    const next = mockRepository.getRegistrations().filter((item) => !idSet.has(item.id));
    mockRepository.saveRegistrations(next);
  },
};
