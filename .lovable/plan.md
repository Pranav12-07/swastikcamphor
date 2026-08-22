# Fix 6-Digit Gmail OTP Login

## Goal
Make email login use a real six-digit code from the authentication backend, with no login button, magic-link URL, or confirmation link in the email, while preserving phone OTP.

## Changes
- Make email OTP the clear primary email flow: email entry, Send OTP, six digit input, Verify OTP, resend cooldown, and change-email action.
- Keep OTP generation, expiry, single-use verification, rate limiting, session creation, and persistence handled by the authentication backend.
- Keep the branded auth email code-only for signup, sign-in, and reauthentication, with the requested subject and no clickable authentication link.
- Improve user-facing verification errors for incorrect, expired, and already-used codes, while logging the underlying development error without exposing secrets.
- Preserve the separate phone OTP path and checkout/account redirect behavior.

## Validation
- Verify the auth page transitions correctly from email entry to six code boxes and supports resend/change-email.
- Confirm the preview auth webhook responds and the template renders a numeric token without login-link content.
- Confirm the live webhook state. The current published route returns 404, so the finalized app must be published before production auth can use the custom numeric-code email.
- Confirm sender-domain status. `notify.swastikcamphor.in` is still awaiting DNS verification, so branded Gmail delivery activates after its DNS setup completes.
