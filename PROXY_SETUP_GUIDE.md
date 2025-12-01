# 🚀 Google Sheet Integration Setup Guide - Vercel Proxy

This guide shows how to fix the CORS error when saving orders to Google Sheets using a serverless proxy deployed to Vercel.

## Problem

Browser cannot POST directly to Google Apps Script due to CORS restrictions:
```
❌ Access to fetch ... blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

## Solution

Use a serverless proxy function that:
1. ✅ Runs on a server (Vercel) - no CORS restrictions
2. ✅ Forwards order data to your Google Apps Script
3. ✅ Returns response with proper CORS headers
4. ✅ Provides error handling and logging

---

## Step 1: Push Project to GitHub

If not already done:

```powershell
cd C:\Users\lenovo\Downloads\ginza-industries-order-portal

# Initialize git if needed
git init
git add .
git commit -m "Add serverless proxy for Google Sheets"

# Push to GitHub (create repo on github.com first)
git remote add origin https://github.com/YOUR_USERNAME/ginza-industries-order-portal.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Quickest)

```powershell
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project folder
cd C:\Users\lenovo\Downloads\ginza-industries-order-portal
vercel
```

Follow the prompts:
- Select `Vercel`
- Choose project name: `ginza-order-portal`
- Select framework: `Other` (no framework needed for this project)
- Accept defaults for other questions

**You'll get a deployment URL like:**
```
https://ginza-order-portal.vercel.app
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Framework: Select "Other"
5. Click "Deploy"

---

## Step 3: Configure Environment Variables

After deployment, set the required environment variables in Vercel:

### Using Vercel CLI:

```powershell
vercel env add GAS_URL production
# Paste your Google Apps Script exec URL here, then press Enter

# (Optional) Add API key for security
vercel env add PROXY_API_KEY production
# Paste a random secret string, then press Enter
```

### Using Vercel Dashboard:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add two new variables:

| Name | Value |
|------|-------|
| `GAS_URL` | https://script.google.com/macros/s/AKfycb.../exec |
| `PROXY_API_KEY` | (optional) your-secret-key-123456 |

Then click "Save and Redeploy".

---

## Step 4: Update App Settings

### In your order portal app:

1. Click **Settings** (gear icon)
2. Scroll to **Google Sheet Configuration**
3. Fill in:
   - **Proxy URL**: `https://ginza-order-portal.vercel.app/api/proxy`
   - **Proxy API Key** (if you set one): `your-secret-key-123456`
   - Leave **Direct GAS URL** empty (or keep your GAS URL as fallback)

4. Click **Save**

---

## Step 5: Test It Works

### Submit a test order:

1. Fill out the order form completely
2. Click "Submit & Review"
3. Click "Confirm & Submit"
4. Open browser console (F12)

### Check for success messages:

```
🚀 Submitting to Google Sheet...
   URL: https://ginza-order-portal.vercel.app/api/proxy...
   Mode: PROXY (Recommended)
   ...
✅ Successfully sent to Google Sheet.
   Response: { result: 'success' }
```

### Verify in Google Sheet:

1. Open your Google Sheet (the one with sheet ID: 1xVSJlNilOKu2zi-R1Jeuv__buGkzbECSWef0MSLr4oM)
2. Check the branch tab (e.g., "Mumbai")
3. Scroll to the bottom
4. You should see a new row with your order data ✅

---

## Troubleshooting

### Issue: "Proxy URL returns 500"

**Solution:**
- Check Vercel deployment logs: `vercel logs`
- Verify `GAS_URL` environment variable is set correctly
- Ensure GAS_URL ends with `/exec`
- Check Google Apps Script logs (Extensions → Apps Script → Executions)

### Issue: "Request failed with status 401"

**If using proxy:**
- Check that `PROXY_API_KEY` matches between Vercel env and app Settings
- Regenerate if unsure: `vercel env ls` to list vars

**If using direct GAS:**
- Your Google Apps Script deployment access is still not set to "Anyone"
- Switch to proxy method instead

### Issue: "Order appears in app history but NOT in Google Sheet"

**Check:**
1. Are you looking at the correct branch tab?
2. Did you refresh the Google Sheet (F5)?
3. Check console for any error messages
4. Verify the GAS code has the `doPost(e)` function with branch-wise logic

### Issue: Data in Google Sheet looks incomplete

**Check:**
1. Google Sheet tab has all 18 columns
2. Column headers are correct (Timestamp, Customer Name, Order Date, etc.)
3. One row per item in your order (if you had 2 items, should see 2 rows)

---

## What the Proxy Does

```
┌──────────────────┐
│  Your App        │
│  (localhost)     │
└────────┬─────────┘
         │
         │ POST /api/proxy
         │ (with CORS headers)
         ▼
┌──────────────────┐
│ Vercel Proxy     │ ← This is in api/proxy.js
│ (vercel.app)     │
└────────┬─────────┘
         │
         │ server-to-server POST
         │ (no CORS needed)
         ▼
┌──────────────────┐
│ Google Apps      │
│ Script (GAS)     │ ← Your doPost(e) function
└────────┬─────────┘
         │
         │ Write to Google Sheet
         ▼
┌──────────────────┐
│ Google Sheet     │ ← Order appears in branch tab
└──────────────────┘
```

---

## Security Considerations

### For Production:

1. **Change CORS origin from `*` to your app domain:**
   ```javascript
   // In api/proxy.js, line 15
   res.setHeader('Access-Control-Allow-Origin', 'https://your-app-domain.com');
   ```

2. **Always use `PROXY_API_KEY`:**
   - Generate: `openssl rand -base64 32`
   - Set in Vercel environment
   - Set in app Settings

3. **Monitor usage:**
   - Check Vercel logs: `vercel logs`
   - Watch for unusual POST patterns

---

## Advanced: Redeploy Proxy

If you make changes to `api/proxy.js`:

```powershell
vercel --prod
```

Or push to GitHub and Vercel auto-redeploys.

---

## Need Help?

1. **Check Vercel logs:** `vercel logs` or dashboard
2. **Check app console:** F12 → Console → Look for error messages
3. **Check GAS logs:** Extensions → Apps Script → Executions
4. **Verify GAS code:** Settings → Code editor → Look for `doPost(e)` function

---

**Status:** ✅ Proxy ready to deploy and use!
