import prisma from "@/lib/prisma";

export interface SystemSettingsMap {
  DEFAULT_GST_RATE: number;
  COMPANY_NAME: string;
  COMPANY_LEGAL_NAME: string;
  COMPANY_TAGLINE: string;
  COMPANY_ADDRESS: string;
  COMPANY_PHONE: string;
  COMPANY_EMAIL: string;
  COMPANY_GSTIN: string;
  COMPANY_PAN: string;
  COMPANY_WEBSITE: string;
  BANK_NAME: string;
  BANK_ACCOUNT_NAME: string;
  BANK_ACCOUNT_NO: string;
  BANK_IFSC: string;
  BANK_BRANCH: string;
  UPI_ID: string;
  QUOTATION_VALIDITY_DAYS: number;
  DEFAULT_QUOTATION_TERMS: string;
  DEFAULT_INVOICE_TERMS: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsMap = {
  DEFAULT_GST_RATE: 18,
  COMPANY_NAME: "Tamizh Tech Robotics Company",
  COMPANY_LEGAL_NAME: "Tamizh Tech Robotics Company",
  COMPANY_TAGLINE: "Robotics & Industrial Automation",
  COMPANY_ADDRESS: "Sri Vari Garden, 22, 3rd Cross, Kurumbapalayam, SSKulam, Sarcarsamakulam, Coimbatore, Tamil Nadu - 641107, India",
  COMPANY_PHONE: "+91 81480 45030",
  COMPANY_EMAIL: "contact@tamizhtech.in",
  COMPANY_GSTIN: "",
  COMPANY_PAN: "",
  COMPANY_WEBSITE: "https://www.tamizhtech.in/",
  BANK_NAME: "HDFC Bank",
  BANK_ACCOUNT_NAME: "Tamizh Tech Robotics Company",
  BANK_ACCOUNT_NO: "50200012345678",
  BANK_IFSC: "HDFC0001234",
  BANK_BRANCH: "Coimbatore",
  UPI_ID: "ta9387643@okicici",
  QUOTATION_VALIDITY_DAYS: 30,
  DEFAULT_QUOTATION_TERMS:
    "1. All prices are inclusive of GST / taxes as applicable.\n2. Work will resume after 100% Advance Payment or approved Purchase Order.\n3. In the case of a Purchase Order, payment is due as per agreed terms.\n4. HSN/Tax rates are subject to government statutory amendments.\n5. Standard delivery time for in-stock items is approximately 3-5 working days.\n6. Customized robotics/automation orders require 15-20 working days.\n7. Goods once sold are subject to standard manufacturer warranty policies.",
  DEFAULT_INVOICE_TERMS:
    "1. Payment is due upon receipt of invoice unless credit terms are explicitly agreed.\n2. Please mention Invoice Number in bank transfer or UPI payment remarks.\n3. Goods once sold are subject to standard warranty and inspection policies.\n4. Disputes, if any, shall be subject to Coimbatore jurisdiction.",
};

/**
 * Retrieves all system settings merged with database overrides.
 */
export async function getSystemSettings(): Promise<SystemSettingsMap> {
  try {
    const dbSettings = await prisma.systemSetting.findMany();
    const result: any = { ...DEFAULT_SYSTEM_SETTINGS };

    for (const item of dbSettings) {
      if (item.key in result) {
        if (typeof DEFAULT_SYSTEM_SETTINGS[item.key as keyof SystemSettingsMap] === "number") {
          result[item.key] = parseFloat(item.value) || 0;
        } else {
          result[item.key] = item.value;
        }
      }
    }

    return result as SystemSettingsMap;
  } catch (err) {
    console.error("Failed to load system settings from database, using defaults:", err);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

/**
 * Retrieves a single setting by key.
 */
export async function getSystemSetting<K extends keyof SystemSettingsMap>(key: K): Promise<SystemSettingsMap[K]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return DEFAULT_SYSTEM_SETTINGS[key];
    }

    if (typeof DEFAULT_SYSTEM_SETTINGS[key] === "number") {
      return (parseFloat(setting.value) || 0) as SystemSettingsMap[K];
    }

    return setting.value as SystemSettingsMap[K];
  } catch (err) {
    console.error(`Failed to load system setting ${key}, using default:`, err);
    return DEFAULT_SYSTEM_SETTINGS[key];
  }
}

/**
 * Updates or creates system settings in the database.
 */
export async function updateSystemSettings(updates: Partial<Record<keyof SystemSettingsMap, string | number>>) {
  const promises = Object.entries(updates).map(([key, value]) => {
    const stringValue = String(value);
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue, category: "GENERAL" },
    });
  });

  return await Promise.all(promises);
}
