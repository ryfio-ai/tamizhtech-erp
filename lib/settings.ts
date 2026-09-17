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
  COMPANY_NAME: "TAMIZHTECH",
  COMPANY_LEGAL_NAME: "TAMIZHTECH ROBOTICS & AUTOMATION PRIVATE LIMITED",
  COMPANY_TAGLINE: "Next-Gen Robotics & Embedded Solutions",
  COMPANY_ADDRESS: "No. 45, Technology Corridor, Anna Nagar, Chennai, Tamil Nadu - 600040",
  COMPANY_PHONE: "+91 94440 12345",
  COMPANY_EMAIL: "contact@tamizhtech.com",
  COMPANY_GSTIN: "33AAAAA0000A1Z5",
  COMPANY_PAN: "AAAAA0000A",
  COMPANY_WEBSITE: "https://tamizhtech.com",
  BANK_NAME: "HDFC Bank",
  BANK_ACCOUNT_NAME: "TAMIZHTECH ROBOTICS & AUTOMATION PVT LTD",
  BANK_ACCOUNT_NO: "50200012345678",
  BANK_IFSC: "HDFC0001234",
  BANK_BRANCH: "Anna Nagar West, Chennai",
  UPI_ID: "tamizhtech@hdfcbank",
  QUOTATION_VALIDITY_DAYS: 30,
  DEFAULT_QUOTATION_TERMS:
    "1. Quotation valid for 30 days from date of issue.\n2. 50% advance along with confirmed purchase order.\n3. Balance payment upon delivery/completion.\n4. Delivery timeline: 2-3 weeks from receipt of advance.\n5. Standard 1-year manufacturer warranty on physical parts.",
  DEFAULT_INVOICE_TERMS:
    "1. Payment due upon receipt of invoice unless credit terms agreed.\n2. Please mention Invoice Number in bank transfer/UPI remarks.\n3. Goods once sold will not be taken back without prior authorization.",
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
