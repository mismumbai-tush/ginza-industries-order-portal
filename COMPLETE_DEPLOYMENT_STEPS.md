# 🚀 COMPLETE DEPLOYMENT GUIDE - Step by Step

## STATUS: App Working Locally ✅

Your console shows:
- ✅ Items loading: 8653 total
- ✅ CKU working: 979 items
- ✅ Customers loading: 205 for Amit Korgaonkar
- ❌ EMBROIDARY: 0 items (no data in Supabase for this category - OK)
- ❌ Google Sheet: CORS error (needs proxy deployment)

---

## 🎯 YOUR IMMEDIATE TASK: Deploy Proxy to Vercel

This is the ONLY thing blocking Google Sheet from working. Follow these exact steps:

### STEP 1: Install Vercel CLI

Open PowerShell and run:

```powershell
npm install -g vercel
```

Wait for it to finish, then verify:

```powershell
vercel --version
```

Should output: `Vercel CLI 32.x.x` or similar

---

### STEP 2: Login to Vercel

```powershell
vercel login
```

- Choose **GitHub** or **Google** (use what you prefer)
- It will open a browser window
- Click **Authorize**
- Come back to PowerShell (it will auto-continue)

---

### STEP 3: Deploy Your Project

From your project folder:

```powershell
cd C:\Users\lenovo\Downloads\ginza-industries-order-portal

vercel
```

**Answer the prompts:**
```
? Set up and deploy "ginza-industries-order-portal"? [Y/n] → Y
? Which scope do you want to deploy to? → Your account (click to select)
? Link to existing project? [y/N] → N
? What's your project's name? → ginza-order-portal (or press Enter for default)
? In which directory is your code located? → ./ (just press Enter)
? Want to modify these settings? [y/N] → N
```

**Wait 30-60 seconds...**

**You'll see:**
```
✅ Production: https://ginza-order-portal.vercel.app [in ... (2s)]
```

**COPY THAT URL!** (e.g., `https://ginza-order-portal.vercel.app`)

---

### STEP 4: Add Environment Variables

You need to tell Vercel where your Google Apps Script is.

**First variable - Google Apps Script URL:**

```powershell
vercel env add GAS_URL production
```

When prompted:
```
? What's the value? → Paste your Google Apps Script URL here
```

Paste this:
```
https://script.google.com/macros/s/AKfycbwx0jU7RZ5k5kElBjoRs0CQizNY_r1bOS8ROEiAlUPRFxMqx7_UzW9jVEUa9_zq6gYwCA/exec
```

(Use YOUR actual GAS URL if different - the one in App Settings)

Press Enter.

**Second variable - Security Key (optional but recommended):**

```powershell
vercel env add PROXY_API_KEY production
```

When prompted:
```
? What's the value? → my-secret-key-12345
```

Enter any secret string (like `my-secret-key-12345`) and press Enter.

---

### STEP 5: Redeploy to Apply Environment Variables

```powershell
vercel --prod
```

Wait... should see:

```
✅ Production: https://ginza-order-portal.vercel.app [in ... (2s)]
```

**Done! Your proxy is now live!** 🎉

---

## 🔧 STEP 6: Configure App Settings

Your app is still running locally at `http://localhost:3000`. Now you need to tell it where the proxy is.

1. **In your browser**, go to: `http://localhost:3000`
2. **Click Settings** ⚙️ (top right or bottom)
3. Scroll to **"Google Sheet Configuration"** section
4. Fill in:
   - **Proxy URL**: Copy your Vercel URL from Step 3, add `/api/proxy`
     - Example: `https://ginza-order-portal.vercel.app/api/proxy`
   - **Proxy API Key**: `my-secret-key-12345` (what you set in Step 4)
5. **Click Save**

Browser should say: "✅ Settings saved successfully"

---

## 🧪 STEP 7: Test It Works

### Test 1: Local App + Proxy

1. **Submit a test order** in app running at `http://localhost:3000`
2. **Open Console**: Press `F12` → Click **Console** tab
3. **Look for these messages:**

```
🚀 Submitting to Google Sheet...
   URL: https://ginza-order-portal.vercel.app/api/proxy...
   Mode: PROXY (Recommended) ← THIS CONFIRMS IT'S USING PROXY!
   
✅ Successfully sent to Google Sheet.
   Response: { result: 'success' }
```

### Test 2: Check Google Sheet

1. Open your **Google Sheet** (the one you shared with doPost code)
   - Sheet ID: `1xVSJlNilOKu2zi-R1Jeuv__buGkzbECSWef0MSLr4oM`
2. Go to the **branch tab** (e.g., "Mumbai")
3. **Scroll to the bottom**
4. **You should see a NEW ROW** with:
   - Timestamp (current time)
   - Customer name
   - Order items
   - All your form data ✅

**If you see it → SUCCESS! 🎉**

---

## 📱 STEP 8: Share Live App (Optional)

Once everything works, deploy the app itself to Vercel too:

```powershell
# From your project folder
vercel
```

This time it will say "Link to existing project?" → Say **Y**

You'll get a **second URL** like:
```
https://ginza-order-portal.vercel.app (this is BOTH app + proxy)
```

Share this URL with friends - they can use the live app!

---

## ❓ TROUBLESHOOTING

### "Failed to login to Vercel"
**Fix:** Use GitHub or Google account that has email

### "vercel: command not found"
**Fix:** Run `npm install -g vercel` again

### "PROXY (Recommended)" NOT showing
**Fix:** 
1. Open Settings
2. Scroll all the way down
3. Make sure Proxy URL is filled (not empty)
4. Click Save
5. Refresh page (F5)

### "Still CORS error in console"
**Fix:** 
- Check Proxy URL is exactly: `https://ginza-order-portal.vercel.app/api/proxy`
- NO extra spaces
- Ends with `/api/proxy`
- Click Save again

### "401 error after fixing Proxy URL"
**Fix:** Make sure API key matches:
- In Vercel: `PROXY_API_KEY=my-secret-key-12345`
- In Settings: `Proxy API Key=my-secret-key-12345`
- Must be EXACT match

### "Google Sheet still empty"
**Fix:**
1. Check console for error message
2. Screenshot the error
3. Google Apps Script logs (Extensions → Apps Script → Executions)
4. May need to check GAS deployment has "Anyone" access

---

## ✅ FINAL CHECKLIST

- [ ] Vercel CLI installed (`vercel --version` works)
- [ ] Logged into Vercel (`vercel login`)
- [ ] Project deployed to Vercel (got URL like `https://ginza-order-portal.vercel.app`)
- [ ] GAS_URL env var set in Vercel
- [ ] PROXY_API_KEY env var set in Vercel
- [ ] Redeployed with `vercel --prod`
- [ ] App Settings updated with Proxy URL
- [ ] App Settings updated with Proxy API Key
- [ ] Test order submitted
- [ ] Console shows "✅ Successfully sent to Google Sheet"
- [ ] New row appears in Google Sheet ✅

---

## 🎯 SUMMARY

**Current State:**
- Local app works ✅
- Database saves work ✅
- Google Sheet save doesn't work ❌

**What fixes it:**
- Deploy proxy to Vercel (5 min)
- Configure app with proxy URL (1 min)
- Test (1 min)

**Total time: ~7 minutes**

Ready? Start with **STEP 1** above! 🚀
