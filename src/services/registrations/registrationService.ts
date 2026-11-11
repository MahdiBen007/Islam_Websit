import type {
  CreateRegistrationInput,
  RegistrationStats,
  RegistrationStatus,
  StudentRegistration,
  UpdateRegistrationInput,
} from '@/types/domain';
import {
  getSupabaseClient,
  getSupabaseFunctionsUrl,
  getSupabasePublicHeaders,
} from '@/lib/supabaseClient';
import { appDataEvents } from '@/services/api/dataSync';
import { AppServiceError, type AppErrorCode } from '@/services/api/errors';
import type {
  IRegistrationService,
  PaginatedRegistrationsQuery,
  PaginatedRegistrationsResult,
} from '@/services/api/types';
import { normalizeInstagramHandle } from '@/utils/formatters';

const RECEIPT_CACHE_PREFIX = 'cic_reg_receipt_v1:';

function toDomainStatus(dbStatus: string): RegistrationStatus {
  if (dbStatus === 'under_review') return 'pending';
  if (dbStatus === 'accepted') return 'approved';
  if (dbStatus === 'rejected') return 'rejected';
  return 'new';
}

function toDbStatus(status: RegistrationStatus): 'new' | 'under_review' | 'accepted' | 'rejected' {
  if (status === 'pending') return 'under_review';
  if (status === 'approved') return 'accepted';
  return status;
}

interface RpcRegistrationRecord {
  id: string;
  referenceId: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  instagramHandle: string;
  university?: string | null;
  email?: string | null;
  specializationId: string;
  specializationNameAr: string;
  specializationNameEn: string;
  status: string;
  confirmedAttendance?: boolean;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRpcItem(raw: RpcRegistrationRecord): StudentRegistration {
  return {
    id: raw.id,
    referenceId: raw.referenceId,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone ?? undefined,
    instagramHandle: raw.instagramHandle,
    university: raw.university ?? undefined,
    email: raw.email ?? undefined,
    specializationId: raw.specializationId,
    specializationNameAr: raw.specializationNameAr,
    specializationNameEn: raw.specializationNameEn,
    status: toDomainStatus(raw.status),
    confirmedAttendance: raw.confirmedAttendance ?? true,
    adminNotes: raw.adminNotes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function saveReceiptInSession(registration: StudentRegistration): void {
  try {
    window.sessionStorage.setItem(
      `${RECEIPT_CACHE_PREFIX}${registration.referenceId.toUpperCase()}`,
      JSON.stringify(registration),
    );
  } catch {
    // Ignore storage access errors
  }
}

function readReceiptFromSession(referenceId: string): StudentRegistration | undefined {
  try {
    const raw = window.sessionStorage.getItem(
      `${RECEIPT_CACHE_PREFIX}${referenceId.trim().toUpperCase()}`,
    );
    if (!raw) return undefined;
    return JSON.parse(raw) as StudentRegistration;
  } catch {
    return undefined;
  }
}

function mapEdgeErrorCode(code?: string): AppErrorCode {
  switch (code) {
    case 'DUPLICATE_REGISTRATION':
      return 'DUPLICATE_REGISTRATION';
    case 'REGISTRATION_CLOSED':
      return 'REGISTRATION_CLOSED';
    case 'CAPACITY_REACHED':
      return 'CAPACITY_REACHED';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'BOT_DETECTED':
      return 'BOT_DETECTED';
    case 'SPECIALIZATION_UNAVAILABLE':
      return 'SPECIALIZATION_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

export const registrationService: IRegistrationService = {
  async listPaginated(query: PaginatedRegistrationsQuery = {}): Promise<PaginatedRegistrationsResult> {
    const supabase = getSupabaseClient();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const { data, error } = await supabase.rpc('admin_list_registrations', {
      p_page: page,
      p_page_size: pageSize,
      p_search: query.search?.trim() ?? '',
      p_specialization_id: query.specializationId ? query.specializationId : undefined,
      p_status: query.status ? toDbStatus(query.status) : '',
      p_date_filter: query.dateFilter ?? 'all',
    });

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppServiceError(
        'UNKNOWN_ERROR',
        error?.message ?? 'Failed to load registrations',
      );
    }

    const payload = data as {
      items?: RpcRegistrationRecord[];
      totalCount?: number;
      page?: number;
      pageSize?: number;
    };

    return {
      items: (payload.items ?? []).map(mapRpcItem),
      totalCount: Number(payload.totalCount ?? 0),
      page: Number(payload.page ?? page),
      pageSize: Number(payload.pageSize ?? pageSize),
    };
  },

  async list(): Promise<StudentRegistration[]> {
    const result = await this.listPaginated({ page: 1, pageSize: 200 });
    return result.items;
  },

  async getById(id: string): Promise<StudentRegistration | undefined> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        registration_number,
        specialization_id,
        specialization_name_ar,
        specialization_name_en,
        status,
        confirmed_attendance,
        created_at,
        updated_at,
        students (
          first_name,
          last_name,
          phone,
          instagram_username,
          university,
          email
        ),
        admin_notes (
          note,
          updated_at
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return undefined;

    const student = Array.isArray(data.students) ? data.students[0] : data.students;
    const notes = Array.isArray(data.admin_notes)
      ? [...data.admin_notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.note
      : undefined;

    if (!student) return undefined;

    return {
      id: data.id,
      referenceId: data.registration_number,
      firstName: student.first_name,
      lastName: student.last_name,
      phone: student.phone ?? undefined,
      instagramHandle: student.instagram_username,
      university: student.university ?? undefined,
      email: student.email ?? undefined,
      specializationId: data.specialization_id,
      specializationNameAr: data.specialization_name_ar,
      specializationNameEn: data.specialization_name_en,
      status: toDomainStatus(data.status),
      confirmedAttendance: data.confirmed_attendance,
      adminNotes: notes ?? undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async getByReferenceId(referenceId: string): Promise<StudentRegistration | undefined> {
    const cached = readReceiptFromSession(referenceId);
    if (cached) return cached;

    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return undefined;
    }

    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        registration_number,
        specialization_id,
        specialization_name_ar,
        specialization_name_en,
        status,
        confirmed_attendance,
        created_at,
        updated_at,
        students (
          first_name,
          last_name,
          phone,
          instagram_username,
          university,
          email
        )
      `)
      .ilike('registration_number', referenceId.trim())
      .maybeSingle();

    if (error || !data) return undefined;

    const student = Array.isArray(data.students) ? data.students[0] : data.students;
    if (!student) return undefined;

    return {
      id: data.id,
      referenceId: data.registration_number,
      firstName: student.first_name,
      lastName: student.last_name,
      phone: student.phone ?? undefined,
      instagramHandle: student.instagram_username,
      university: student.university ?? undefined,
      email: student.email ?? undefined,
      specializationId: data.specialization_id,
      specializationNameAr: data.specialization_name_ar,
      specializationNameEn: data.specialization_name_en,
      status: toDomainStatus(data.status),
      confirmedAttendance: data.confirmed_attendance,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async getStats(): Promise<RegistrationStats> {
    const supabase = getSupabaseClient();
    const [{ data, error }, { data: eventRow }] = await Promise.all([
      supabase.rpc('get_registration_stats'),
      supabase.from('event_settings').select('capacity').eq('singleton_key', true).maybeSingle(),
    ]);

    const capacity = Number(eventRow?.capacity ?? 150);

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        total: 0,
        newCount: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        capacity,
        remainingSeats: capacity,
      };
    }

    const raw = data as {
      total?: number;
      newCount?: number;
      underReviewCount?: number;
      acceptedCount?: number;
      rejectedCount?: number;
    };

    const newCount = Number(raw.newCount ?? 0);
    const underReviewCount = Number(raw.underReviewCount ?? 0);
    const approved = Number(raw.acceptedCount ?? 0);

    return {
      total: Number(raw.total ?? 0),
      newCount,
      pending: newCount + underReviewCount,
      approved,
      rejected: Number(raw.rejectedCount ?? 0),
      capacity,
      remainingSeats: Math.max(0, capacity - approved),
    };
  },

  async create(input: CreateRegistrationInput): Promise<StudentRegistration> {
    const response = await fetch(getSupabaseFunctionsUrl('submit-registration'), {
      method: 'POST',
      headers: getSupabasePublicHeaders(),
      body: JSON.stringify({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: (input.phone ?? '').trim(),
        specializationId: input.specializationId,
        instagramHandle: normalizeInstagramHandle(input.instagramHandle),
        confirmedAttendance: input.confirmedAttendance,
        website: input.website ?? '',
      }),
    });

    const json = (await response.json().catch(() => null)) as
      | { registration?: RpcRegistrationRecord; error?: { code?: string; message?: string } }
      | null;

    if (!response.ok || !json?.registration) {
      throw new AppServiceError(
        mapEdgeErrorCode(json?.error?.code),
        json?.error?.message ?? 'Unable to submit registration.',
        response.status,
      );
    }

    const mapped = mapRpcItem(json.registration);
    saveReceiptInSession(mapped);
    return mapped;
  },

  async createByAdmin(
    input: CreateRegistrationInput & {
      status?: RegistrationStatus;
      university?: string;
      email?: string;
    },
  ): Promise<StudentRegistration> {
    const supabase = getSupabaseClient();
    const { data: regId, error } = await supabase.rpc('admin_create_registration', {
      p_first_name: input.firstName.trim(),
      p_last_name: input.lastName.trim(),
      p_phone: (input.phone ?? '').trim(),
      p_specialization_id: input.specializationId,
      p_instagram_username: normalizeInstagramHandle(input.instagramHandle),
      p_university: input.university?.trim() || undefined,
      p_email: input.email?.trim() || undefined,
      p_status: toDbStatus(input.status ?? 'pending'),
    });

    if (error || !regId) {
      if (error?.message?.includes('registrations_active_student_uidx') || error?.code === '23505') {
        throw new AppServiceError('DUPLICATE_REGISTRATION', error.message, 409);
      }
      throw new AppServiceError('UNKNOWN_ERROR', error?.message ?? 'Failed to add student');
    }

    const created = await this.getById(regId);
    appDataEvents.notify();
    if (!created) {
      throw new AppServiceError('UNKNOWN_ERROR', 'Created registration could not be loaded.');
    }
    return created;
  },

  async update(id: string, input: UpdateRegistrationInput): Promise<StudentRegistration> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_update_registration', {
      p_registration_id: id,
      p_first_name: input.firstName !== undefined ? input.firstName.trim() : undefined,
      p_last_name: input.lastName !== undefined ? input.lastName.trim() : undefined,
      p_phone: input.phone !== undefined ? input.phone.trim() : undefined,
      p_instagram_username:
        input.instagramHandle !== undefined
          ? normalizeInstagramHandle(input.instagramHandle)
          : undefined,
      p_university: input.university !== undefined ? input.university : undefined,
      p_email: input.email !== undefined ? input.email : undefined,
      p_specialization_id:
        input.specializationId !== undefined ? input.specializationId : undefined,
      p_status: input.status !== undefined ? toDbStatus(input.status) : undefined,
      p_admin_note: input.adminNotes !== undefined ? input.adminNotes : undefined,
    });

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    const updated = await this.getById(id);
    appDataEvents.notify();
    if (!updated) {
      throw new AppServiceError('UNKNOWN_ERROR', 'Updated registration could not be reloaded.');
    }
    return updated;
  },

  async updateStatus(id: string, status: RegistrationStatus): Promise<StudentRegistration> {
    return this.update(id, { status });
  },

  async bulkUpdateStatus(ids: string[], status: RegistrationStatus): Promise<void> {
    if (ids.length === 0) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('registrations')
      .update({ status: toDbStatus(status) })
      .in('id', ids);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }
    appDataEvents.notify();
  },

  async remove(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('registrations').delete().eq('id', id);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }
    appDataEvents.notify();
  },

  async bulkRemove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('registrations').delete().in('id', ids);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }
    appDataEvents.notify();
  },
};
