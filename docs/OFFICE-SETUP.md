# Office first-time setup (do this once per environment: your PC, Render, Vercel...)

## 1. Make the secrets
Run each command, copy the output into your `.env` (locally) or the host's Environment settings. Use DIFFERENT values for each environment.

```
# SESSION_SECRET  (salts IP hashes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# SERVICE_CRED_KEY  (encrypts your 2FA secret and, later, service credentials)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ADMIN_ROUTE_SLUG  (the secret address of the Office, 8 to 64 characters: a-z, 0-9, hyphen)
node -e "console.log(require('crypto').randomBytes(9).toString('hex'))"
```

Back up SERVICE_CRED_KEY somewhere safe (your future vault, or offline). If it is lost, the stored 2FA secret cannot be read and you would need to reset 2FA.

## 2. Make your password hash
```
node scripts/hash-password.mjs
```
Type a long, unique password (12+ characters). Copy the printed line `ADMIN_BOOTSTRAP_HASH=b64:...` into `.env`.
Never type your password into `.env`: only the hash goes there.

## 3. Set the other values
`MONGODB_URI`, and `APP_URL` (the address of this environment, for example the one `npm run dev` prints, or your Render address). Cookies become Secure automatically when APP_URL starts with https.

## 4. First login
1. Open `<APP_URL>/<ADMIN_ROUTE_SLUG>/login` (the Office has no link anywhere on the public site).
2. Enter the email you want to use and your password. The first successful login creates your owner account.
3. Scan the QR code with an authenticator app (Google Authenticator, Aegis, 2FAS, Microsoft Authenticator...). Enter the 6-digit code.
4. Save the 10 recovery codes somewhere that is NOT only on this device. They are shown once.
5. After the first login you may delete `ADMIN_BOOTSTRAP_HASH` from the host settings (your password hash is now stored in the database).

## Daily use
- You are signed out after 10 minutes without activity, or when the tab was hidden for 2 minutes, or 12 hours after login.
- Lost a phone or left a device signed in: open the Office on another device, go to Security, press **Sign out everywhere else**. If you think someone else got in, press **Panic**.
- Lost your authenticator app: sign in with the password and use a recovery code instead of the 6-digit code.
