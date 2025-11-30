console.log('IREN Dashboard script loaded');

let data = JSON.parse(JSON.stringify(BASE_DATA));
let charts = {};

function calculate() {
  const years = data.years;

  // MW totals
  data.totalMW = years.map((_, i) =>
    data.mw.Childress[i] + data.mw.Sweetwater1[i] + data.mw.Sweetwater2[i] + data.mw.BC[i]
  );

  // Financials
  data.revenue   = years.map((_, i) => data.revenueAI[i] + data.revenueMining[i]);
  data.ebitda    = data.revenue.map((r, i) => r * data.ebitdaMargin[i]);
  data.fcf       = data.ebitda.map((e, i) => e * 0.75 - data.capex[i]);   // 25% tax

  updateAllCharts();
}

function renderAssumptions() {
  const table = document.getElementById("assumptions");
  table.innerHTML = `
    <tr><th>Year</th>${data.years.map(y => `<th>${y}</th>`).join("")}</tr>
    <tr><td>Sweetwater 1 MW</td>${data.mw.Sweetwater1.map((v,i)=>`<td contenteditable data-arr="mw.Sweetwater1" data-idx="${i}">${v}</td>`).join("")}</tr>
    <tr><td>AI Revenue $M</td>${data.revenueAI.map((v,i)=>`<td contenteditable data-arr="revenueAI" data-idx="${i}">${v}</td>`).join("")}</tr>
    <tr><td>Capex $M</td>${data.capex.map((v,i)=>`<td contenteditable data-arr="capex" data-idx="${i}">${v}</td>`).join("")}</tr>
    <tr><td>Terminal Multiple</td><td colspan="6" contenteditable data-key="terminalMultiple">${data.terminalMultiple}</td></tr>
  `;

  table.querySelectorAll("[contenteditable]").forEach(cell => {
    cell.addEventListener("input", e => {
      const val = parseFloat(e.target.textContent) || 0;
      if (e.target.dataset.arr) {
        const arr = e.target.dataset.arr;
        const idx = e.target.dataset.idx;
        data[arr][idx] = val;
      } else if (e.target.dataset.key) {
        data[e.target.dataset.key] = val;
      }
      calculate();
    });
  });
}

function updateAllCharts() {
  // Destroy existing charts
  Object.keys(charts).forEach(key => charts[key]?.destroy());
  charts = {};

  // 1. MW Chart
  charts.mw = new Chart(document.getElementById("mwChart"), {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [
        { label: "Childress",    data: data.mw.Childress,    stack: "s", backgroundColor: "#1f77b4" },
        { label: "Sweetwater 1", data: data.mw.Sweetwater1, stack: "s", backgroundColor: "#ff7f0e" },
        { label: "Sweetwater 2", data: data.mw.Sweetwater2, stack: "s", backgroundColor: "#2ca02c" },
        { label: "BC",           data: data.mw.BC,           stack: "s", backgroundColor: "#d62728" }
      ]
    },
    options: { responsive: true, plugins: { title: { display: true, text: "AI/HPC MW Online by Site" }}, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true }}}
  });

  // 2. DCF Chart
  charts.dcf = new Chart(document.getElementById("dcfChart"), {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [
        { label: "Revenue", data: data.revenue, type: "line", yAxisID: "y1", borderColor: "#1f77b4" },
        { label: "EBITDA",  data: data.ebitda,  backgroundColor: "rgba(44,160,44,0.6)" },
        { label: "Capex",   data: data.capex.map(c=>-c), backgroundColor: "rgba(214,39,40,0.6)" },
        { label: "FCF",     data: data.fcf,     backgroundColor: "rgba(255,159,64,0.8)" }
      ]
    },
    options: { responsive: true, scales: { y1: { position: "right" }}}
  });

  // 3. PRICE PATH CHART — THIS IS THE ONLY ONE THAT RUNS NOW
  charts.price = new Chart(document.getElementById("priceChart"), {
    type: "line",
    data: {
      labels: ["Today", "End-2026", "End-2027", "End-2028", "End-2029", "End-2030"],
      datasets: [
        { label: "10× Terminal", data: [64, 80, 115, 150, 185, 268], borderColor: "#9467bd", tension: 0.3, pointRadius: 6 },
        { label: "15× Terminal", data: [64, 92, 138, 185, 235, 322], borderColor: "#1f77b4", tension: 0.3, pointRadius: 6 },
        { label: "20× Terminal", data: [64,105, 162, 220, 285, 429], borderColor: "#ff7f0e", tension: 0.3, pointRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Fair Share Price Path (10× / 15× / 20× Terminal Multiple)",
          font: { size: 18 }
        },
        subtitle: {
          display: true,
          text: "Current Fair Value = $64 (base case) → up to $429 by 2030",
          font: { size: 14 }
        }
      },
      scales: {
        y: { title: { display: true, text: "Share Price ($)" }}
      }
    }
  });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  renderAssumptions();
  calculate();
});
