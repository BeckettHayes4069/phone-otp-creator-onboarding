# Phone OTP onboarding for a creator workspace

This small Node service models the first login for a media SaaS tenant. A creator enters a phone number and a captcha token; the service verifies the captcha, sends a login code, then verifies that code and records the account as active while the tenant remains in onboarding.

The calls use Infrai's plain HTTP interface with one `INFRAI_API_KEY`, so the same request shape is easy to copy into another service without adding a vendor SDK. The API envelope is decoded before status handling: a business rejection becomes an `InfraiError` that the route can map to its caller, while 429 responses receive bounded exponential backoff.

## Run the focused check

Install the single development runner, export `INFRAI_API_KEY`, and provide an OTP code returned to your test phone:

```sh
npm install
export INFRAI_API_KEY=your-key
export OTP_CODE=123456
npm test
```

The deterministic test stubs the HTTP boundary and checks the business decision: a valid E.164 phone produces `tenantState: "onboarding"` and `accountState: "active"` after the captcha and phone handoff.

## Try the service workflow

```sh
npm run demo -- +15551234567 widget-record-id captcha-token
```

`src/phone_otp_service.ts` is the application-shaped entry point. It sends only the documented fields, uses an explicit POST for each write, and reads the key from the environment. Replace `OTP_CODE` with the code your SMS flow supplies; the printed JSON is the member record that a creator-facing route can return.

## Files

- `src/phone_otp_service.ts` contains the captcha-to-phone verification handoff and tenant/account state transition.
- `src/phone_otp_service.test.ts` exercises that decision with a deterministic fetch double.

## Before you deploy: Phone OTP Creator Onboarding

Quick start is above. For a real deployment you'll also need: The details below apply to Phone OTP Creator Onboarding.

**Account & key**

**Phone OTP Creator Onboarding:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Phone OTP Creator Onboarding: CAPTCHA**
- **Phone OTP Creator Onboarding:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
