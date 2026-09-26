/**
 * Client-safe date and time formatting utilities for business documents.
 */
export function formatDocumentDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatted} IST`;
}

export function formatDocumentDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export const STATE_NAME_BY_CODE: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export const STATE_CODE_MAP: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "daman and diu": "25",
  "dadra and nagar haveli": "26",
  "maharashtra": "27",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "andhra pradesh": "37",
  "ladakh": "38",
};

export function resolvePlaceOfSupply(clientGstin?: string | null, clientState?: string | null): { stateName: string; stateCode: string; label: string } {
  if (clientGstin && clientGstin.trim().length >= 2) {
    const code = clientGstin.trim().substring(0, 2);
    const name = STATE_NAME_BY_CODE[code] || clientState || "Tamil Nadu";
    return {
      stateName: name,
      stateCode: code,
      label: `${name} (${code})`,
    };
  }

  if (clientState && clientState.trim()) {
    const normalized = clientState.trim().toLowerCase();
    const code = STATE_CODE_MAP[normalized];
    if (code) {
      const name = STATE_NAME_BY_CODE[code] || clientState.trim();
      return {
        stateName: name,
        stateCode: code,
        label: `${name} (${code})`,
      };
    }
    return {
      stateName: clientState.trim(),
      stateCode: "33",
      label: `${clientState.trim()} (33)`,
    };
  }

  return {
    stateName: "Tamil Nadu",
    stateCode: "33",
    label: "Tamil Nadu (33)",
  };
}

