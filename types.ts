
export interface Branch {
  id: string;
  name: string;
  sheetId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string; 
  contactNo: string;
  billingAddress: string;
  deliveryAddress: string;
  salesPersonId: string; 
  branch?: string; // Added Branch
}

export interface Item {
  id: string;
  category: string; 
  itemName: string;
  defaultRate?: number;
  defaultWidth?: string; 
}

export interface SalesPerson {
  id: string;
  name: string;
  contactNo: string;
  branchId: string; 
}

export interface RegisteredUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; 
  branchId: string;
}

export interface OrderLineItem {
  id: string;
  category: string; 
  itemName: string; 
  manualItemName: string; 
  color: string;
  width: string;
  uom: string; 
  quantity: string; 
  rate: number;
  discount: number;
  deliveryDate: string;
  remark: string;
}

export interface OrderFormData {
  branch: string;
  salesPerson: string;
  salesContactNo: string;
  customerName: string;
  customerEmail: string; 
  customerContactNo: string;
  billingAddress: string;
  deliveryAddress: string;
  orderDate: string;
}

export interface SubmittedOrder {
  id: string;
  submissionDate: string; 
  formData: OrderFormData;
  items: OrderLineItem[];
}

export enum FormMode {
  NEW_FORM = 'NEW_FORM',
  HISTORY_FORM = 'HISTORY_FORM'
}