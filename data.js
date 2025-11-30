const BASE_DATA = {
  years: [2025, 2026, 2027, 2028, 2029, 2030],

  // MW Breakdown – edit any number
  mw: {
    Childress:    [150, 300, 400, 500, 600, 750],
    Sweetwater1:  [0,   300, 800,1000,1200,1400],
    Sweetwater2:  [0,   0,  200, 500, 800, 600],
    BC:           [20,  50,  80, 100, 120, 160]
  },

  // Financials ($M)
  revenueAI:      [250, 1700, 3200, 4200, 5400, 6900],
  revenueMining:  [300, 300,  300,  300,  300,  300],
  ebitdaMargin:   [0.50,0.55,0.70,0.70,0.70,0.70],
  cap //$M
  capex:          [800, 3000,2000,1000,500,300],
  terminalMultiple: 15,
  wacc: 0.12,
  shares: 360, // million
  netDebt2025: -1000 // net cash positive $1B today
};
