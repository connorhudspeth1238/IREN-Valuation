console.log('IREN Dashboard — Mobile-Perfect Version');

let data = JSON.parse(JSON.stringify(BASE_DATA));
let charts = {};

function calculate() {
  const years = data.years;
  data.totalMW = years.map((_, i) =>
    data.mw.Childress[i] + data.mw.Sweetwater1[i] + data.mw.Sweetwater2[i] + data.mw.BC[i]
  );
  data.revenue = years.map((_, i) => data.revenueAI[i] + data.revenueMining[i]);
  data.ebitda  = data.revenue.map((r, i) => r * data.ebitdaMargin[i]);
  data.fcf     = data.ebitda.map((e, i) => e * 0.75 - data.capex[i]);
  updateAllCharts();
}

function renderAssumptions() {
  const table = document.getElementById("assumptions");
  const cell = (obj, prop, i) => `<td contenteditable data-obj="${obj}" data-prop="${prop}" data-idx="${i}">${prop ? data[obj][prop][i] : data[obj][i]}</td>`;

  table.innerHTML = `
    <tr><th>Year</th>${data.years.map(y => `<th>${y}</th>`).join("")}</tr>
    <tr><td><strong>Childress MW</strong></td>${data.mw.Childress.map((_,i) => cell("mw","Childress",i)).join("")}</tr>
    <tr><td><strong>Sweetwater 1 MW</strong></td>${data.mw.Sweetwater1.map((_,i) => cell("mw","Sweetwater1",i)).join("")}</tr>
    <tr><td><strong>Sweetwater 2 MW</strong></td>${data.mw.Sweetwater2.map((_,i) => cell("mw","Sweetwater2",i)).join("")}</tr>
    <tr><td><strong>BC MW</strong></td>${data.mw.BC.map((_,i) => cell("mw","BC",i)).join("")}</tr>
    <tr><td><strong>AI Revenue $M</strong></td>${data.revenueAI.map((_,i) => cell("revenueAI",null,i)).join("")}</tr>
    <tr><td><strong>Capex $M</strong></td>${data.capex.map((_,i) => cell("capex",null,i)).join("")}</tr>
    <tr><td><strong>Terminal Multiple</strong></td><td colspan="6" contenteditable data-key="terminalMultiple">${data.terminalMultiple}</td></tr>
  `;

  table.querySelectorAll("[contenteditable]").forEach(c => {
    c.addEventListener("blur", e => {
      const val = parseFloat(e.target.textContent) || 0;
      if (e.target.dataset.obj) {
        const o = e.target.dataset.obj;
        const p = e.target.dataset.prop;
        const i = e.target.dataset.idx;
        if (p) data[o][p][i] = val;
        else data[o][i] = val;
      } else if (e.target.dataset.key) {
        data[e.target.dataset.key] = val;
      }
      calculate();
    });
  });
}

function updateAllCharts() {
  Object.values(charts).forEach(c => c?.destroy());
  charts = {};

  // MW Chart
  charts.mw = new Chart(document.getElementById("mwChart"), {
    type: "bar", data: { labels: data.years, datasets: [
      { label: "Childress",    data: data.mw.Childress,    stack: "s", backgroundColor: "#1f77b4" },
      { label: "Sweetwater 1", data: data.mw.Sweetwater1, stack: "s", backgroundColor: "#ff7f0e" },
      { label: "Sweetwater 2", data: data.mw.Sweetwater2, stack: "s", backgroundColor: "#2ca02c" },
      { label: "BC",           data: data.mw.BC,           stack: "s", backgroundColor: "#d62728" }
    ]}, options: { responsive: true, plugins: { title: { display: true, text: "AI/HPC MW Online by Site" }}, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true }}}
  });

  // DCF Chart
  charts.dcf = new Chart(document.getElementById("dcfChart"), {
    type: "bar", data: { labels: data.years, datasets: [
      { label: "Revenue ($M)", data: data.revenue, type: "line", yAxisID: "rev", borderColor: "#1f77b4" },
      { label: "EBITDA ($M)",  data: data.ebitda,  backgroundColor: "rgba(44,160,44,0.7)" },
      { label: "Capex ($M)",   data: data.capex.map(c=>-c), backgroundColor: "rgba(214,39,40,0.7)" },
      { label: "FCF ($M)",     data: data.fcf,     backgroundColor: "rgba(255,159,64,0.8)" }
    ]}, options: { responsive: true, scales: { rev: { position: "right" }}}
  });

  // Price Path Chart
  charts.price = new Chart(document.getElementById("priceChart"), {
    type: "line", data: {
      labels: ["Today", "End-2026", "End-2027", "End-2028", "End-2029", "End-2030"],
      datasets: [
        { label: "10× Terminal", data: [64, 80, 115, 150, 185, 268], borderColor: "#9467bd", tension: 0.3, pointRadius: 6, fill: false },
        { label: "15× Terminal", data: [64,  92, 138, 185, 235, 322], borderColor: "#1f77b4", tension: 0.3, pointRadius: 6, fill: false },
        { label: "20× Terminal", data: [64, 105, 162, 220, 285, 429], borderColor: "#ff7f0e", tension: 0.3, pointRadius: 6, fill: false }
      ]
    }, options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: false },
        subtitle: { display: true, text: "Current Fair Value = $64 → up to $429 by 2030", font: { size: 16, weight: "bold" }, color: "#1f77b4", padding: { bottom: 20 }}
      },
      scales: { y: { title: { display: true, text: "Share Price ($)" }}}
    }
  });

  // Force redraw on mobile
  if (window.innerWidth <= 768) {
    setTimeout(() => Object.values(charts).forEach(c => c.resize()), 200);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderAssumptions();
  calculate();
});
