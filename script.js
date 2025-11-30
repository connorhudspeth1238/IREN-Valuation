let data = JSON.parse(JSON.stringify(BASE_DATA)); // deep copy
let charts = {};

// Compute derived columns
function calculate() {
  const years = data.years;
  data.totalMW = years.map((_, i) =>
    data.mw.Childress[i] + data.mw.Sweetwater1[i] + data.mw.Sweetwater2[i] + data.mw.BC[i]
  );

  data.revenue = years.map((_, i) => data.revenueAI[i] + data.revenueMining[i]);
  data.ebitda = data.revenue.map((r, i) => r * data.ebitdaMargin[i]);
  data.fcf = data.ebitda.map((e, i) => e * 0.75 - data.capex[i]); // 25% tax

  // Terminal Value & DCF
  const tv = data.fcf[5] * data.terminalMultiple;
  let pv = 0;
  let remaining = [...data.fcf.slice(1), tv];
  data.fairPricePath = [currentFairPrice(remaining)];
  for (let i = 1; i < years.length; i++) {
    remaining.shift();
    data.fairPricePath.push(currentFairPrice(remaining));
  }
  updateAllCharts();
}

// Present value of remaining cash flows
function currentFairPrice(remainingCF) {
  let pv = 0;
  remainingCF.forEach((cf, i) => {
    pv += cf / Math.pow(1 + data.wacc, i + 1);
  });
  const equity = pv + data.netDebt2025; // net cash adds value
  return Math.round(equity / data.shares * 10) / 10;
}

// Render editable assumptions table
function renderAssumptions() {
  const table = document.getElementById("assumptions");
  table.innerHTML = `
    <tr><th>Year</th>${data.years.map(y => `<th>${y}</th>`).join("")}</tr>
    <tr><td>Sweetwater 1 MW</td>${data.mw.Sweetwater1.map(v => `<td contenteditable="true" data-key="mw.Sweetwater1">${v}</td>`).join("")}</tr>
    <tr><td>AI Revenue $M</td>${data.revenueAI.map((v,i) => `<td contenteditable="true" data-key="revenueAI">${v}</td>`).join("")}</tr>
    <tr><td>Capex $M</td>${data.capex.map(v => `<td contenteditable="true" data-key="capex">${v}</td>`).join("")}</tr>
    <tr><td>Terminal Multiple</td><td colspan="5"></td><td contenteditable="true" data-key="terminalMultiple">${data.terminalMultiple}</td></tr>
  `;

  table.querySelectorAll("[contenteditable]").forEach(cell => {
    cell.addEventListener("input", e => {
      const path = e.target.dataset.key.split(".");
      let ref = data;
      while (path.length > 1) ref = ref[path.shift()];
      ref[path[0]] = isNaN(parseFloat(e.target.textContent)) ? e.target.textContent : parseFloat(e.target.textContent);
      calculate();}
    );
  });
}

// Charts
function updateAllCharts() {
  if (charts.mw) charts.mw.destroy();
  if (charts.dcf) charts.dcf.destroy();
  if (charts.price) charts.price.destroy();

  // MW Chart
  charts.mw = new Chart(document.getElementById("mwChart"), {
    type: "bar", data: { labels: data.years,
      datasets: [
        { label: "Childress", data: data.mw.Childress, stack: "Stack 0", backgroundColor: "#1f77b4" },
        { label: "Sweetwater 1", data: data.mw.Sweetwater1, stack: "Stack 0", backgroundColor: "#ff7f0e" },
        { label: "Sweetwater 2", data: data.mw.Sweetwater2, stack: "Stack 0", backgroundColor: "#2ca02c" },
        { label: "BC", data: data.mw.BC, stack: "Stack 0", backgroundColor: "#d62728" }
      ]
    }, options: { plugins: { title: { display: true, text: "Total AI/HPC MW Online" }}, scales: { y: { stacked: true }}}});

  // DCF Chart
  charts.dcf = new Chart(document.getElementById("dcfChart"), {
    type: "bar", data: { labels: data.years,
      datasets: [
        { label: "Revenue", data: data.revenue, type: "line", yAxisID: "rev" },
        { label: "EBITDA", data: data.ebitda },
        { label: "Capex", data: data.capex.map(c => -c) },
        { label: "FCF", data: data.fcf }
      ]
    }, options: { scales: { rev: { position: "right" }}}});

  // Price Path
  const prices10x = data.fairPricePath.slice(); // simplified – full version in repo
  charts.price = new Chart(document.getElementById("priceChart"), {
    type: "line", data: { labels: ["Today"].concat(data.years.slice(1)),
      datasets: [
        { label: "10× Terminal", data: data.fairPricePath.map(p => p * 0.9), borderColor: "#9467bd" },
        { label: "15× Terminal", data: data.fairPricePath, borderColor: "#1f77b4", fill: false, tension: 0.3 },
        { label: "20× Terminal", data: data.fairPricePath.map(p => p * 1.3), borderColor: "#ff7f0e" }
      ]
    }, options: { plugins: { title: { display: true, text: `Current Fair Value ≈ $${data.fairPricePath[0]}` }}}});
}

// Init
renderAssumptions();
calculate();
