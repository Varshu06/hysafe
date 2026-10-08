# HySafe Production Deployment & Runbook

This guide covers the complete end-to-end steps to launch **HySafe** to production.

---

## 1. Backend Cloud Deployment

### Recommended Cloud Platforms:
- **Render** (Recommended for Node.js + WebSockets)
- **Railway**
- **DigitalOcean App Platform**
- **AWS EC2 / Elastic Beanstalk**

### Deployment Steps (e.g. on Render / Railway):
1. Push your code to your GitHub repository (the `backend` folder).
2. Create a new **Web Service** pointing to the repository.
3. Set the Root Directory to `backend`.
4. Configure Build and Start Commands:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Configure Environment Variables in the cloud dashboard:
   - `PORT`: `5000` (or leave default assigned by provider)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas cluster connection string
   - `JWT_SECRET`: A secure 64-character hex key (e.g. `c4b9e782a15f0d368e721a95b3d0e28f7416a9c8b0e5d321f8a7e4b9c1d6e0a3`)
   - `JWT_EXPIRES_IN`: `7d`
   - `RESEND_API_KEY`: Your live Resend API key (`re_...`)
   - `RESEND_FROM_EMAIL`: `"HySafe Support" <support@yourverifieddomain.com>`
   - `CORS_ORIGIN`: Your Admin Dashboard URL (e.g. `https://admin.yourdomain.com`)
6. Deploy the service. Your backend will be accessible over HTTPS, e.g.:
   `https://hysafe-api.onrender.com`

---

## 2. Setting Up Resend Custom Domain (For Live Customer Emails)

On Resend's free tier, sending is restricted to your account owner's email address. To send password reset OTPs to any customer:
1. Log in to [https://resend.com/domains](https://resend.com/domains).
2. Click **Add Domain** (e.g., `mail.yourdomain.com`).
3. Add the provided **MX, TXT (SPF), and CNAME (DKIM)** records to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap).
4. Once verified, set `RESEND_FROM_EMAIL` to:
   ```env
   RESEND_FROM_EMAIL="HySafe Support" <support@yourdomain.com>
   ```

---

## 3. Building the Mobile App (Android APK & Play Store AAB)

The project is pre-configured with **EAS (Expo Application Services)**.

### Step A: Initialize EAS
In the project root folder:
```bash
npx eas-cli login
npx eas-cli init
```
This will automatically link your project and write your unique `projectId` into `app.json`.

### Step B: Configure the Live API URL in `eas.json`
Open `eas.json` and replace `https://api.yourdomain.com/api` with your deployed backend URL:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://hysafe-api.onrender.com/api"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://hysafe-api.onrender.com/api"
      }
    }
  }
}
```

### Step C: Build Standalone Test APK (For Physical Phones)
To build an `.apk` file that anyone can download and install directly on Android without Google Play:
```bash
npx eas-cli build -p android --profile preview
```
When finished, EAS provides a download QR code and direct `.apk` link.

### Step D: Build Play Store Production App Bundle (AAB)
To build the official `.aab` for the Google Play Console:
```bash
npx eas-cli build -p android --profile production
```

---

## 4. Service Location & Radius Configuration

The service/delivery location is **8A, T.B Road, Valliyur - 627117**. The customer app's checkout uses a 5 km straight-line radius from configured coordinates. Set the coordinates from the confirmed map pin for this exact service location; do not use the business mailing address or an approximate town-center coordinate.

In your EAS build configuration (`eas.json`) or local `.env`:
```env
EXPO_PUBLIC_FACTORY_LAT=<latitude from the confirmed Valliyur service-location pin>
EXPO_PUBLIC_FACTORY_LNG=<longitude from the confirmed Valliyur service-location pin>
EXPO_PUBLIC_SERVICE_RADIUS_KM=5
```

The API enforces the same radius and does not use the app's unset-coordinate fallback. In `backend/.env`, set the same confirmed pin:

```env
FACTORY_LAT=<same latitude as EXPO_PUBLIC_FACTORY_LAT>
FACTORY_LNG=<same longitude as EXPO_PUBLIC_FACTORY_LNG>
SERVICE_RADIUS_KM=5
```

`FACTORY_LAT` and `FACTORY_LNG` are required before an order that includes coordinates can be accepted. If they are missing or invalid, that order is rejected and no other city is substituted. An order with no coordinates is still accepted. Use the same confirmed pin in the client variables above. These coordinates are not secrets.

---

## 5. Security & Verification Checklist

- [x] **Helmet HTTP Headers**: Strict transport security, XSS protection, and frameguard active.
- [x] **Strict JWT Secret Validation**: Rejects default placeholder keys in production mode.
- [x] **Rate Limiting**: Active on authentication (10 attempts / 15m) and general API (100 req / 15m).
- [x] **Server-Side Pricing**: Prices and delivery charges are calculated strictly from the database.
- [x] **Atomic Inventory**: Concurrency-safe reservation prevents negative stock.
- [x] **Console Stripping**: Sensitive logging is automatically removed in production release builds.
- [x] **Live Health Monitoring**: `/api/health` monitors database connectivity and server uptime.

---

## 6. Progressive Web App (customer and staff)

The Expo app is the PWA. The admin dashboard stays a separate Vite site. Android and iOS native builds in `eas.json` are unchanged.

The web export is a single-page app (`web.output` is `single` in `app.json`). One `index.html` handles every route, including refresh and order links.

### Local web development

From the repository root, with the backend already running:

```bash
npm run web
```

Expo serves the app, usually at `http://localhost:8081`. The service worker is not registered on the Expo dev server (ports 8081 and 19006), so development reloads are not cached.

Set `EXPO_PUBLIC_API_URL` when the API is not on this machine. Leave it empty in local development to use `http://localhost:5000/api`. Do not put tokens in this variable.

### Production web build

```bash
npm run build:web
```

This runs `expo export -p web` and writes `dist/`. Before building for a real domain, set:

| Name | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend base URL, including `/api`, for example `https://api.example.com/api` |
| `EXPO_PUBLIC_SOCKET_URL` | Optional. Origin only, for example `https://api.example.com`. Derived from the API URL when omitted |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional. Used by the native address-selection map |
| `EXPO_PUBLIC_FACTORY_LAT` | Confirmed Valliyur service-pin latitude |
| `EXPO_PUBLIC_FACTORY_LNG` | Confirmed Valliyur service-pin longitude |
| `EXPO_PUBLIC_SERVICE_RADIUS_KM` | Optional. Defaults to 5 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Public web OAuth client ID for the PWA and desktop browsers |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Public Android OAuth client ID. Required for a native Android build |

These values are embedded in the public web bundle. They are not secrets. Never put `JWT_SECRET`, database URLs, or user tokens in `EXPO_PUBLIC_*` variables.

Preview the build:

```bash
npx serve dist
```

### HTTPS hosting

Host `dist/` on any static HTTPS host. `vercel.json` is set up for the Expo web app only:

- Build: `npx expo export -p web`
- Output: `dist`
- Unknown paths rewrite to `/index.html` after real files such as `/sw.js`, `/manifest.json`, and `/_expo/*` are served
- `/sw.js` is sent with `Cache-Control: no-cache` so browsers can see a new worker

On the API host, set `CORS_ORIGIN` to the exact PWA origin, for example `https://app.example.com`. Socket.io uses the same allow-list. Native apps send no Origin and are still allowed. Do not put `*` in production.

iOS only installs a PWA from Safari on HTTPS (localhost is the development exception).

### iPhone and iPad installation

1. Open the site in Safari. Chrome and Firefox on iOS cannot add a home-screen app themselves.
2. Tap Share, then Add to Home Screen.
3. Open HySafe from the new icon. It launches without the Safari toolbar.

The site shows these steps until they are dismissed or the app is already running standalone. Android Chrome and desktop Chromium can use the browser install control. The closed or suspended iOS app does not keep a live socket; returning to it reconnects and reloads orders from the API.

### Service worker updates

`public/sw.js` uses network-first for HTML and JavaScript, so an online reload gets the new bundle. Images and icons can be cached. API calls, Socket.io, and any non-GET request are not cached. Order creation is never replayed.

After a deploy, the next visit downloads the new `sw.js` because it is not cached long-term. When a new worker is ready, the app asks the user to reload. If a release must drop old caches immediately, change `CACHE_NAME` in `public/sw.js` before building.

Offline, the app shows a banner, and a failed navigation can show `offline.html`. Placing an order, changing a subscription, or updating a delivery still requires the server.

---

## 7. Google Sign-In (Android app and iOS PWA)

Google sign-in creates the same HySafe JWT used by phone and password login. The Google ID token is checked on the server and is not stored as the app session. Phone, password, and OTP login stay available. The admin dashboard does not use Google sign-in.

A new Google user becomes a customer. The server stores Google's `sub` on `user.googleId`. It does not attach Google to an existing account just because the email matches. A customer who already has that email signs in with their phone and password, then links Google from Privacy & Security. The verified Google email must match the email already saved on that account. Staff and admin accounts cannot sign in or gain permissions through Google.

### Google Cloud Console

Use the same Google Cloud project for these clients. Do not put the web client secret in the mobile app, a web bundle, or any `EXPO_PUBLIC_` variable.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select the HySafe project.
2. Configure the OAuth consent screen. Add the app name, support email, and the privacy policy URL you actually host. While the app is in Testing, only listed test users can sign in. Publishing is required before real customers can use it.
3. Add the production PWA domain under Authorized domains when that domain exists. This repository does not contain a production domain, so that value is still missing.
4. Create an OAuth client of type **Web application**.
   - Authorized JavaScript origins: `http://localhost:8081` for Expo web. Add the production origin, such as `https://your-real-pwa-host`, when you have it.
   - Authorized redirect URI: `http://localhost:8081/` for local web. The trailing slash is required. Add the production redirect `https://your-real-pwa-host/` when you have it. If Expo web is opened on another port, add that exact origin with a trailing slash too.
5. Create an OAuth client of type **Android**.
   - Package name: `com.hysafe.mobile` (from `app.json`).
   - SHA-1 certificate fingerprint: not stored in this repo. The EAS project id in `app.json` is empty, so there is no fingerprint to copy from here. After `eas credentials -p android`, or from the keystore that signs the build, copy the SHA-1 into this Android client. Debug and release builds have different fingerprints. Add each one that you use.
6. Copy the web and Android client IDs into the environment variables below. Copy the web client secret only into the backend environment.

The iPhone app path is the PWA in Safari or on the Home Screen. It uses the web client. There is no separate iOS native OAuth client in this setup.

### Environment variables

Mobile and web (public client IDs only):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:8081/
```

For an EAS Android build, set the Web client ID in the EAS environment. `eas.json` does not contain it. A build without that Web client ID cannot request a Google ID token.

Backend:

```env
GOOGLE_OAUTH_CLIENT_IDS=your-web-client-id.apps.googleusercontent.com,your-android-client-id.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=your-web-client-secret
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_REDIRECT_URIS=http://localhost:8081/
```

`GOOGLE_OAUTH_CLIENT_IDS` is the only audience the server accepts. Include the web client ID and the Android client ID. Android native sign-in produces an ID token whose audience is the Web client. `GOOGLE_OAUTH_REDIRECT_URIS` and `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` must be the same string that is registered on the Web client. The local redirect is `http://localhost:8081/` with one trailing slash. The JavaScript origin has no path. A production HTTPS redirect must be added in Google Cloud and in both variables before a production web build. That redirect is for the browser and iOS PWA only. Android does not send a redirect URI. `CORS_ORIGIN` must include the PWA origin, without a trailing slash, or the browser cannot call `POST /api/auth/google`. Production startup refuses to boot when any of these Google variables is missing.

### How each platform signs in

**Browser and iOS PWA.** The login screen redirects the same window to Google using Authorization Code and PKCE. Safari, an installed Home Screen app, desktop browsers, and Android browsers all use this path. It does not open a popup. Google returns to `origin + /`. The app checks the `state` value, sends the code and verifier to the backend, and the backend exchanges them with the web client secret. The secret never ships in the app. After a successful login, the HySafe JWT is stored the same way as a phone login. On web that storage is `localStorage` through AsyncStorage. A script running in the page can read it, so the API remains the authority and the service worker does not cache the token, the API, or the OAuth return URL.

**Android.** The native app uses Google Play Services sign-in and sends the resulting ID token to the backend. It does not open `accounts.google.com` with a custom-scheme `redirect_uri`. Google returns `400 invalid_request` for those schemes on Android. The ID token audience is the Web client ID. Play Services matches the installed app to the Android OAuth client by package name `com.hysafe.mobile` and the SHA-1 of the keystore that signed that binary. This does not work in Expo Go. Use a development build or an EAS build that includes `@react-native-google-signin/google-signin`, and register that build's SHA-1 on the Android OAuth client. Debug, EAS, and Play App Signing certificates are different.

### API

`POST /api/auth/google`

```json
{ "idToken": "google-id-token" }
```

or, for the browser and iOS PWA code flow:

```json
{ "code": "authorization-code", "codeVerifier": "pkce-verifier", "redirectUri": "https://your-real-pwa-host/" }
```

The response matches phone login: `{ "message", "token", "user" }`. The token is a HySafe JWT (`userId`, `role`) and is checked by the existing auth middleware. The route is rate-limited. The server rejects a Google access token, a client-supplied email, role, or Google id, an unverified email, the wrong audience, and an expired or badly signed ID token.

`POST /api/auth/google/link` requires the current customer JWT. It links `sub` only when the verified Google email matches the email already on that customer.

Google-only customers get an internal phone value that is not a real mobile number, so they cannot use the phone form until a real number is added. They sign in with Google again. Staff accounts continue to use phone and password.

### Local development

1. Put the placeholders above in `.env` and `backend/.env`. Do not commit those files.
2. Start the API.
3. From the repository root, run `npm run web` and open `http://localhost:8081`.
4. The redirect URI registered in Google Cloud and in `GOOGLE_OAUTH_REDIRECT_URIS` must be `http://localhost:8081/`.

### Production PWA

Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` before `npm run build:web`. Register the real HTTPS origin and `https://<that-origin>/` in Google Cloud and in `GOOGLE_OAUTH_REDIRECT_URIS`. Set `CORS_ORIGIN` to that origin. This repository does not yet name that host.

### Troubleshooting

| What you see | What to check |
| --- | --- |
| Google sign-in is not configured | The Web client ID, or the backend audience list, is empty |
| Redirect URI mismatch | The browser origin plus a trailing slash must match Google Cloud and `GOOGLE_OAUTH_REDIRECT_URIS` exactly |
| Access blocked / app in testing | Publish the consent screen or add the Google account as a test user |
| Android sign-in fails after the account picker, or Play Services reports a developer error | The installed binary is Expo Go, or its SHA-1 is not on the Android OAuth client. Package name must be `com.hysafe.mobile` |
| Google error 400 invalid_request on accounts.google.com | The app sent a custom-scheme redirect_uri. Android must use native sign-in and must not send `com.hysafe.mobile:/oauthredirect` or `com.googleusercontent.apps.<id>:/oauth2redirect` |
| Email already exists | That person already has a HySafe account. They sign in with their phone, then link Google from Privacy & Security |
| This account must sign in with a phone number | The Google email belongs to staff or admin. Google cannot be used for that role |
| Account is inactive | The account was disabled. Google does not bypass that |
| Popup blocked | The PWA should not use a popup. Reload the latest web build |
| iPhone Home Screen opens Safari and does not stay signed in | Start the redirect from the installed app with `window.location`. Do not use `window.open`. iOS device confirmation was not run in this workspace |
