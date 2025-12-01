
import { GOOGLE_SCRIPT_URL } from '../constants';
import { OrderFormData, OrderLineItem } from "../types";

/**
 * Sends the order data to the configured Google Apps Script Web App URL.
 */
export const submitOrderToSheet = async (
  formData: OrderFormData,
  items: OrderLineItem[]
): Promise<boolean> => {
  
  // Get proxy URL from localStorage (User Settings) - preferred over direct GAS URL
  let proxyUrl = localStorage.getItem('proxy_url');
  
  // Fallback to direct GAS URL if no proxy configured (legacy support)
  let directGasUrl = localStorage.getItem('google_script_url');
  if (!directGasUrl && GOOGLE_SCRIPT_URL) {
    directGasUrl = GOOGLE_SCRIPT_URL;
  }

  // Determine which URL to use: proxy > direct
  const targetUrl = proxyUrl || directGasUrl;
  const isUsingProxy = !!proxyUrl;

  if (!targetUrl || targetUrl.includes("YOUR_GOOGLE_APPS_SCRIPT") || targetUrl.trim() === "") {
    console.warn("⚠️ Google Sheet URL is not configured. Data will NOT be sent to Sheets.");
    console.warn("   Please set either Proxy URL or Google Script URL in Settings.");
    return false;
  }

  console.log("🚀 Submitting to Google Sheet...");
  console.log("   URL:", targetUrl.substring(0, 60) + "...");
  console.log("   Mode:", isUsingProxy ? "PROXY (Recommended)" : "DIRECT (Legacy)");
  console.log("   Branch:", formData.branch);
  console.log("   Customer:", formData.customerName);
  console.log("   Items:", items.length);

  const payload = {
    submissionId: Date.now().toString(),
    submissionDate: new Date().toISOString(),
    branch: formData.branch,
    salesPerson: formData.salesPerson,
    salesContactNo: formData.salesContactNo,
    customerName: formData.customerName,
    customerEmail: formData.customerEmail,
    customerContactNo: formData.customerContactNo,
    billingAddress: formData.billingAddress,
    deliveryAddress: formData.deliveryAddress,
    orderDate: formData.orderDate,
    items: items.map(i => ({
      category: i.category,
      itemName: i.itemName || i.manualItemName,
      color: i.color,
      width: i.width,
      quantity: i.quantity,
      uom: i.uom,
      rate: i.rate,
      discount: i.discount,
      deliveryDate: i.deliveryDate,
      remark: i.remark,
      totalAmount: (parseFloat(i.quantity) || 0) * (i.rate || 0)
    }))
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured (for proxy requests)
    const apiKey = localStorage.getItem('proxy_api_key');
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    console.log("   Sending request...");
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log("✅ Successfully sent to Google Sheet.");
      console.log("   Response:", responseData.gasBody || responseData);
      return true;
    } else {
      // Got HTTP error status
      console.error(`❌ Request failed with status ${response.status}`);
      console.error("   Response:", responseData);

      if (response.status === 401) {
        if (isUsingProxy) {
          console.error("🔐 PROXY AUTHENTICATION ERROR (401):");
          console.error("   Fix: Invalid or missing API key in proxy configuration.");
          console.error("   Action: Verify PROXY_API_KEY in Settings matches server config.");
        } else {
          console.error("🔐 GOOGLE APPS SCRIPT AUTHORIZATION ERROR (401):");
          console.error("   Fix: GAS deployment does NOT have public access.");
          console.error("   Action: Use a Proxy URL instead, or update GAS deployment to 'Who has access: Anyone'");
        }
        return false;
      }

      if (response.status === 403) {
        console.error("🔐 FORBIDDEN ERROR (403):");
        console.error("   Fix: Access denied. Check deployment settings.");
        return false;
      }

      if (response.status === 404) {
        console.error("❌ NOT FOUND ERROR (404):");
        console.error("   Fix: URL is invalid or endpoint doesn't exist.");
        return false;
      }

      return false;
    }

  } catch (error) {
    console.error("❌ Failed to submit to Google Sheet:", error);
    console.error("   Error details:", (error as Error).message);

    // If proxy fails, try direct GAS as fallback (if not already using it)
    if (isUsingProxy && directGasUrl && directGasUrl !== targetUrl) {
      console.warn("   Proxy failed, attempting fallback to direct GAS URL...");
      
      try {
        const fallbackResponse = await fetch(directGasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'no-cors' // No-cors for direct GAS (won't get response, but request may be sent)
        });
        
        console.warn("⚠️ Fallback request sent (success cannot be verified).");
        console.warn("   Using no-cors mode. Data may or may not be saved.");
        return false; // Don't claim success when unverified
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
        return false;
      }
    }

    return false;
  }
};
