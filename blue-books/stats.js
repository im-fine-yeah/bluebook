const form = document.querySelector("form");
const statusLine = document.querySelector("#status");
const table = document.querySelector("table");
const download = document.querySelector("#download");
let rows = [];

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  rows = [];
  table.hidden = true;
  download.hidden = true;
  statusLine.textContent = "正在读取统计…";
  try {
    const response = await fetch("/.netlify/functions/results", {
      headers: { Authorization: "Bearer " + document.querySelector("#password").value }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    rows = Object.entries(books).map(([code, [title]]) => [title, result.counts[code] ?? 0]);
    const body = table.querySelector("tbody");
    body.replaceChildren();
    for (const [title, count] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = title;
      row.insertCell().textContent = count;
    }
    statusLine.textContent = "去重答卷共 " + rows.reduce((sum, [, count]) => sum + count, 0) + " 份";
    table.hidden = false;
    download.hidden = false;
  } catch (error) {
    statusLine.textContent = error.message === "密码不正确" || error.message === "统计密码尚未配置"
      ? error.message : "读取失败，请确认网站已部署统计功能后重试。";
  } finally {
    button.disabled = false;
  }
});

download.addEventListener("click", () => {
  const csv = ["教材,去重答卷数", ...rows.map(row => row.join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "教材结果统计.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
