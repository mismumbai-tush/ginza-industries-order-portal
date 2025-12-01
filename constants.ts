import { Branch, Customer, Item, SalesPerson } from './types';

export const BRANCHES: Branch[] = [
  { id: 'bangalore', name: 'Banglore' },
  { id: 'tirupur', name: 'Tirupur' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'ahmedabad', name: 'Ahmedabad' },
  { id: 'ludhiana', name: 'Ludhiana' },
  { id: 'surat', name: 'Surat' },
  { id: 'ulhasnagar', name: 'Ulhasnagar' },
  { id: 'mumbai', name: 'Mumbai' },
];

// Map HO (Head Office) branch IDs to standard branch IDs
export const BRANCH_ID_MAPPING: { [key: string]: string } = {
  'ho_mum': 'mumbai',
  'ho_uls': 'ulhasnagar',
  'ho_bnglr': 'bangalore',
  'ho_delhi': 'delhi',
  'ho_tnp': 'tirupur',
  'ho_ahl': 'ahmedabad',
  'ho_lud': 'ludhiana',
  'ho_srt': 'surat'
};

export const MOCK_ITEMS: Item[] = [
  { id: '1', category: 'WARP', itemName: 'Polyester Warp 50D', defaultRate: 120, defaultWidth: '44' },
  { id: '2', category: 'ELASTIC', itemName: 'Knitted Elastic 1 inch', defaultRate: 5, defaultWidth: '1 inch' },
  { id: '3', category: 'EMBROIDARY', itemName: 'Floral Lace 505', defaultRate: 45, defaultWidth: '5 inch' }
];

// Updated to match your specific CSV columns and Business logic
export const UNIT_CATEGORIES = [
  'WARP', 
  'CKU', 
  'EMBROIDARY', 
  'CRO', 
  'ELASTIC', 
  'EYE-N-HOOK', 
  'CUP', 
  'TLU', 
  'VAU', 
  'PRINTING'
];

export const MEASUREMENT_UNITS = [
  'Kg', 
  'Mtr', 
  'Pkt', 
  'Yard', 
  'Pcs', 
  'Roll', 
  'Inch'
];

export const SALES_PERSONS: SalesPerson[] = [
  // Banglore
  { id: 'sp_bangalore_1', name: 'Balsubramanium', contactNo: '', branchId: 'bangalore' },
  { id: 'sp_bangalore_2', name: 'Mukesh', contactNo: '', branchId: 'bangalore' },
  { id: 'sp_bangalore_3', name: 'Murali', contactNo: '', branchId: 'bangalore' },
  
  // Tirupur
  { id: 'sp_tirupur_1', name: 'Ravi', contactNo: '', branchId: 'tirupur' },
  { id: 'sp_tirupur_2', name: 'Alexander', contactNo: '', branchId: 'tirupur' },
  { id: 'sp_tirupur_3', name: 'R Subramaniam', contactNo: '', branchId: 'tirupur' },
  
  // Delhi
  { id: 'sp_delhi_1', name: 'Anish', contactNo: '', branchId: 'delhi' },
  { id: 'sp_delhi_2', name: 'Lalit', contactNo: '', branchId: 'delhi' },
  { id: 'sp_delhi_3', name: 'Mukesh', contactNo: '', branchId: 'delhi' },
  { id: 'sp_delhi_4', name: 'Rahul', contactNo: '', branchId: 'delhi' },
  { id: 'sp_delhi_5', name: 'Suresh', contactNo: '', branchId: 'delhi' },
  
  // Ahmedabad
  { id: 'sp_ahmedabad_1', name: 'Ravi Kaushik', contactNo: '', branchId: 'ahmedabad' },
  { id: 'sp_ahmedabad_2', name: 'Manish Shah', contactNo: '', branchId: 'ahmedabad' },
  
  // Ludhiana
  { id: 'sp_ludhiana_1', name: 'Mahesh', contactNo: '', branchId: 'ludhiana' },
  
  // Surat
  { id: 'sp_surat_1', name: 'Anil', contactNo: '', branchId: 'surat' },
  { id: 'sp_surat_2', name: 'Raghuveer', contactNo: '', branchId: 'surat' },
  { id: 'sp_surat_3', name: 'Raj Vanraj', contactNo: '', branchId: 'surat' },
  { id: 'sp_surat_4', name: 'Shailesh', contactNo: '', branchId: 'surat' },
  
  // Ulhasnagar
  { id: 'sp_ulhasnagar_1', name: 'Vijay Sutar', contactNo: '', branchId: 'ulhasnagar' },
  { id: 'sp_ulhasnagar_2', name: 'Shiv Ratan', contactNo: '', branchId: 'ulhasnagar' },
  { id: 'sp_ulhasnagar_3', name: 'Ulhasnagar', contactNo: '', branchId: 'ulhasnagar' },
  
  // Mumbai
  { id: 'sp_mumbai_1', name: 'Amit Korgaonkar', contactNo: '', branchId: 'mumbai' },
  { id: 'sp_mumbai_2', name: 'Kamlesh Sutar', contactNo: '', branchId: 'mumbai' },
  { id: 'sp_mumbai_3', name: 'Pradeep Jadhav', contactNo: '', branchId: 'mumbai' },
  { id: 'sp_mumbai_4', name: 'Rakesh Jain', contactNo: '', branchId: 'mumbai' },
  { id: 'sp_mumbai_5', name: 'Santosh Pachratkar', contactNo: '', branchId: 'mumbai' },
  { id: 'sp_mumbai_6', name: 'Vishal Ambhore', contactNo: '', branchId: 'mumbai' },
];

export const GOOGLE_SCRIPT_URL = ""; // Empty by default, set in App Settings