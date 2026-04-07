// API.js – chỉ dùng API, KHÔNG đụng giao diện

// =================== CALL API CHUNG ===================
async function callAPI(url, method = "GET", body = null) {
  const options = { method, headers: { "Content-Type": "application/json" } };

  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (err) {
    console.error("API ERROR:", err);
    return { error: "Lỗi kết nối API" };
  }
}
