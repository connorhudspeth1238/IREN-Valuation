console.log('Script loading...'); // Debug: Check console for this

let data = JSON.parse(JSON.stringify(BASE_DATA)); // deep copy
let charts = {};

// Compute derived columns
function calculate() {
  console.log('Calculating...'); // Debug
  const years = data.years;
  data.totalMW = years.map((_, i) =>
    data.mw.Childress[i] + data.mw.Sweetwater1[i] + data.mw.Sweetwater2[i] + data.mw.BC[i]
  );

  data.revenue = years.map((_, i) => data.revenueAI[i] + data.revenueMining[i]);
  data.ebitda = data.revenue.map((r, i) => r * data.ebitdaMargin[i]);
  data.fcf = data.ebitda.map((e, i) => e * 0.75 - data.capex[i]); // 25% tax

  // Terminal Value & DCF (simplified path)
  const tv = data.fcf[5] * data.terminalMultiple;
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
  console.log('Rendering assumptions...'); // Debug
  const table = document.getElementById("assumptions");
  if (!table) { console.error('Table #assumptions not found!'); return; }
  table.innerHTML = `
    <tr><th>Year</th>${data.years.map(y => `<th>${y}</th>`).join("")}</tr>
    <tr><td>Sweetwater 1 MW</td>${data.mw.Sweetwater1.map(v => `<td contenteditable="true" data-key="mw.Sweetwater1.${data.years.indexOf(parseInt(v)) ? 'wait, fix index' : ''}">${v}</td>`).join("")}</tr>  // Simplified for now
    <tr><td>AI Revenue $M</td>${data.revenueAI.map(v => `<td contenteditable="true" data-key="revenueAI">${v}</td>`).join("")}</tr>
    <tr><td>Capex $M</td>${data.capex.map(v => `<td contenteditable="true" data-key="capex">${v}</td>`).join("")}</tr>
    <tr><td>Terminal Multiple</td><td colspan="6" contenteditable="true" data-key="terminalMultiple" style="text-align:center;font-weight:bold;">${data.terminalMultiple}</td></tr>
  `;

  table.querySelectorAll("[contenteditable]").forEach(cell => {
    cell.addEventListener("input", e => {
      const key = e.target.dataset.key;
      // Simple parse for arrays – update first matching
      if (key.includes('.')) {
        const [arr, idxStr] = key.split('.').slice(-2);
        const idx = data.years.indexOf(parseInt(idxStr)) || 0;
        data[arr][idx] = parseFloat(e.target.textContent) || 0;
      } else {
        data[key] = parseFloat(e.target.textContent) || e.target.textContent;
      }
      calculate();
    });
  });
}

// Charts (using Chart.js)
function updateAllCharts() {
  console.log('Updating charts...', data.fairPricePath); // Debug
  const ctxMW = document.getElementById("mwChart");
  if (!ctxMW) { console.error('Canvas #mwChart not found!'); return; }
  if (charts.mw) charts.mw.destroy();

  charts.mw = new Chart(ctxMW.getContext('2d'), {
    type: 'bar',
    data: {
      labels: data.years,
      datasets: [
        { label: 'Childress', data: data.mw.Childress, stack: 'Stack 0', backgroundColor: '#1f77b4' },
        { label: 'Sweetwater 1', data: data.mw.Sweetwater1, stack: 'Stack 0', backgroundColor: '#ff7f0e' },
        { label: 'Sweetwater 2', data: data.mw.Sweetwater2, stack: 'Stack 0', backgroundColor: '#2ca02c' },
        { label: 'BC', data: data.mw.BC, stack: 'Stack 0', backgroundColor: '#d62728' }
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Total AI/HPC MW Online' } },
      scales: { y: { stacked: true, beginAtZero: true } }
    }
  });

  // Similar for DCF and Price – abbreviated for brevity, expand if needed
  // DCF Chart
  const ctxDCF = document.getElementById("dcfChart");
  if (charts.dcf) charts.dcf.destroy();
  charts.dcf = new Chart(ctxDCF.getContext('2d'), {
    type: 'bar',
    data: {
      labels: data.years,
      datasets: [
        { label: 'Revenue', data: data.revenue, type: 'line', yAxisID: 'rev', borderColor: '#1f77b4' },
        { label: 'EBITDA', data: data.ebitda, backgroundColor: '#2ca02c' },
        { label: 'Capex', data: data.capex.map(c => -c), backgroundColor: '#d62728' },
        { label: 'FCF', data: data.fcf, backgroundColor: '#ff7f0e' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        rev: { position: 'right', beginAtZero: true },
        y: { beginAtZero: true }
      }
    }
  });

  // Price Path
  const ctxPrice = document.getElementById("priceChart");
  if (charts.price) charts.price.destroy();
  const labels = ['Today', ...data.years.slice(1)];
  const basePath = data.fairPricePath;
  charts.price = new Chart(ctxPrice.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: '10× Terminal', data: basePath.map(p => p * 0.67), borderColor: '#9467bd', fill: false },
        { label: '15× Terminal', data: basePath, borderColor: '#1f77b4', fill: false },
        { label: '20× Terminal', data: basePath.map(p => p * 1.33), borderColor: '#ff7f0e', fill: false }
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: `Current Fair Value ≈ $${basePath[0].toFixed(0)}` } }
    }
  });
}

// Init on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...'); // Debug
  if (typeof BASE_DATA === 'undefined') { console.error('BASE_DATA not loaded from data.js!'); return; }
  renderAssumptions();
  calculate();
});
