
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, History, Wand2, Loader2, Printer, MapPin, RefreshCcw, Edit2, LogOut, User, CheckCircle, HardDrive, UploadCloud, FileSpreadsheet, X, Eye, Settings, Copy, Check, Users, Package, HelpCircle, RefreshCw, Home, Download, Menu } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { BRANCHES, MOCK_ITEMS, UNIT_CATEGORIES, MEASUREMENT_UNITS, SALES_PERSONS, BRANCH_ID_MAPPING } from './constants';
import { FormMode, OrderFormData, OrderLineItem, SubmittedOrder, SalesPerson, Branch, RegisteredUser, Customer, Item } from './types';
import { Button } from './components/Button';
import { Input, Select } from './components/Input';
import { smartParseOrder } from './services/geminiService';
import { submitOrderToSheet } from './services/sheetService';
import { fetchCustomersBySalesPerson, fetchMasterItems, createNewCustomer, saveOrderToDb, bulkUpsertItems, registerUser, loginUser, fetchAllAppUsers, bulkUpsertCustomers, createGhostUser, fetchCustomersByBranchAndSalesPerson, seedTestCustomers } from './services/supabaseService';

const INITIAL_FORM_DATA: OrderFormData = {
  branch: '',
  salesPerson: '',
  salesContactNo: '',
  customerName: '',
  customerEmail: '',
  customerContactNo: '',
  billingAddress: '',
  deliveryAddress: '',
  orderDate: format(new Date(), 'yyyy-MM-dd')
};

const INITIAL_ITEM: OrderLineItem = {
  id: '',
  category: '', 
  itemName: '', 
  manualItemName: '', 
  color: '',
  width: '',
  uom: '', 
  quantity: '',
  rate: 0,
  discount: 0,
  deliveryDate: format(new Date(), 'yyyy-MM-dd'),
  remark: ''
};

interface UserSession {
  branch: Branch;
  salesPerson: SalesPerson;
}

function App() {
  // --- Authentication State ---
  const [session, setSession] = useState<UserSession | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regBranchId, setRegBranchId] = useState('');

  // --- Data State (Supabase) ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dbItems, setDbItems] = useState<Item[]>([]);
  const [allSalesPersons, setAllSalesPersons] = useState<RegisteredUser[]>([]);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // --- Application State ---
  const [mode, setMode] = useState<FormMode>(FormMode.NEW_FORM);
  const [formData, setFormData] = useState<OrderFormData>(INITIAL_FORM_DATA);
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [currentItem, setCurrentItem] = useState<OrderLineItem>({ ...INITIAL_ITEM, id: Date.now().toString() });
  
  // History State
  const [historyOrders, setHistoryOrders] = useState<SubmittedOrder[]>([]);
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false); // New Preview Modal State
  
  // Search/Filter States
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [manuallyAddedCustomers, setManuallyAddedCustomers] = useState<Customer[]>([]);

  // Admin/Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState<'ITEMS' | 'CUSTOMERS'>('ITEMS');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- Effects ---

  // Handle PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Load History & Settings on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('order_history');
    if (savedHistory) {
      try {
        const parsed: SubmittedOrder[] = JSON.parse(savedHistory);
        const recent = parsed.filter(order => {
          const daysDiff = differenceInDays(new Date(), new Date(order.submissionDate));
          return daysDiff <= 5;
        });
        setHistoryOrders(recent);
        if (recent.length !== parsed.length) {
          localStorage.setItem('order_history', JSON.stringify(recent));
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    const savedUrl = localStorage.getItem('google_script_url');
    if (savedUrl) setGoogleScriptUrl(savedUrl);
  }, []);

  // Load Data from Supabase when session is active
  const loadDbData = async () => {
    if (!session) return;
    
    // 1. Fetch Master Items
    console.log('📥 Loading items from database...');
    const masterItems = await fetchMasterItems();
    console.log(`✅ Loaded ${masterItems.length} items from Supabase`);
    if (masterItems.length > 0) {
      console.log('📋 Sample items:', masterItems.slice(0, 3));
      setDbItems(masterItems);
    } else {
      console.warn('⚠️  No items from database, using mock items');
      setDbItems(MOCK_ITEMS);
    }

    // 2. Fetch All Sales Persons (Registered Users) for the dropdown
    console.log('👥 Loading salespeople list...');
    await refreshSalesPersonsList();
  };

  const refreshSalesPersonsList = async () => {
    setIsRefreshingUsers(true);
    const users = await fetchAllAppUsers();
    setAllSalesPersons(users);
    setIsRefreshingUsers(false);
  };

  useEffect(() => {
    if (session) {
      loadDbData();

      // Set Initial Header Data
      setFormData(prev => ({
        ...prev,
        branch: session.branch.name,
        salesPerson: session.salesPerson.name,
        salesContactNo: session.salesPerson.contactNo
      }));

      // Initial load of customers for the logged-in user
      handleSalesPersonChange(session.salesPerson.name, true);
    }
  }, [session]);

  // --- HO & BRANCH LOGIC: Filter Sales Persons ---
  const getVisibleSalesPersons = () => {
    if (!session) return [];
    
    // Determine which branch to use: form-selected branch or session branch
    let branchId = session.branch.id;
    if (formData.branch) {
      const selectedBranch = BRANCHES.find(b => b.name === formData.branch);
      if (selectedBranch) {
        branchId = selectedBranch.id;
      }
    }
    
    // Filter sales persons from the SALES_PERSONS constant based on selected branch
    const branchSalesPeople = SALES_PERSONS.filter(sp => sp.branchId === branchId);
    
    // Also include any registered users from that branch (in case they registered)
    const registeredInBranch = allSalesPersons.filter(u => u.branchId === branchId);
    
    // Combine both lists, avoiding duplicates
    const combined = [
      ...branchSalesPeople,
      ...registeredInBranch.filter(reg => 
        !branchSalesPeople.find(sp => sp.name === `${reg.firstName} ${reg.lastName}`)
      )
    ];
    
    return combined;
  };

  // Handle Logic when Sales Person changes (Manual or Auto)
  const handleSalesPersonChange = async (spName: string, isInitialLoad = false) => {
    // Safety check for undefined or null string
    if (!spName) {
      console.log('❌ No salesman name provided');
      setCustomers([]);
      return;
    }

    const cleanSpName = spName.trim();
    if (!cleanSpName) return;

    console.log(`\n📍 SALESMAN SELECTION CHANGED: "${cleanSpName}"`);

    // Get the selected branch from form data (for user selection) or session (for initial load)
    let selectedBranchId = formData.branch ? BRANCHES.find(b => b.name === formData.branch)?.id : null;
    if (!selectedBranchId && session) {
      selectedBranchId = session.branch.id;
    }

    console.log('📋 Selected Branch ID:', selectedBranchId);
    console.log('📋 Selected Branch Name:', formData.branch || session?.branch.name);

    if (!selectedBranchId) {
      console.error('❌ No branch ID found - cannot load customers');
      setCustomers([]);
      return;
    }

    console.log(`\n🔄 LOADING CUSTOMERS:\n   Salesman Name: ${cleanSpName}\n   Branch ID: ${selectedBranchId}`);
    // Fetch customers filtered by branch and sales person name
    const myCustomers = await fetchCustomersByBranchAndSalesPerson(selectedBranchId, cleanSpName);
    console.log(`✅ RESULT: ${myCustomers.length} customers loaded`);
    setCustomers(myCustomers);
  };

  // Auto-filter customers as user types - Show BOTH Supabase + manually added customers
  useEffect(() => {
    // Combine Supabase customers + manually added customers (no duplicates)
    const allAvailableCustomers = [
      ...customers,
      ...manuallyAddedCustomers.filter(m => 
        !customers.find(c => c.name.toLowerCase() === m.name.toLowerCase())
      )
    ];

    if (!formData.customerName || formData.customerName.trim().length === 0) {
      // Show all customers when search field is empty
      setFilteredCustomers(allAvailableCustomers);
      return;
    }

    // Filter by search term
    const searchTerm = formData.customerName.toLowerCase();
    const filtered = allAvailableCustomers.filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm)
    );
    
    setFilteredCustomers(filtered);
  }, [formData.customerName, customers, manuallyAddedCustomers]);

  // Auto-complete logic for Customers
  useEffect(() => {
    if (!session || !formData.customerName) return;
    
    const foundCustomer = customers.find(c => 
      (c.name || '').toLowerCase() === formData.customerName.toLowerCase()
    );

    if (foundCustomer) {
      setFormData(prev => ({
        ...prev,
        customerEmail: foundCustomer.email || '', // Auto-fill Email
        customerContactNo: foundCustomer.contactNo || '',
        billingAddress: foundCustomer.billingAddress || '',
        deliveryAddress: foundCustomer.deliveryAddress || ''
      }));
    }
  }, [formData.customerName, session, customers]);

  // --- Event Handlers ---

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const result = await loginUser(loginEmail, loginPassword);
      
      if (result.success && result.user) {
        // Map HO branch IDs to standard branch IDs
        const mappedBranchId = BRANCH_ID_MAPPING[result.user.branchId] || result.user.branchId;
        const branch = BRANCHES.find(b => b.id === mappedBranchId);
        
        if (branch) {
          const salesPerson: SalesPerson = {
            id: result.user.id,
            name: `${result.user.firstName} ${result.user.lastName}`,
            contactNo: '', 
            branchId: branch.id
          };
          setSession({ branch, salesPerson });
          setMode(FormMode.NEW_FORM);
          console.log(`✅ Login successful: ${result.user.firstName} from ${branch.name} (${result.user.branchId} → ${mappedBranchId})`);
        } else {
          setAuthError(`Branch ID '${result.user.branchId}' (mapped to '${mappedBranchId}') not found in app configuration.`);
        }
      } else {
        setAuthError(result.message);
      }
    } catch (error: any) {
      setAuthError("Critical Error: " + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (regPassword !== regConfirmPassword) {
      setAuthError("Passwords do not match!");
      return;
    }

    if (!regBranchId) {
      setAuthError("Please select a branch.");
      return;
    }
    
    setAuthLoading(true);

    try {
      const newUserObj = {
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        password: regPassword,
        branchId: regBranchId
      };

      const result = await registerUser(newUserObj);

      if (result.success && result.user) {
        // Auto Login
        const branch = BRANCHES.find(b => b.id === result.user!.branchId);
        if (branch) {
           const salesPerson: SalesPerson = {
              id: result.user.id,
              name: `${result.user.firstName} ${result.user.lastName}`,
              contactNo: '', 
              branchId: branch.id
            };
            setSession({ branch, salesPerson });
            setMode(FormMode.NEW_FORM);
            // Clear registration form
            setRegFirstName('');
            setRegLastName('');
            setRegEmail('');
            setRegPassword('');
            setRegConfirmPassword('');
            setRegBranchId('');
        } else {
           setAuthError(`Registered successfully! Branch ID '${result.user.branchId}' not found in app config. Please contact admin.`);
           setAuthMode('LOGIN');
        }
      } else {
        setAuthError(result.message);
      }
    } catch (error: any) {
      setAuthError("Registration Exception: " + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout? Unsaved data will be lost.")) {
      setSession(null);
      setItems([]);
      setFormData(INITIAL_FORM_DATA);
      setLoginEmail('');
      setLoginPassword('');
      setCustomers([]);
    }
  };

  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Filter items by category first
    let categoryFiltered = dbItems;
    if (currentItem.category && currentItem.category.trim()) {
      categoryFiltered = dbItems.filter(item => 
        item.category && item.category.toLowerCase() === currentItem.category.toLowerCase()
      );
    }
    
    console.log(`🔍 Item search: "${val}" | Category: "${currentItem.category}" | Items in category: ${categoryFiltered.length} / Total: ${dbItems.length}`);
    
    // Search for exact match first, then partial match
    let foundItem = categoryFiltered.find(i => (i.itemName || '').toLowerCase() === val.toLowerCase());
    
    // If no exact match, try partial match
    if (!foundItem && val.length > 0) {
      foundItem = categoryFiltered.find(i => 
        (i.itemName || '').toLowerCase().includes(val.toLowerCase())
      );
    }
    
    if (foundItem) {
      console.log(`✅ Found item: "${foundItem.itemName}" | Category: "${foundItem.category}" | Width: "${foundItem.defaultWidth}" | Rate: ₹${foundItem.defaultRate}`);
    } else if (val.length > 0) {
      console.log(`❌ No item found for: "${val}"`);
    }
    
    setCurrentItem(prev => ({
      ...prev,
      itemName: val,
      category: foundItem ? foundItem.category : prev.category,
      rate: foundItem?.defaultRate ? foundItem.defaultRate : prev.rate,
      width: foundItem?.defaultWidth ? foundItem.defaultWidth : prev.width
    }));
  };

  const handleAddItem = () => {
    if (!currentItem.itemName && !currentItem.manualItemName) {
      alert("Please enter either a Searchable Item Name or Manual Item Name");
      return;
    }
    
    setItems(prev => [...prev, { ...currentItem, id: Date.now().toString() }]);
    setCurrentItem({ 
      ...INITIAL_ITEM, 
      id: Date.now().toString(),
      deliveryDate: currentItem.deliveryDate // Persist date for convenience
    });
    
    if (window.innerWidth < 1024) {
      // Small notification logic could go here
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleEditItem = (item: OrderLineItem) => {
    setCurrentItem(item);
    handleDeleteItem(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If Sales Person changed, reload customers for that person
    if (name === 'salesPerson') {
       handleSalesPersonChange(value);
    }
  };

  const handleCurrentItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleReviewOrder = () => {
    if (!formData.customerName) {
      alert("Please fill in Customer Name");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }
    setShowReviewModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!session) return;
    
    setIsSubmitting(true);
    try {
      // DETERMINE SALES PERSON ID
      const selectedSpUser = allSalesPersons.find(u => {
        const uName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        return uName.toLowerCase() === (formData.salesPerson || '').toLowerCase();
      });
      
      const targetSpId = selectedSpUser ? selectedSpUser.id : session.salesPerson.id;

      // 1. Check if Customer is New -> Save to Supabase
      const existingCustomer = customers.find(c => (c.name || '').toLowerCase() === (formData.customerName || '').toLowerCase());
      if (!existingCustomer) {
        // Create new customer in Database
        const result = await createNewCustomer(formData.salesPerson || session.salesPerson.name, formData);
        if (result.success && result.customerData) {
          setCustomers(prev => [...prev, result.customerData]);
          alert(`New Customer "${result.customerData.name}" added to database!`);
        }
      }

      // 2. Save Order to Supabase
      console.log('💾 Saving order to Supabase...');
      await saveOrderToDb(targetSpId, formData, items);
      console.log('✅ Order saved to Supabase');

      // 3. Submit to Google Sheet
      console.log('📊 Submitting to Google Sheet...');
      const sheetSuccess = await submitOrderToSheet(formData, items);
      console.log('📊 Google Sheet result:', sheetSuccess);
      
      const newOrder: SubmittedOrder = {
        id: Date.now().toString(),
        submissionDate: new Date().toISOString(),
        formData: { ...formData },
        items: [...items]
      };
      
      const updatedHistory = [newOrder, ...historyOrders];
      setHistoryOrders(updatedHistory);
      localStorage.setItem('order_history', JSON.stringify(updatedHistory));

      setShowReviewModal(false);
      
      let msg = `✅ Order Submitted Successfully!\n\n`;
      msg += `Database: Saved ✓\n`;
      if (sheetSuccess) {
         msg += `Google Sheet: Saved ✓\n`;
      } else {
         msg += `Google Sheet: ❌ Failed to save\n`;
         msg += `(Check console F12 for detailed error message)\n`;
      }
      alert(msg);
      
      // Reset form but keep the selected salesperson
      const currentSp = formData.salesPerson;
      const currentSpContact = formData.salesContactNo;
      const currentBranch = formData.branch;

      setFormData({
        ...INITIAL_FORM_DATA,
        branch: currentBranch,
        salesPerson: currentSp,
        salesContactNo: currentSpContact
      });
      setItems([]);
    } catch (error) {
      console.error('❌ Submission error:', error);
      alert("❌ Failed to submit order. Check console (F12) for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartPaste = async () => {
    if (!aiInputText.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await smartParseOrder(aiInputText);
      
      if (result.customerData) {
        setFormData(prev => ({ 
          ...prev, 
          customerName: result.customerData?.customerName || prev.customerName,
          customerContactNo: result.customerData?.customerContactNo || prev.customerContactNo,
          billingAddress: result.customerData?.billingAddress || prev.billingAddress,
        }));
      }
      
      if (result.items && result.items.length > 0) {
        const newItems: OrderLineItem[] = result.items.map(partial => ({
          ...INITIAL_ITEM,
          ...partial as any,
          id: Date.now().toString() + Math.random()
        }));
        setItems(prev => [...prev, ...newItems]);
      }
      setShowAiModal(false);
      setAiInputText("");
    } catch (e) {
      alert("AI Failed to process text");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setIsUploading(false); return;
      }
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) {
        alert("CSV empty or invalid");
        setIsUploading(false); return;
      }

      try {
        if (uploadTab === 'ITEMS') {
          await processItemCSV(lines);
        } else {
          await processCustomerCSV(lines);
        }
      } catch (error: any) {
        alert("Import Error: " + error.message);
      }
      
      setIsUploading(false);
      setUploadFile(null);
    };
    reader.readAsText(uploadFile);
  };

  // --- ITEM CSV PARSER ---
  const processItemCSV = async (lines: string[]) => {
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const headerMap: Record<string, string> = {
        'warp': 'WARP',
        'cku': 'CKU',
        'embroidary': 'EMBROIDARY', 
        'cro': 'CRO',
        'elastic': 'ELASTIC',
        'eye-n-hook': 'EYE-N-HOOK', 
        'cup': 'CUP',
        'tlu': 'TLU',
        'vau': 'VAU',
        'printing': 'PRINTING'
      };

      const itemsToUpload: { category: string, item_name: string, default_width?: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        Object.keys(headerMap).forEach(key => {
          const categoryName = headerMap[key];
          const itemIndex = headers.indexOf(key);
          
          if (itemIndex !== -1 && row[itemIndex]) {
            const itemName = row[itemIndex];
            
            let width = "";
            const widthHeaderHyphen = `width-${key}`;
            const widthHeaderUnderscore = `width_${key}`;
            
            const wIndex1 = headers.indexOf(widthHeaderHyphen);
            const wIndex2 = headers.indexOf(widthHeaderUnderscore);
            
            if (wIndex1 !== -1) width = row[wIndex1];
            else if (wIndex2 !== -1) width = row[wIndex2];

            if (itemName) {
              itemsToUpload.push({
                category: categoryName,
                item_name: itemName,
                default_width: width
              });
            }
          }
        });
      }

      if (itemsToUpload.length > 0) {
        const success = await bulkUpsertItems(itemsToUpload);
        if (success) {
          alert(`Success! ${itemsToUpload.length} items imported.`);
          setShowUploadModal(false);
          loadDbData(); 
        } else {
          alert("Database upload failed.");
        }
      } else {
        alert("No valid items found. Please check column headers (e.g., 'warp', 'width-warp').");
      }
  };

  // --- CUSTOMER CSV PARSER ---
  const processCustomerCSV = async (lines: string[]) => {
    let currentUsers = await fetchAllAppUsers();
    
    const rawHeaders = lines[0].split(',').map(h => h.trim());
    
    const idxSP = rawHeaders.findIndex(h => h.toLowerCase() === 'sales_person_name' || h.toLowerCase() === 'sales person name');
    const idxName = rawHeaders.findIndex(h => h.toLowerCase() === 'customer_name' || h.toLowerCase() === 'customer name');
    const idxBill = rawHeaders.findIndex(h => h.toLowerCase() === 'billing_address' || h.toLowerCase() === 'billing address');
    const idxMob = rawHeaders.findIndex(h => h.toLowerCase() === 'mob_no' || h.toLowerCase() === 'mob_no.' || h.toLowerCase() === 'mob no');
    const idxEmail = rawHeaders.findIndex(h => h.toLowerCase() === 'email_id' || h.toLowerCase() === 'email id');
    // New Branch Header
    const idxBranch = rawHeaders.findIndex(h => h.toLowerCase() === 'branch');

    if (idxSP === -1 || idxName === -1) {
      alert(`CSV Error: Required columns not found.\nLooking for: Sales_Person_Name, Customer_Name\nFound: ${rawHeaders.join(', ')}`);
      return;
    }

    const csvSalesPersons = new Set<string>();
    const rowData: any[] = [];

    // First Pass: Collect valid rows and Sales Persons
    for (let i = 1; i < lines.length; i++) {
       const row = lines[i].split(',').map(c => c.trim());
       if (row.length < 2) continue;
       const spName = row[idxSP];
       if (spName) {
         csvSalesPersons.add(spName);
         rowData.push({ row, spName });
       }
    }

    // DETERMINE TARGET BRANCH FOR NEW USERS
    // 1. If I am logged in, use my branch (mapped to simple branch id).
    // 2. Map HO branches to simple regional branches (ho_mum -> mum, ho_uls -> uls)
    let defaultBranch = 'mum';
    if (session) {
        if (session.branch.id === 'ho_uls' || session.branch.id === 'uls') defaultBranch = 'uls';
        else if (session.branch.id === 'udh') defaultBranch = 'udh';
        else if (session.branch.id === 'ahm') defaultBranch = 'ahm';
        else if (session.branch.id === 'del') defaultBranch = 'del';
        // 'mum' or 'ho_mum' stays 'mum'
    }

    let newUsersCreated = 0;
    for (const spName of Array.from(csvSalesPersons)) {
       const cleanSpName = spName.toLowerCase().replace(/[^a-z0-9]/g, '');
       
       const exists = currentUsers.find(u => {
          const uName = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
          return uName.includes(cleanSpName) || cleanSpName.includes(uName);
       });

       if (!exists) {
         // Create Ghost User
         // We simply use the defaultBranch logic determined above
         const newUser = await createGhostUser(spName, defaultBranch);
         if (newUser) {
           newUsersCreated++;
         }
       }
    }

    if (newUsersCreated > 0) {
      currentUsers = await fetchAllAppUsers();
      setAllSalesPersons(currentUsers); 
    }

    const customersToUpload: any[] = [];
    
    rowData.forEach(({ row, spName }) => {
       const custName = row[idxName];
       if (!custName) return;

       const user = currentUsers.find(u => {
         const uName = `${u.firstName} ${u.lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
         const csvName = spName.toLowerCase().replace(/[^a-z0-9]/g, '');
         return uName.includes(csvName) || csvName.includes(uName);
       });

       if (user) {
         customersToUpload.push({
           sales_person_id: user.id,
           name: custName,
           email: idxEmail !== -1 ? row[idxEmail] : '',
           contact_no: idxMob !== -1 ? row[idxMob] : '',
           billing_address: idxBill !== -1 ? row[idxBill] : '',
           delivery_address: '', 
           branch: idxBranch !== -1 ? row[idxBranch] : '' // Capture Branch from CSV
         });
       }
    });

    if (customersToUpload.length > 0) {
      const success = await bulkUpsertCustomers(customersToUpload);
      let msg = `Success! ${customersToUpload.length} customers imported.`;
      if (newUsersCreated > 0) {
        msg += `\nAlso created ${newUsersCreated} new Sales Person accounts (under branch: ${defaultBranch}).`;
      }
      if (success) {
        alert(msg);
        setShowUploadModal(false);
        loadDbData();
      } else {
        alert("Customer upload failed. Please check Supabase permissions.");
      }
    } else {
      alert(`No valid customers matched to users. Checked ${lines.length-1} rows.`);
    }
  };

  const handleSaveSettings = () => {
    if (!googleScriptUrl.startsWith("https://script.google.com/macros/s/")) {
      alert("Invalid URL! \nThe Web App URL must start with:\nhttps://script.google.com/macros/s/ \n\nPlease check your deployment steps and copy the correct 'Web App' URL.");
      return;
    }

    localStorage.setItem('google_script_url', googleScriptUrl);
    setShowSettingsModal(false);
    alert('Settings Saved!');
  };

  const debugItemsByCategory = () => {
    console.log('\n\n=== 📊 FULL ITEM INVENTORY BY CATEGORY ===\n');
    const UNIT_CATEGORIES_LOCAL = [
      'WARP', 'CKU', 'EMBROIDARY', 'CRO', 'ELASTIC', 'EYE-N-HOOK', 'CUP', 'TLU', 'VAU', 'PRINTING'
    ];
    
    UNIT_CATEGORIES_LOCAL.forEach(cat => {
      const itemsInCat = dbItems.filter(i => i.category === cat);
      console.log(`\n${cat}: ${itemsInCat.length} items`);
      if (itemsInCat.length > 0) {
        itemsInCat.slice(0, 20).forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.itemName} (Width: ${item.defaultWidth || 'N/A'}, Rate: ₹${item.defaultRate})`);
        });
        if (itemsInCat.length > 20) {
          console.log(`  ... and ${itemsInCat.length - 20} more items`);
        }
      } else {
        console.log(`  ⚠️  NO ITEMS IN THIS CATEGORY`);
      }
    });
    
    console.log(`\n✅ Total items loaded: ${dbItems.length}`);
    console.log('Categories with items:', [...new Set(dbItems.map(i => i.category))]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const GAS_CODE = 'const SHEET_ID = \'1xVSJlNilOKu2zi-R1Jeuv__buGkzbECSWef0MSLr4oM\';\n\nfunction doPost(e) {\n  const lock = LockService.getScriptLock();\n  lock.tryLock(10000);\n\n  try {\n    const data = JSON.parse(e.postData.contents);\n    const branchName = (data.branch || \'Unknown\').trim();\n    const doc = SpreadsheetApp.openById(SHEET_ID);\n\n    // Use branch name as tab name - if doesn\'t exist, create it\n    let sheet = doc.getSheetByName(branchName);\n    if (!sheet) {\n      sheet = doc.insertSheet(branchName);\n      // Add headers automatically\n      sheet.appendRow([\n        \'Timestamp\',\n        \'Customer Name\',\n        \'Order Date\',\n        \'Unit\',\n        \'Item Name\',\n        \'Color\',\n        \'Width\',\n        \'Unit (of item)\',\n        \'Qty\',\n        \'Rate\',\n        \'Discount\',\n        \'Delivery Date\',\n        \'Remark\',\n        \'Customer Number\',\n        \'Billing Address\',\n        \'Delivery Address\',\n        \'Sales Person Name\',\n        \'Sales Person Contact\'\n      ]);\n    }\n\n    // Add one row per item\n    const rows = data.items.map(item => [\n      new Date(), // Timestamp\n      data.customerName,\n      data.orderDate,\n      item.category, // Unit\n      item.itemName || item.manualItemName,\n      item.color,\n      item.width,\n      item.uom, // Unit (of item)\n      item.quantity,\n      item.rate,\n      item.discount,\n      item.deliveryDate,\n      item.remark,\n      data.customerContactNo,\n      data.billingAddress,\n      data.deliveryAddress,\n      data.salesPerson,\n      data.salesContactNo\n    ]);\n\n    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);\n\n    return ContentService.createTextOutput(JSON.stringify({ \'result\': \'success\' })).setMimeType(ContentService.MimeType.JSON);\n  } catch (e) {\n    return ContentService.createTextOutput(JSON.stringify({ \'result\': \'error\', \'error\': e.toString() })).setMimeType(ContentService.MimeType.JSON);\n  } finally {\n    lock.releaseLock();\n  }\n}';

  // OPTIMIZED: Show only top 50 items to prevent lag
  // IMPROVED: Filter items by category AND search text, sorted by relevance
  const filteredItems = (() => {
    let filtered = dbItems;
    
    // Filter by category if selected
    if (currentItem.category && currentItem.category.trim()) {
      filtered = filtered.filter(item => 
        item.category && item.category.toLowerCase() === currentItem.category.toLowerCase()
      );
      
      console.log(`🔍 Category "${currentItem.category}": Found ${filtered.length} items total`);
      
      // If no text typed, show all items in this category (up to 100)
      if (!currentItem.itemName || currentItem.itemName.trim().length === 0) {
        console.log(`   Showing all ${Math.min(filtered.length, 100)} items (no search term)`);
        return filtered.slice(0, 100);
      }
    }
    
    // If user is typing in item search, filter by partial name match
    if (currentItem.itemName && currentItem.itemName.trim().length > 0) {
      const searchTerm = currentItem.itemName.toLowerCase();
      console.log(`🔍 Searching for "${searchTerm}" in category "${currentItem.category}"`);
      
      // Show items that contain the search term (partial match)
      filtered = filtered
        .filter(item => (item.itemName || '').toLowerCase().includes(searchTerm))
        .sort((a, b) => {
          // Prioritize exact match first, then items that start with search term
          const aName = (a.itemName || '').toLowerCase();
          const bName = (b.itemName || '').toLowerCase();
          
          if (aName === searchTerm && bName !== searchTerm) return -1;
          if (aName !== searchTerm && bName === searchTerm) return 1;
          if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
          if (!aName.startsWith(searchTerm) && bName.startsWith(searchTerm)) return 1;
          
          return aName.localeCompare(bName);
        });
      
      console.log(`   Found ${filtered.length} matching items`);
    }
    
    return filtered.slice(0, 100);
  })();

  // Debug: Log filtered items count when category changes
  React.useEffect(() => {
    if (currentItem.category) {
      console.log(`\n📦 CATEGORY SELECTED: "${currentItem.category}"`);
      console.log(`   Total items in category: ${filteredItems.length}`);
      if (filteredItems.length > 0) {
        console.log('   First 10 items:', filteredItems.slice(0, 10).map((i, idx) => `${idx+1}. ${i.itemName} (${i.defaultWidth || 'N/A'})`));
      } else {
        console.log('   ⚠️  NO ITEMS FOUND IN THIS CATEGORY!');
        console.log('   Total items in database:', dbItems.length);
        console.log('   Categories available:', [...new Set(dbItems.map(i => i.category))]);
      }
    }
  }, [currentItem.category, filteredItems.length]);

  const userHistory = historyOrders
    .filter(order => session && order.formData.salesPerson === session.salesPerson.name)
    .flatMap(order => order.items.map(item => ({ ...item, _customer: order.formData.customerName })));

  const visibleSalesPersons = getVisibleSalesPersons();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center">
            <img 
              src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
              alt="GINZA Logo" 
              className="h-20 mx-auto mb-4 object-contain" 
            />
            <h1 className="text-2xl font-bold text-gray-900">Ginza Industries Ltd.</h1>
            <p className="text-gray-500">Order Portal</p>
          </div>
          
          {authError && (
             <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-2 rounded-r">
                <div className="flex">
                   <div className="flex-shrink-0">
                      <X className="h-5 w-5 text-red-500" />
                   </div>
                   <div className="ml-3">
                      <p className="text-sm text-red-700 font-bold">Authentication Failed</p>
                      <p className="text-xs text-red-600 mt-1">{authError}</p>
                   </div>
                </div>
             </div>
          )}

          {authMode === 'LOGIN' ? (
            <form onSubmit={handleSignIn} className="space-y-4 pt-2">
              <div>
                <Input 
                   label="Email ID" 
                   type="email" 
                   placeholder="name@company.com" 
                   required 
                   value={loginEmail}
                   onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div>
                <Input 
                   label="Password" 
                   type="password" 
                   placeholder="••••••••" 
                   required
                   value={loginPassword}
                   onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full py-3 mt-2 font-semibold" disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <User className="w-4 h-4 mr-2" />}
                {authLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              
              <div className="text-center pt-2">
                 <p className="text-sm text-gray-600">
                   Don't have an account?{' '}
                   <button 
                     type="button"
                     onClick={() => { setAuthMode('REGISTER'); setAuthError(null); }}
                     className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                   >
                     Create an account
                   </button>
                 </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="First Name" 
                  required 
                  placeholder="John"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                />
                <Input 
                  label="Last Name" 
                  required 
                  placeholder="Doe"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                />
              </div>
              
              <Input 
                label="Email ID" 
                type="email" 
                required 
                placeholder="name@company.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              
              <Input 
                label="Password" 
                type="password" 
                required 
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              
              <Input 
                label="Confirm Password" 
                type="password" 
                required 
                placeholder="Confirm password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
              />

              <Select 
                 label="Branch" 
                 required
                 value={regBranchId}
                 onChange={(e) => setRegBranchId(e.target.value)}
              >
                  <option value="">-- Select Branch --</option>
                  {BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </Select>

              <Button type="submit" variant="success" className="w-full py-3 mt-2 font-semibold" disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2" />}
                {authLoading ? 'Registering...' : 'Register & Login'}
              </Button>

              <div className="text-center pt-2">
                 <p className="text-sm text-gray-600">
                   Already registered?{' '}
                   <button 
                     type="button"
                     onClick={() => { setAuthMode('LOGIN'); setAuthError(null); }}
                     className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                   >
                     Sign In here
                   </button>
                 </p>
              </div>
            </form>
          )}
          
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            Secure System • Authorized Personnel Only
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20 lg:pb-0 select-none sm:select-text">
      
      {/* DESKTOP HEADER / MOBILE TOP BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
              alt="Ginza Logo" 
              className="h-9 w-auto rounded" 
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight hidden sm:block">Ginza Industries Ltd.</h1>
              <div className="flex items-center text-[10px] sm:text-xs text-gray-500 space-x-2">
                <span className="font-medium text-blue-700 bg-blue-50 px-1.5 rounded flex items-center whitespace-nowrap">
                   <MapPin className="w-3 h-3 mr-1" /> {session.branch.name}
                </span>
                <span className="font-medium text-green-700 bg-green-50 px-1.5 rounded flex items-center whitespace-nowrap">
                   <User className="w-3 h-3 mr-1" /> {session.salesPerson.name}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* PWA INSTALL BUTTON */}
            {deferredPrompt && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
                title="Install App"
              >
                <Download className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Install App</span>
              </Button>
            )}

            {/* DESKTOP NAV ITEMS (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center space-x-2">
              {(session.branch.id === 'ho_mum' || session.branch.id === 'ho_uls') && (
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(true)} title="Database">
                  <HardDrive className="w-4 h-4 mr-1" /> Database
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={async () => {
                  console.log('🌱 Seeding test customers for testing...');
                  const success = await seedTestCustomers(session.branch.id, session.salesPerson.id);
                  if (success) {
                    alert('✅ Test customers added! Now select the same salesman again to see them.');
                    // Reload customers
                    handleSalesPersonChange(session.salesPerson.name, true);
                  } else {
                    alert('❌ Failed to seed data. Check console.');
                  }
                }}
                title="Add Test Customers"
              >
                <Users className="w-4 h-4 mr-1" /> Seed Data
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAiModal(true)} title="AI Import">
                <Wand2 className="w-4 h-4 mr-1" /> AI Import
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettingsModal(true)} title="Settings">
                 <Settings className="w-5 h-5" />
              </Button>
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-50"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 w-full animate-fade-in">
        
        {/* DESKTOP TOGGLE (Hidden on Mobile) */}
        <div className="hidden lg:flex justify-center mb-6">
          <div className="bg-gray-200 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setMode(FormMode.NEW_FORM)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === FormMode.NEW_FORM ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              New Form
            </button>
            <button
              onClick={() => setMode(FormMode.HISTORY_FORM)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === FormMode.HISTORY_FORM ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
            >
              History
            </button>
          </div>
        </div>

        {mode === FormMode.NEW_FORM ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              
              {/* Header Section */}
              <div className="bg-white shadow-md rounded-xl p-4 sm:p-5 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-500"/> Customer Details
                </h3>
                
                <div className="space-y-3">
                  <Select
                    label="Branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleFormChange}
                  >
                    <option value="">-- Select Branch --</option>
                    {BRANCHES.map(branch => (
                      <option key={branch.id} value={branch.name}>{branch.name}</option>
                    ))}
                  </Select>

                  <div className="flex items-end gap-2">
                    <div className="flex-grow">
                      <Select
                        label="Sales Person"
                        name="salesPerson"
                        value={formData.salesPerson}
                        onChange={(e) => {
                          handleFormChange(e);
                          // Load customer data when sales person changes
                          setTimeout(() => {
                            handleSalesPersonChange(e.target.value);
                          }, 0);
                        }}
                      >
                         <option value="">-- Select Sales Person --</option>
                         {/* Show logged-in user first if applicable */}
                         {session && (
                           <option key={session.salesPerson.id} value={session.salesPerson.name} style={{fontWeight: 'bold'}}>
                             ★ {session.salesPerson.name} (You)
                           </option>
                         )}
                         {/* Show all other visible sales persons */}
                         {visibleSalesPersons
                           .filter(sp => {
                             // Get the full name depending on type
                             const spName = 'firstName' in sp ? `${sp.firstName} ${sp.lastName}` : sp.name;
                             return !session || spName !== session.salesPerson.name;
                           })
                           .map(sp => {
                             // Handle both SalesPerson and RegisteredUser types
                             const fullName = 'firstName' in sp ? `${sp.firstName} ${sp.lastName}` : sp.name;
                             return <option key={sp.id} value={fullName}>{fullName}</option>
                           })
                         }
                      </Select>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => refreshSalesPersonsList()} 
                      className="mb-0.5" 
                      title="Refresh User List"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="flex items-end gap-2">
                      <div className="flex-grow">
                        <Input
                          label="Customer Name"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleFormChange}
                          list="customers-list"
                          autoComplete="off"
                          placeholder="Type to search or enter manually..."
                        />
                        <datalist id="customers-list">
                          {filteredCustomers.map((c, i) => (
                            <option key={`${c.id}-${i}`} value={c.name}>
                               {c.name} {c.branch ? `(${c.branch})` : ''}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      {formData.customerName && !filteredCustomers.find(c => c.name.toLowerCase() === formData.customerName.toLowerCase()) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            // Create new customer in Supabase
                            const newCustomer: Customer = {
                              id: 'temp_' + Date.now(),
                              name: formData.customerName,
                              email: formData.customerEmail || '',
                              contactNo: formData.customerContactNo || '',
                              billingAddress: formData.billingAddress || '',
                              deliveryAddress: formData.deliveryAddress || '',
                              salesPersonId: formData.salesPerson || session?.salesPerson.name || '',
                              branch: formData.branch || session?.branch.name || ''
                            };

                            try {
                              // Get the selected salesperson name from form
                              const selectedSalesPersonName = formData.salesPerson || session?.salesPerson.name;
                              
                              // Save to Supabase
                              const result = await createNewCustomer(selectedSalesPersonName, formData);
                              
                              if (result.success) {
                                // Add to local list so it appears immediately
                                setManuallyAddedCustomers([newCustomer, ...manuallyAddedCustomers]);
                                alert(`✅ "${formData.customerName}" saved to Supabase!`);
                              } else {
                                alert(`❌ Error: ${result.message}`);
                              }
                            } catch (error: any) {
                              console.error('Error adding customer:', error);
                              alert(`❌ Error: ${error.message}`);
                            }
                          }}
                          className="mb-0.5"
                          title="Add this customer to database"
                        >
                          ➕ Add
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {filteredCustomers.length > 0 ? `${filteredCustomers.length} matching customer(s)` : 'Type customer name to search or add new'}
                    </p>
                  </div>

                  <Input
                    label="Email ID"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleFormChange}
                    placeholder="customer@email.com"
                  />

                  <Input
                    label="Contact No"
                    name="customerContactNo"
                    value={formData.customerContactNo}
                    onChange={handleFormChange}
                    placeholder="+91..."
                  />

                    <Input
                      label="Billing Address"
                      name="billingAddress"
                      value={formData.billingAddress}
                      onChange={handleFormChange}
                    />
                  
                    <Input
                      label="Delivery Address"
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleFormChange}
                    />

                    <Input
                      label="Order Date"
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleFormChange}
                    />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              
              {/* Item Entry Section */}
              <div className="bg-white shadow-md rounded-xl p-4 sm:p-5 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-green-500"/> Item Details
                </h3>

                <div className="space-y-3">
                  <Select
                    label="Category"
                    name="category"
                    value={currentItem.category}
                    onChange={handleCurrentItemChange}
                  >
                    <option value="">All Categories</option>
                    {UNIT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </Select>

                  <div className="relative">
                    <Input
                      label="Search Item"
                      value={currentItem.itemName}
                      onChange={handleItemNameChange}
                      list="items-list"
                      placeholder="Type item name to search by category..."
                      disabled={!!currentItem.manualItemName}
                    />
                    <datalist id="items-list">
                      {filteredItems.map(item => (
                        <option key={item.id} value={item.itemName}>
                          {item.itemName} (₹{item.defaultRate})
                        </option>
                      ))}
                    </datalist>
                    {(currentItem.itemName) && (
                     <button 
                        onClick={() => setCurrentItem(prev => ({ ...prev, itemName: '' }))}
                        className="absolute right-2 top-8 text-gray-400 hover:text-red-500"
                     >
                        <X className="w-4 h-4" />
                     </button>
                    )}
                    <p className="text-xs text-gray-500 mt-1">💡 Select category first, then search items from that unit</p>
                  </div>

                  <div className="relative">
                    <Input
                      label="Manual Item Name"
                      name="manualItemName"
                      value={currentItem.manualItemName}
                      onChange={handleCurrentItemChange}
                      placeholder="If not in list..."
                      disabled={!!currentItem.itemName}
                    />
                    {(currentItem.manualItemName) && (
                     <button 
                        onClick={() => setCurrentItem(prev => ({ ...prev, manualItemName: '' }))}
                        className="absolute right-2 top-8 text-gray-400 hover:text-red-500"
                     >
                        <X className="w-4 h-4" />
                     </button>
                    )}
                  </div>

                  <Input
                    label="Color"
                    name="color"
                    value={currentItem.color}
                    onChange={handleCurrentItemChange}
                  />

                  <Input
                    label="Width"
                    name="width"
                    value={currentItem.width}
                    onChange={handleCurrentItemChange}
                  />

                  <Select
                    label="UOM"
                    name="uom"
                    value={currentItem.uom}
                    onChange={handleCurrentItemChange}
                  >
                    <option value="">-- Unit --</option>
                    {MEASUREMENT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </Select>

                  <Input
                    label="Quantity"
                    type="number"
                    name="quantity"
                    value={currentItem.quantity}
                    onChange={handleCurrentItemChange}
                  />

                  <Input
                    label="Rate"
                    type="number"
                    name="rate"
                    value={currentItem.rate}
                    onChange={handleCurrentItemChange}
                  />

                  <Input
                    label="Discount (%)"
                    type="number"
                    name="discount"
                    value={currentItem.discount}
                    onChange={handleCurrentItemChange}
                  />

                  <Input
                    label="Delivery Date"
                    type="date"
                    name="deliveryDate"
                    value={currentItem.deliveryDate}
                    onChange={handleCurrentItemChange}
                  />

                  <Input
                    label="Remark"
                    name="remark"
                    value={currentItem.remark}
                    onChange={handleCurrentItemChange}
                  />

                  <Button onClick={handleAddItem} className="w-full mt-3" variant="secondary">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div className="bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="font-medium">{item.itemName || item.manualItemName}</div>
                              <div className="text-xs text-gray-500">{item.category} • {item.width}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.quantity} {item.uom}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              ₹{item.rate}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              ₹{((parseFloat(item.quantity) || 0) * (item.rate || 0)).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">
                               <div className="flex justify-end space-x-2">
                                  <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-900">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-900">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit Button (Desktop) */}
              <Button 
                className="w-full shadow-lg text-lg py-3 bg-green-600 hover:bg-green-700" 
                onClick={handleReviewOrder}
                disabled={items.length === 0}
              >
                <Check className="w-5 h-5 mr-2" />
                Submit & Review ({items.length})
              </Button>
            </div>
          </div>
        ) : (
          /* History View */
          <div className="space-y-6">
             <div className="bg-white shadow rounded-lg p-4">
                 <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <History className="w-5 h-5 mr-2" /> Recent Orders
                 </h2>
                 {historyOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No recent orders found.</p>
                 ) : (
                    <div className="space-y-4">
                       {historyOrders.map(order => (
                          <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-start mb-2">
                                <div>
                                   <p className="font-bold text-blue-600">{order.formData.customerName}</p>
                                   <p className="text-xs text-gray-500">{format(new Date(order.submissionDate), 'dd MMM yyyy, hh:mm a')}</p>
                                </div>
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                   {order.items.length} items
                                </span>
                             </div>
                             <div className="space-y-1">
                                {order.items.map((item, idx) => (
                                   <div key={idx} className="text-sm flex justify-between text-gray-600 border-b border-dashed border-gray-100 last:border-0 py-1">
                                      <span>{item.itemName || item.manualItemName}</span>
                                      <span>{item.quantity} {item.uom}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
             </div>
          </div>
        )}
      </main>

      {/* Review & Submit Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in pb-20 sm:pb-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Submit & Review Order</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-grow space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm">
                 <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-bold text-gray-900">{formData.customerName}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Sales Person:</span>
                    <span className="font-medium text-gray-900">{formData.salesPerson}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium text-gray-900">{formData.orderDate}</span>
                 </div>
                 {formData.customerEmail && (
                   <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium text-gray-900 text-xs">{formData.customerEmail}</span>
                   </div>
                 )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.itemName || item.manualItemName}</div>
                          <div className="text-xs text-gray-500">{item.width}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{((parseFloat(item.quantity) || 0) * (item.rate || 0)).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex space-x-3">
              <Button variant="secondary" onClick={() => setShowReviewModal(false)} className="flex-1">
                 Edit
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmSubmit} 
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2" />}
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Database Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">Database Management</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b">
               <button 
                  className={`flex-1 py-3 text-sm font-medium ${uploadTab === 'ITEMS' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setUploadTab('ITEMS')}
               >
                 Unit Items
               </button>
               <button 
                  className={`flex-1 py-3 text-sm font-medium ${uploadTab === 'CUSTOMERS' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setUploadTab('CUSTOMERS')}
               >
                 Customers
               </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors">
                <div className="text-center">
                  <FileSpreadsheet className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload <strong>{uploadTab === 'ITEMS' ? 'Unit Wise' : 'Sales Person Wise'}</strong> CSV
                  </p>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Help Text for CSV Format */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 space-y-1">
                 <div className="flex items-center font-bold mb-1">
                    <HelpCircle className="w-3 h-3 mr-1" /> Expected Headers:
                 </div>
                 {uploadTab === 'ITEMS' ? (
                   <p className="font-mono">warp, width-warp, cku, width-cku, embroidary, cro, elastic, eye-n-hook, cup, tlu, vau, printing</p>
                 ) : (
                   <p className="font-mono">Sales_Person_Name, Customer_Name, Billing_Address, Mob_No, Email_ID, Branch</p>
                 )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                <Button 
                   onClick={handleUpload} 
                   disabled={!uploadFile || isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                  Upload & Process
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-purple-600" /> Smart Import
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-2">
                Paste an order text (e.g. from WhatsApp) and AI will extract the details.
              </p>
              <textarea
                className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="Ex: Need 50kg Polyester Warp, 200mtr Floral Lace for Aarav Textiles..."
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSmartPaste} disabled={isAiLoading || !aiInputText.trim()}>
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  Process Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
             <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center">
                <Settings className="w-5 h-5 mr-2" /> App Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               
               <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Google Apps Script Web App URL</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="https://script.google.com/macros/s/..."
                      value={googleScriptUrl}
                      onChange={(e) => setGoogleScriptUrl(e.target.value)}
                    />
                    <Button onClick={handleSaveSettings}>Save</Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Required to save data to Google Sheets. URL must end in <code>/exec</code>.
                  </p>
               </div>

               <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Google Sheet Integration Guide</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                     <li>Open your Google Sheet.</li>
                     <li>Go to <strong>Extensions</strong> {'>'} <strong>Apps Script</strong>.</li>
                     <li>Copy the code below and paste it into the editor (replace everything).</li>
                     <li>Click <strong>Deploy</strong> {'>'} <strong>New deployment</strong>.</li>
                     <li>Select type: <strong>Web app</strong>.</li>
                     <li>Set <i>Who has access</i> to: <strong>Anyone</strong> (Important!).</li>
                     <li>Click <strong>Deploy</strong>, copy the URL, and paste it above.</li>
                  </ol>

                  <div className="mt-3 relative">
                     <div className="absolute top-2 right-2">
                        <Button size="sm" variant="secondary" onClick={() => copyToClipboard(GAS_CODE)}>
                           {isCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                           {isCopied ? 'Copied' : 'Copy Code'}
                        </Button>
                     </div>
                     <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap h-40 custom-scrollbar">
                        {GAS_CODE}
                     </pre>
                  </div>
               </div>

               <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">🐛 Debug Tools</h4>
                  <Button 
                    onClick={debugItemsByCategory} 
                    variant="secondary"
                    className="w-full"
                  >
                    View All Items by Category (Check Console)
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">Click to see all items in database. Press F12 to open Developer Console and check the output.</p>
               </div>

            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden flex justify-around items-center h-16 pb-safe z-40">
        <button 
          onClick={() => setMode(FormMode.NEW_FORM)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === FormMode.NEW_FORM ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">New Order</span>
        </button>
        <button 
          onClick={() => setMode(FormMode.HISTORY_FORM)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === FormMode.HISTORY_FORM ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">History</span>
        </button>
        {(session.branch.id === 'ho_mum' || session.branch.id === 'ho_uls') && (
           <button 
              onClick={() => setShowUploadModal(true)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-blue-600"
            >
              <HardDrive className="w-6 h-6" />
              <span className="text-[10px] font-medium">Database</span>
            </button>
        )}
        <button 
          onClick={() => setShowSettingsModal(true)}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-blue-600"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>

      {/* Sticky Bottom Bar for Submit (Mobile Only) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 shadow-lg z-30 pb-safe">
          <Button className="w-full shadow-lg text-lg py-3" onClick={handleReviewOrder}>
             Submit & Review ({items.length})
          </Button>
      </div>
      
    </div>
  );
}

export default App;
