# 🚀 Quick Start Guide

Get the Admin Dashboard running in 5 minutes.

## ⚡ Super Quick (Copy-Paste)

```bash
cd admin-dashboard
npm install
npm run dev
```

Done! Dashboard opens at `http://localhost:3000`

---

## 🔑 Login Credentials

Use your backend admin credentials:
```
Email: admin@example.com
Password: your-admin-password
```

---

## ✅ Verify Setup

### Check Backend is Running
```bash
curl http://localhost:5000/api/orders
```

Should return JSON (not 404).

### Check Frontend is Running
Open browser: `http://localhost:3000`

Should see login page.

---

## 📋 What You Get

After logging in, you can access:

- 📊 **Dashboard** - Stats and charts
- 📦 **Orders** - Manage orders
- 👥 **Customers** - View customers
- 👔 **Staff** - Manage delivery staff
- 📚 **Inventory** - Track stock

---

## 🔧 Environment Setup (Optional)

Update `.env` if API is on different URL:

```bash
VITE_API_BASE_URL=http://your-api-url:5000/api
VITE_APP_NAME=HySafe Admin Dashboard
```

Then restart dev server.

---

## 🐛 If Something Goes Wrong

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 in use
```bash
npm run dev -- --port 3001
```

### Login fails
- Check backend is running (port 5000)
- Verify credentials in backend
- Check `.env` has correct API URL

### API calls fail
- Open DevTools (F12)
- Check Network tab for failed requests
- Check Console for errors

---

## 📚 Next Steps

After you verify it works:

1. **Read README.md** - Understand features
2. **Read SETUP_GUIDE.md** - Deep dive setup
3. **Read ARCHITECTURE.md** - Understand code
4. **Explore src/** - Review source code

---

## 🎉 You're Ready!

The dashboard is fully functional. Start using it!

Need help? Check the documentation files.
