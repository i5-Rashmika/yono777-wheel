// =====================
// Winners History (Final Clean)
// Works with: history.html + style.css
// Storage keys: "winners"
// =====================

const STORAGE_KEY = "winners";

function loadWinners() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveWinners(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function render() {
  const winners = loadWinners();

  const totalEl = document.getElementById("totalWinners");
  const listEl = document.getElementById("historyList");

  if (totalEl) totalEl.textContent = winners.length;
  if (!listEl) return;

  listEl.innerHTML = "";

  if (winners.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No winners yet.";
    li.style.color = "rgba(230,238,252,.75)";
    listEl.appendChild(li);
    return;
  }

  // Latest first
  const latestFirst = winners.slice().reverse();

  latestFirst.forEach((uid) => {
    const li = document.createElement("li");
    li.textContent = String(uid);
    listEl.appendChild(li);
  });
}

// ---------- Actions ----------
function clearHistory() {
  if (!confirm("Clear winners history? This cannot be undone.")) return;
  saveWinners([]);
  render();
}

function exportWinners() {
  // Export as TXT (one UID per line)
  const winners = loadWinners();
  const content = winners.join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "winners.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function exportWinnersCSV() {
  // Export as CSV (Excel-friendly)
  const winners = loadWinners();
  const header = "uid\n";
  const rows = winners.map((uid) => `"${String(uid).replace(/"/g, '""')}"`).join("\n");
  const content = header + rows;

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "winners.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function copyAllWinners() {
  const winners = loadWinners();
  const content = winners.join("\n");

  try {
    await navigator.clipboard.writeText(content);
    alert("Copied winners to clipboard!");
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert("Copied winners to clipboard!");
  }
}

// ---------- Init ----------
window.onload = render;

// Expose to HTML buttons
window.clearHistory = clearHistory;
window.exportWinners = exportWinners;

// Optional: if you want CSV + copy buttons later
window.exportWinnersCSV = exportWinnersCSV;
window.copyAllWinners = copyAllWinners;
