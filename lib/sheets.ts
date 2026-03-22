const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwnkkZYMGW9EIhS9RF7BnqhtLpS_LESIBP400cB_mWu55KR2wIuiNtJEU5K0EC1_tJCFQ/exec";

export async function getSheetData(sheetName: string): Promise<any[]> {
  console.log(`[getSheetData] Fetching sheet: ${sheetName} from URL: ${SCRIPT_URL}`);
  
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "GET_DATA", sheet: sheetName }),
      cache: "no-store",
    });
    
    const text = await res.text();
    console.log(`[getSheetData] Raw Response (${res.status}):`, text.substring(0, 500));
    
    if (!res.ok) throw new Error(`HTTP Error: ${res.status} - ${text.substring(0, 100)}`);
    
    const json = JSON.parse(text);
    if (!json.success) throw new Error(json.error || "Failed to fetch data");
    
    return json.data || [];
  } catch (error: any) {
    console.error(`[getSheetData] Exception for ${sheetName}:`, error.message);
    throw error;
  }
}

export async function appendRow(sheetName: string, record: any): Promise<void> {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "APPEND_ROW", sheet: sheetName, record }),
    cache: "no-store"
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to append row");
}

export async function findById(sheetName: string, id: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "GET_BY_ID", sheet: sheetName, id }),
    cache: "no-store"
  });
  const json = await res.json();
  if (!json.success) return null; // Or throw depending on preference. Returning null fits findById
  return json.data;
}

export async function updateRow(sheetName: string, id: string, record: any): Promise<void> {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "UPDATE_ROW", sheet: sheetName, id, record }),
    cache: "no-store"
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to update row");
}

export async function deleteRow(sheetName: string, id: string): Promise<void> {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "DELETE_ROW", sheet: sheetName, id }),
    cache: "no-store"
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to delete row");
}
