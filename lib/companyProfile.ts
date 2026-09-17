export interface CompanySettings {
  companyName: string;
  tagline: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gstin?: string;
  logoUrl: string;
  invoicePrefix: string;
  quotationPrefix: string;
  currency: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Tamizh Tech Robotics Company",
  tagline: "Robotics & Industrial Automation",
  addressLine1: "Sri Vari Garden, 22, 3rd Cross, Kurumbapalayam",
  addressLine2: "SSKulam, Sarcarsamakulam",
  city: "Coimbatore",
  state: "Tamil Nadu",
  pincode: "641107",
  country: "India",
  phone: "+91 81480 45030",
  email: "contact@tamizhtech.in",
  website: "https://www.tamizhtech.in/",
  gstin: "",
  logoUrl: "/assets/ttrc-logo.png",
  invoicePrefix: "TT-INV",
  quotationPrefix: "TT-QUO",
  currency: "INR",
};
