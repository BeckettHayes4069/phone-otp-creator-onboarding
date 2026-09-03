import { loginWithPhone } from "./phone_otp_service";

async function main() {
  let called = false;
  let captchaBody: unknown;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("/v1/captcha/verify")) {
      called = true;
      captchaBody = JSON.parse(String(init?.body));
    }
    return new Response(JSON.stringify({ ok: true, data: { session: "demo" } }), { status: 200 });
  };
  process.env.INFRAI_API_KEY = "test-key";
  process.env.OTP_CODE = "123456";
  const result = await loginWithPhone({ phone: "+15551234567", widgetRecordId: "widget-123", captchaToken: "token" });
  if (JSON.stringify(captchaBody) !== JSON.stringify({ widget_record_id: "widget-123", token: "token", vendor: "hcaptcha", action: "login" })) {
    throw new Error("captcha request body mismatch");
  }
  if (!called || result.tenantState !== "onboarding" || result.accountState !== "active") throw new Error("login decision mismatch");
  globalThis.fetch = original;
  console.log("phone OTP business decision: onboarding + active");
}

main();
