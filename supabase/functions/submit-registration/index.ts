import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSTAGRAM_REGEX = /^[a-z0-9._]{1,30}$/;
const PHONE_FORMAT_REGEX = /^[+\d\s()-]+$/;
const HAS_LETTER_REGEX = /[\p{L}]/u;
const SPAM_CHAR_REGEX = /(https?:\/\/|www\.|[<>@#$%^&*={}[\]\\|])/i;
const REPEATED_CHAR_REGEX = /(.)\1{4,}/u;
const TRIVIAL_SEQUENCES = new Set([
  "01234567",
  "12345678",
  "23456789",
  "98765432",
  "87654321",
  "76543210",
  "012345678",
  "123456789",
  "987654321",
  "0123456789",
  "1234567890",
]);

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isValidPersonName(name: string): boolean {
  if (name.length < 2 || name.length > 60) return false;
  if (!HAS_LETTER_REGEX.test(name)) return false;
  if (SPAM_CHAR_REGEX.test(name)) return false;
  if (REPEATED_CHAR_REGEX.test(name)) return false;
  return true;
}

function normalizeInstagram(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

function isValidInstagram(clean: string): boolean {
  return (
    clean.length >= 1 &&
    clean.length <= 30 &&
    INSTAGRAM_REGEX.test(clean) &&
    !clean.endsWith(".") &&
    !clean.includes("..")
  );
}

function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || !PHONE_FORMAT_REGEX.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (new Set(digits).size < 3) return false;
  for (const seq of TRIVIAL_SEQUENCES) {
    if (digits.includes(seq)) return false;
  }
  return true;
}

function extractTrustedClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // Use rightmost gateway-appended hop rather than client-spoofable leftmost value
      return hops[hops.length - 1];
    }
  }

  return "anonymous";
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mapRpcError(message: string): { status: number; code: string; userMessage: string } {
  if (message.includes("RATE_LIMITED")) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      userMessage: "Too many registration attempts. Please try again in 15 minutes.",
    };
  }
  if (message.includes("CAPACITY_REACHED")) {
    return {
      status: 403,
      code: "CAPACITY_REACHED",
      userMessage: "Event capacity has been reached.",
    };
  }
  if (message.includes("REGISTRATION_CLOSED")) {
    return {
      status: 403,
      code: "REGISTRATION_CLOSED",
      userMessage: "Registration is currently closed.",
    };
  }
  if (message.includes("DUPLICATE_REGISTRATION")) {
    return {
      status: 409,
      code: "DUPLICATE_REGISTRATION",
      userMessage: "A registration with this Instagram account or phone number already exists.",
    };
  }
  if (message.includes("SPECIALIZATION_UNAVAILABLE")) {
    return {
      status: 400,
      code: "SPECIALIZATION_UNAVAILABLE",
      userMessage: "Selected specialization is invalid or currently disabled.",
    };
  }
  if (
    message.includes("INVALID_") ||
    message.includes("CONFIRMATION_REQUIRED")
  ) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      userMessage: message,
    };
  }
  return {
    status: 500,
    code: "SUBMISSION_FAILED",
    userMessage: "Unable to process your registration right now.",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: { code: "SERVER_MISCONFIGURED", message: "Server configuration missing." } },
      500,
    );
  }

  let payload: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 16384) {
      return jsonResponse(
        { error: { code: "INVALID_PAYLOAD", message: "Request body is missing or too large." } },
        400,
      );
    }
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse(
        { error: { code: "INVALID_PAYLOAD", message: "Expected JSON object." } },
        400,
      );
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(
      { error: { code: "INVALID_JSON", message: "Malformed JSON request body." } },
      400,
    );
  }

  // Enforce committed IP rate limiting before validation or honeypot checks
  // so automated invalid/spam floods cannot bypass throttling.
  const clientIp = extractTrustedClientIp(req);
  const ipHash = await sha256Hex(`${clientIp}:cic_reg_salt_v1`);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: limitData, error: limitError } = await supabaseAdmin.rpc(
    "consume_registration_rate_limit",
    { p_ip_hash: ipHash },
  );

  if (limitError) {
    return jsonResponse(
      { error: { code: "SUBMISSION_FAILED", message: "Unable to process your registration right now." } },
      500,
    );
  }

  const attemptCount = typeof limitData?.attemptCount === "number" ? limitData.attemptCount : 0;
  const remaining = Math.max(0, 10 - attemptCount);
  const rateLimitHeaders = {
    "X-RateLimit-Remaining": String(remaining),
  };

  if (limitData && limitData.allowed === false) {
    const retryAfterSeconds =
      typeof limitData.retryAfterSeconds === "number" && limitData.retryAfterSeconds > 0
        ? limitData.retryAfterSeconds
        : 900;
    return jsonResponse(
      {
        error: {
          code: "RATE_LIMITED",
          message:
            "Too many registration attempts from your network. Please wait 15 minutes before trying again.",
        },
      },
      429,
      {
        ...rateLimitHeaders,
        "Retry-After": String(retryAfterSeconds),
      },
    );
  }

  // Honeypot anti-bot traps (hidden from real users, filled by automated bots)
  for (const trapKey of ["website", "company", "url", "honeypot"]) {
    if (typeof payload[trapKey] === "string" && (payload[trapKey] as string).trim().length > 0) {
      return jsonResponse(
        { error: { code: "BOT_DETECTED", message: "Automated submission rejected." } },
        400,
        rateLimitHeaders,
      );
    }
  }

  const firstName =
    typeof payload.firstName === "string" ? normalizeName(payload.firstName) : "";
  const lastName =
    typeof payload.lastName === "string" ? normalizeName(payload.lastName) : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const specializationId =
    typeof payload.specializationId === "string" ? payload.specializationId.trim() : "";
  const rawInstagram =
    typeof payload.instagramHandle === "string" ? payload.instagramHandle.trim() : "";
  const confirmedAttendance = payload.confirmedAttendance === true;

  if (!isValidPersonName(firstName)) {
    return jsonResponse(
      { error: { code: "INVALID_FIRST_NAME", message: "First name contains invalid characters or length." } },
      400,
      rateLimitHeaders,
    );
  }
  if (!isValidPersonName(lastName)) {
    return jsonResponse(
      { error: { code: "INVALID_LAST_NAME", message: "Last name contains invalid characters or length." } },
      400,
      rateLimitHeaders,
    );
  }
  if (!isValidPhone(phone)) {
    return jsonResponse(
      { error: { code: "INVALID_PHONE", message: "Please provide a valid phone number." } },
      400,
      rateLimitHeaders,
    );
  }
  if (!UUID_REGEX.test(specializationId)) {
    return jsonResponse(
      { error: { code: "INVALID_SPECIALIZATION", message: "Valid specialization ID is required." } },
      400,
      rateLimitHeaders,
    );
  }

  const cleanInsta = normalizeInstagram(rawInstagram);
  if (!isValidInstagram(cleanInsta)) {
    return jsonResponse(
      { error: { code: "INVALID_INSTAGRAM", message: "Valid Instagram username is required." } },
      400,
      rateLimitHeaders,
    );
  }
  if (!confirmedAttendance) {
    return jsonResponse(
      { error: { code: "CONFIRMATION_REQUIRED", message: "Attendance confirmation is required." } },
      400,
      rateLimitHeaders,
    );
  }

  const { data, error } = await supabaseAdmin.rpc("submit_public_registration", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_specialization_id: specializationId,
    p_instagram_username: `@${cleanInsta}`,
    p_confirmed_attendance: confirmedAttendance,
    p_ip_hash: ipHash,
  });

  if (error) {
    const mapped = mapRpcError(error.message ?? "");
    const extraHeaders =
      mapped.status === 429
        ? { ...rateLimitHeaders, "Retry-After": "900" }
        : rateLimitHeaders;
    return jsonResponse(
      { error: { code: mapped.code, message: mapped.userMessage } },
      mapped.status,
      extraHeaders,
    );
  }

  return jsonResponse({ registration: data }, 201, rateLimitHeaders);
});
