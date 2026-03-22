const url = "https://script.google.com/macros/s/AKfycbwnkkZYMGW9EIhS9RF7BnqhtLpS_LESIBP400cB_mWu55KR2wIuiNtJEU5K0EC1_tJCFQ/exec";

async function test() {
  console.log("Hitting url:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "GET_DATA", sheet: "Clients" }),
      redirect: "follow"
    });
    
    console.log("Status:", res.status);
    console.log("Redirected:", res.redirected);
    console.log("Final URL:", res.url);
    
    const text = await res.text();
    console.log("Body preview:");
    console.log(text.substring(0, 1000));
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
