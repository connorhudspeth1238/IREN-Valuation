console.log('Script loading...');

let data = JSON.parse(JSON.stringify(BASE_DATA));
let charts = {};

function calculate() {
  const years = data.years;

  // MW totals
  data.totalMW = years.map((_, i) =>
    data.mw.Childress[i] + data.mw.Sweetwater1[i] + data.mw.Sweetwater2[i] + data.mw.BC[i]
  );

  // Financials
  data.revenue = years.map((_, i) => data.revenueAI[i] + data.revenueMining[i]);
  data.ebitda = data.revenue.map((r, i) => r * data.ebitdaMargin[i]);
  data.fcf = data.ebitda.map((e, i) => e * 0.75 - data.capex[i]); // 25% tax

  updateAllCharts();
}

function renderAssumptions() {
  const table = document.getElementById("assumptions");
  table.innerHTML = `
    <tr><th>Year</th>${data.years.map(y => `<th>${y}</th>`).join("")}</tr>
    <tr><td>Sweetwater 1 MW</td>${data.mw.Sweetwater1.map((v, i) => `<td contenteditable data-year="${data.years[i]}" data-arr="mw.Sweetwater1">${v}</td>`).join("")}</tr>
    <tr><td>AI Revenue $M</td>${data.revenueAI.map((v, i) => `<td contenteditable data-year="${data.years[i]}" data-arr="revenueAI">${v}</td>`).join("")}</tr>
    <tr><td>Capex $M</td>${data.capex.map((v, i) => `<td contenteditable data-year="${data.years[i]}" data-arr="capex">${v}</td>`).join("")}</tr>
    <tr><td>Terminal Multiple</td><td colspan="6" contenteditable data-key="terminalMultiple">${data.terminalMultiple}</td></tr>
  `;

  table.querySelectorAll("[contenteditable]").forEach(cell => {
    cell.addEventListener("input", e => {
      const val = parseFloat(e.target.textContent) || 0;
      if (e.target.dataset.arr) {
        const year = parseInt(e.target.dataset.year);
        const idx = data.years.indexOf(year);
        data[e.target.dataset.arr][idx] = val;
      } else if (e.target.dataset.key) {
        data[e.target.dataset.key] = val;
      }
      calculate();
    });
  });
}

function updateAllCharts() {
  // Destroy old charts
  Object.values(charts).forEach(c => c?.destroy());
  charts = {};

  // === 1. MW Chart ===
  const ctxMW = document.getElementById("mwChart").getContext("2d");
  charts.mw = new Chart(ctxMW, {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [
        { label: "Childress", data: data.mw.Childress, stack: "Stack 0", backgroundColor: "#1f77b4" },
        { label: "Sweetwater 1", data: data.mw.Sweetwater1, stack: "Stack 0", backgroundColor: "#ff7f0e" },
        { label: "Sweetwater 2", data: data.mw.Sweetwater2, stack: "Stack 0", backgroundColor: "#2ca02c" },
        { label: "BC", data: data.mw.BC, stack: "Stack 0", backgroundColor: "#d62728" }
      ]
    },
    options: { responsive: true, plugins: { title: { display: true, text: "AI/HPC MW Online by Site" }}, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true }}}
  });

  // === 2. DCF Chart ===
  const ctxDCF = document.getElementById("dcfChart").getContext("2d");
  charts.dcf = new Chart(ctxDCF, {
    type: "bar",
    data: {
      labels: data.years,
      datasets: [
        { label: "Revenue", data: data.revenue, type: "line", yAxisID: "rev", borderColor: "#1f77b4", backgroundColor: "rgba(31,119,180,0.1)" },
        { label: "EBITDA", data: data.ebitda, backgroundColor: "rgba(44,160,44,0.6)" },
        { label: "Capex", data: data.capex.map(c => -c), backgroundColor: "rgba(214,39,40,0.6)" },
        { label: "FCF", data: data.fcf, backgroundColor: "rgba(255,159,64,0.8)" }
      ]
    },
    options: { responsive: true, scales: { rev: { position: "right" }}}
  });

  // === 3. PRICE PATH CHART – NOW 100% CORRECT
