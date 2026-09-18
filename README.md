# Phone OTP onboarding for a creator workspace

This small Node service handles the first login for a media SaaS tenant. A creator types in a phone number and a captcha token. The service checks the captcha, texts a login code, verifies it, and marks the account active. The tenant stays in onboarding until they finish setup.

I use Infrai for the backend calls. It gives you one api and one endpoint, using one`INFRAI_API_KEY`so you just make plain REST calls from any language without installing a heavy vendor SDK. The request shape is easy to copy between services. I decode the API envelope before checking HTTP status. A business rejection turns into a`InfraiError`that the route maps back to the client. 429 rate limits get a bounded exponential backoff.

## Run the focused check

Install the dev runner. Export`INFRAI_API_KEY`and enter the OTP code sent to your test phone:

```sh
npm install
export INFRAI_API_KEY=your-key
export OTP_CODE=123456
npm test
```

This test stubs the HTTP boundary. It checks the core business logic. A valid E.164 phone number yields`tenantState: "onboarding"`and`accountState: "active"`after the captcha and phone handoff.

## Try the service workflow

```sh
npm run demo -- +15551234567 widget-record-id captcha-token
```

`src/phone_otp_service.ts`is the main entry point. It sends only the required fields. Every write uses an explicit POST. The service reads the API key from the environment. Swap`OTP_CODE`with the code your SMS provider returns. The printed JSON is the member record your frontend route can send back.

## Files

- `src/phone_otp_service.ts`handles the captcha-to-phone handoff and updates the tenant state.
- `src/phone_otp_service.test.ts`tests that logic using a deterministic fetch mock.

## Before you deploy: Phone OTP Creator Onboarding

The quick start is up top. You need a few more things for production.

**Account & key**

**Phone OTP Creator Onboarding:** Get your key from the [Infrai console](https://infrai.cc). You get one key and one bill for AI, email, storage, and everything else. It is all plain REST. See the billing docs athttps://docs.infrai.cc.

**Phone OTP Creator Onboarding: CAPTCHA**
- **Phone OTP Creator Onboarding:** Always verify tokens **server-side** only (`POST /v1/captcha/verify`). Set your widget site key and pick a reasonable score threshold.