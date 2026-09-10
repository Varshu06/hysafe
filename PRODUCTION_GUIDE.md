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

## 4. Factory Coordinates & Service Radius Configuration

If your plant/warehouse location changes, you can set custom coordinates via environment variables without modifying source code:

In your EAS build configuration (`eas.json`) or local `.env`:
```env
EXPO_PUBLIC_FACTORY_LAT=13.0827
EXPO_PUBLIC_FACTORY_LNG=80.2707
EXPO_PUBLIC_SERVICE_RADIUS_KM=10
```

---

## 5. Security & Verification Checklist

- [x] **Helmet HTTP Headers**: Strict transport security, XSS protection, and frameguard active.
- [x] **Strict JWT Secret Validation**: Rejects default placeholder keys in production mode.
- [x] **Rate Limiting**: Active on authentication (10 attempts / 15m) and general API (100 req / 15m).
- [x] **Server-Side Pricing**: Prices and delivery charges are calculated strictly from the database.
- [x] **Atomic Inventory**: Concurrency-safe reservation prevents negative stock.
- [x] **Console Stripping**: Sensitive logging is automatically removed in production release builds.
- [x] **Live Health Monitoring**: `/api/health` monitors database connectivity and server uptime.
