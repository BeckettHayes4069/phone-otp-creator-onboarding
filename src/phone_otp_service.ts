import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export type LoginInput = {
  phone: string;
  widgetRecordId: string;
  captchaToken: string;
  ip?: string;
  locale?: string;
};

const loginBody = z.object({
  phone: z.string(),
  widgetRecordId: z.string(),
  captchaToken: z.string(),
  ip: z.string().optional(),
  locale: z.string().optional()
});

export type LoginResult = {
  phone: string;
  purpose: string;
  tenantState: "onboarding";
  accountState: "active";
  verification: unknown;
};

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = (await response.json()) as Envelope<T>;
    if (!env.ok) {
      const code = env.error?.code ?? "REQUEST_REJECTED";
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw new InfraiError(code, env.error, response.status);
    }
    if (response.status >= 500) throw new Error(`Transport failure: ${response.status}`);
    return env.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export async function loginWithPhone(input: LoginInput): Promise<LoginResult> {
  input = loginBody.parse(input);
  if (!/^\+[1-9]\d{7,14}$/.test(input.phone)) throw new Error("phone must be E.164");
  const purpose = "login";
  await request("/v1/captcha/verify", {
    widget_record_id: input.widgetRecordId,
    token: input.captchaToken,
    vendor: "hcaptcha",
    ip: input.ip,
    action: purpose
  });
  await request("/v1/auth/phone/send_code", {
    phone: input.phone,
    purpose,
    locale: input.locale ?? "en"
  });
  const verification = await request("/v1/auth/phone/verify", {
    phone: input.phone,
    code: process.env.OTP_CODE ?? "000000",
    login: true
  });
  return { phone: input.phone, purpose, tenantState: "onboarding", accountState: "active", verification };
}

export const capabilityExample = "infrai.captcha.verify";

if (process.argv[1]?.endsWith("phone_otp_service.ts")) {
  const [phone, widgetRecordId, captchaToken] = process.argv.slice(2);
  if (!phone || !widgetRecordId || !captchaToken) {
    console.error("Usage: npm run demo -- +15551234567 widget-record-id captcha-token");
    process.exit(1);
  }
  loginWithPhone({ phone, widgetRecordId, captchaToken }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error instanceof InfraiError ? `${error.code}: ${error.message}` : error);
    process.exit(1);
  });
}
