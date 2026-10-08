// Loaded before the integration test so dotenv cannot replace these values.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-jwt-secret-32chars-min';
process.env.JWT_EXPIRES_IN = '7d';
process.env.OTP_SALT = 'integration-test-otp-salt-value';
process.env.RESEND_API_KEY = '';
process.env.RESEND_FROM_EMAIL = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.SMTP_FROM = '';
process.env.GOOGLE_OAUTH_CLIENT_IDS = '';
process.env.GOOGLE_WEB_CLIENT_ID = '';
process.env.GOOGLE_WEB_CLIENT_SECRET = '';
process.env.GOOGLE_ANDROID_CLIENT_ID = '';
process.env.GOOGLE_OAUTH_REDIRECT_URIS = '';
