import prisma from "@/lib/prisma";
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/companyProfile";

export * from "@/lib/companyProfile";

/**
 * Server-side service to retrieve centralized company settings from the database (SystemSetting),
 * falling back gracefully to the authoritative company defaults.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "COMPANY_PROFILE" },
    });

    if (setting && setting.value) {
      const parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.warn("[CompanySettings] Using default company profile:", error);
  }

  return DEFAULT_COMPANY_SETTINGS;
}
