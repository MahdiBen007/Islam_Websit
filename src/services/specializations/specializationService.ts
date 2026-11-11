import type { Specialization } from '@/types/domain';
import type { Database } from '@/types/database';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { appDataEvents } from '@/services/api/dataSync';
import { AppServiceError } from '@/services/api/errors';
import type { ISpecializationService } from '@/services/api/types';

type SpecRow = Database['public']['Tables']['specializations']['Row'];

function mapRowToSpecialization(row: SpecRow): Specialization {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    icon: row.icon as Specialization['icon'],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbError(error: { code?: string; message?: string }): never {
  if (error.code === '23505') {
    throw new AppServiceError(
      'SPECIALIZATION_DUPLICATE',
      'A specialization with this name already exists.',
      409,
    );
  }
  if (error.code === '23503') {
    throw new AppServiceError(
      'SPECIALIZATION_IN_USE',
      'Cannot delete specialization that is referenced by existing registrations.',
      409,
    );
  }
  throw new AppServiceError('UNKNOWN_ERROR', error.message ?? 'Specialization operation failed');
}

export const specializationService: ISpecializationService = {
  async list(includeInactive = false): Promise<Specialization[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('specializations')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    return (data ?? []).map(mapRowToSpecialization);
  },

  async getRegistrationCounts(): Promise<Record<string, number>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_specialization_counts');
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }
    const result: Record<string, number> = {};
    Object.entries(data as Record<string, unknown>).forEach(([key, val]) => {
      result[key] = typeof val === 'number' ? val : Number(val) || 0;
    });
    return result;
  },

  async create(input): Promise<Specialization> {
    const supabase = getSupabaseClient();
    const { data: existing } = await supabase
      .from('specializations')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder =
      input.displayOrder ?? ((existing?.[0]?.display_order ?? 0) + 1);

    const { data, error } = await supabase
      .from('specializations')
      .insert({
        name_ar: input.nameAr.trim(),
        name_en: input.nameEn.trim(),
        description: (input.description ?? '').trim(),
        icon: input.icon,
        is_active: input.isActive,
        display_order: nextOrder,
      })
      .select('*')
      .single();

    if (error || !data) {
      mapDbError(error ?? { message: 'Failed to create specialization' });
    }

    appDataEvents.notify();
    return mapRowToSpecialization(data);
  },

  async update(id, input): Promise<Specialization> {
    const supabase = getSupabaseClient();
    const patch: Database['public']['Tables']['specializations']['Update'] = {};

    if (input.nameAr !== undefined) patch.name_ar = input.nameAr.trim();
    if (input.nameEn !== undefined) patch.name_en = input.nameEn.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;

    const { data, error } = await supabase
      .from('specializations')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      mapDbError(error ?? { message: 'Failed to update specialization' });
    }

    appDataEvents.notify();
    return mapRowToSpecialization(data);
  },

  async toggleActive(id: string): Promise<Specialization> {
    const supabase = getSupabaseClient();
    const { data: current, error: fetchError } = await supabase
      .from('specializations')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      throw new AppServiceError('UNKNOWN_ERROR', fetchError?.message ?? 'Specialization not found');
    }

    return this.update(id, { isActive: !current.is_active });
  },

  async remove(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('specializations').delete().eq('id', id);

    if (error) {
      mapDbError(error);
    }

    appDataEvents.notify();
  },
};
