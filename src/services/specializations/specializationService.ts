import type { ISpecializationService } from '@/services/api/types';
import { mockRepository } from '@/services/storage/mockRepository';
import type { Specialization } from '@/types/domain';

export const specializationService: ISpecializationService = {
  async list(includeInactive = true): Promise<Specialization[]> {
    const items = mockRepository.getSpecializations();
    return includeInactive ? items : items.filter((s) => s.isActive);
  },

  async create(
    input: Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Specialization> {
    const now = new Date().toISOString();
    const created: Specialization = {
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nameAr: input.nameAr.trim(),
      nameEn: input.nameEn.trim(),
      icon: input.icon,
      isActive: input.isActive,
      createdAt: now,
      updatedAt: now,
    };
    const items = mockRepository.getSpecializations();
    mockRepository.saveSpecializations([...items, created]);
    return created;
  },

  async update(
    id: string,
    input: Partial<Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Specialization> {
    const items = mockRepository.getSpecializations();
    const idx = items.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error('Specialization not found.');
    }

    const updated: Specialization = {
      ...items[idx],
      ...input,
      nameAr: input.nameAr !== undefined ? input.nameAr.trim() : items[idx].nameAr,
      nameEn: input.nameEn !== undefined ? input.nameEn.trim() : items[idx].nameEn,
      updatedAt: new Date().toISOString(),
    };

    const next = [...items];
    next[idx] = updated;
    mockRepository.saveSpecializations(next);

    // Sync specialization display names on existing registrations
    if (input.nameAr !== undefined || input.nameEn !== undefined) {
      const regs = mockRepository.getRegistrations().map((reg) =>
        reg.specializationId === id
          ? {
              ...reg,
              specializationNameAr: updated.nameAr,
              specializationNameEn: updated.nameEn,
            }
          : reg,
      );
      mockRepository.saveRegistrations(regs);
    }

    return updated;
  },

  async toggleActive(id: string): Promise<Specialization> {
    const items = mockRepository.getSpecializations();
    const target = items.find((s) => s.id === id);
    if (!target) {
      throw new Error('Specialization not found.');
    }
    return this.update(id, { isActive: !target.isActive });
  },

  async remove(id: string): Promise<void> {
    const next = mockRepository.getSpecializations().filter((s) => s.id !== id);
    mockRepository.saveSpecializations(next);
  },
};
