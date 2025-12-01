# Quick Troubleshooting Checklist

## 🚀 Step 1: Test the App

1. **Refresh the browser**: Press `Ctrl+Shift+R` (hard refresh)
2. **Open Developer Console**: Press `F12` → Click **Console** tab
3. **Login with your credentials**
4. **Watch the console** - you should see colorful logs with ✅ ❌ symbols

---

## 🔍 Step 2: Check Console Output

### EXPECTED OUTPUT (Good):
```
📍 SALESMAN SELECTION CHANGED: "Amit"
📋 Selected Branch ID: mumbai
📋 Selected Branch Name: Mumbai

🔍 FETCHING CUSTOMERS:
   Branch ID: mumbai
   Sales Person ID: sp_mumbai_1
✅ Customers table is accessible
✅ Found 5 customer(s)
✅ Returning customers: Array(5) [...]
```

### BAD OUTPUT (Problems):
```
❌ Supabase NOT configured
   → Fix: Check supabaseClient.ts has correct URL and Key

❌ Cannot access customers table
   Error Code: 42501 (Permission Denied)
   ⚠️ Row Level Security (RLS) might be blocking access
   → Fix: Go to Supabase Dashboard → customers → Disable RLS

❌ No customers match
⚠️ No customers found
❌ Customers table is EMPTY
   → Fix: Add customer data to database
```

---

## 📊 Step 3: Check Supabase Dashboard

1. Go to: **https://supabase.com** → Login
2. Find your project: **"ginza-industries"** or similar
3. Click **"customers"** table on the left
4. **Verify data exists:**
   - Row 1: name="Amit", branch="mumbai", sales_person_id="sp_mumbai_1"
   - Row 2: name="Rajesh", branch="mumbai", sales_person_id="sp_mumbai_1"
   - etc.

**If the table is EMPTY:**
- You need to add customer data manually, OR
- Use the "➕ Add" button in the app to add customers

---

## ✅ Step 4: Test Real-Time Search

1. **Make sure a Salesman is selected**
2. **Click the "Customer Name" field**
3. **Look for this helper text**:
   ```
   💡 5 matching customer(s)
   ```
   (Should show a number, not "Type customer name...")

4. **Type a letter** (e.g., "a")
5. **Watch for filtered results**
6. **Console should show filter logs**

---

## 🛠️ What to Do If Customers Don't Show

### Option 1: Check Branch Selection
```
1. Login
2. Verify Branch dropdown shows your login branch
3. If not selected, click the Branch dropdown
4. Select a branch manually
5. Then select a Salesman
6. Now check Customer Name field
```

### Option 2: Check If Supabase Has Data
```
1. Go to Supabase Dashboard
2. Click "customers" table
3. Look at the data:
   - Is the table EMPTY? (0 rows)
   - Do all rows have NULL values?
   - Does branch column match exactly? (e.g., "mumbai" not "Mumbai")
   - Does sales_person_id match what's in the console?
```

### Option 3: Add Test Data
```
1. In the app, fill the form:
   - Customer Name: "Test Customer"
   - Email: test@email.com
   - Contact: 9999999999
   - Address: Test Address
2. Click ➕ Add button
3. Submit the order
4. Now go to Supabase Dashboard
5. Refresh the customers table
6. You should see the new customer saved!
```

### Option 4: Check Supabase Permissions
```
1. Go to Supabase Dashboard
2. Click "Authentication" on left
3. Check if Row Level Security (RLS) is enabled
4. If yes, and you see permission errors:
   - Click "customers" table
   - Click "Enable RLS" button (if available)
   - Or go to SQL Editor and run:
     ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
```

---

## 📱 Console Filter Search

The Customer Name field uses a standard HTML `<datalist>` element, which means:

✅ **Works:**
- Type partial letters (e.g., "am" finds "Amit")
- Dropdown appears automatically
- Multiple items filter correctly

❌ **Doesn't work:**
- If `filteredCustomers` array is empty
- If Supabase returned 0 results
- If branch/salesman IDs don't match

---

## 🆘 Still Not Working?

**Take these screenshots and share them:**

1. **Browser Console** (F12 → Console tab)
   - Screenshot showing the colored logs (✅ or ❌)

2. **Supabase Dashboard** (customers table)
   - Screenshot showing table structure and data

3. **The Form**
   - Screenshot showing what's selected

4. **Network Errors** (F12 → Network tab)
   - Try to add a customer or refresh
   - Look for red/failed requests
   - Screenshot them

**Then we can debug:**
- Why Supabase returns 0 customers
- If there's a permission issue
- If the IDs don't match
- If the filtering logic has a bug
