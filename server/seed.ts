import { storage } from "./storage";
import { db } from "./db";
import { reports } from "@shared/schema";

const sampleReports = [
  {
    title: "Q4 2025 Global Market Outlook: Navigating Uncertainty",
    reportType: "macro_outlook",
    content: `## Executive Summary

Global markets enter Q4 2025 amid a complex backdrop of moderating inflation, divergent central bank policies, and evolving geopolitical dynamics. This outlook examines key themes shaping the investment landscape.

## Key Themes

### Monetary Policy Divergence
The Federal Reserve has signaled a cautious approach to rate adjustments, while the ECB maintains its easing trajectory. This divergence creates opportunities in:
- **Currency markets**: USD strength relative to EUR
- **Fixed income**: Duration positioning across geographies
- **Emerging markets**: Capital flow dynamics

### Artificial Intelligence Investment Cycle
The AI infrastructure buildout continues to drive capital expenditure across the technology sector. Key observations:
- Hyperscaler capex remains elevated at $200B+ annually
- Power infrastructure demand creating opportunities in utilities
- Second-order beneficiaries emerging in industrial and materials sectors

### Geopolitical Risk Premium
Elevated geopolitical tensions continue to influence commodity pricing and supply chain configurations. We recommend maintaining hedged positions in energy and defense sectors.

## Sector Allocation

| Sector | Rating | Rationale |
|--------|--------|-----------|
| Technology | Overweight | AI tailwinds, strong earnings |
| Healthcare | Neutral | Regulatory uncertainty |
| Energy | Overweight | Supply constraints |
| Financials | Overweight | Rate environment favorable |
| Consumer Discretionary | Underweight | Spending moderation |

## Risk Factors
1. Unexpected inflation resurgence
2. Credit market stress
3. Geopolitical escalation
4. Regulatory changes in technology sector

## Conclusion
We maintain a constructive but selective stance, emphasizing quality and earnings visibility. Portfolio positioning should balance growth exposure with defensive characteristics.`,
  },
  {
    title: "Semiconductor Industry: Supply Chain Restructuring Analysis",
    reportType: "sector_review",
    content: `## Industry Overview

The semiconductor industry is undergoing its most significant structural transformation in decades. Government subsidies, geopolitical considerations, and supply chain resilience are reshaping the global manufacturing landscape.

## CHIPS Act Impact Assessment

The U.S. CHIPS and Science Act has catalyzed over $300 billion in announced investments. Key developments:

### Domestic Manufacturing Expansion
- **Intel**: $100B+ investment across Ohio and Arizona facilities
- **TSMC**: Arizona fab progressing with advanced node production
- **Samsung**: Texas facility expansion on track

### Implications for Investors
The reshoring trend creates opportunities across the value chain:
- Equipment manufacturers (Applied Materials, ASML, Lam Research)
- Materials suppliers (Entegris, Air Products)
- Construction and engineering firms

## Market Dynamics

### Demand Drivers
1. **AI Accelerators**: GPU and custom silicon demand remains robust
2. **Automotive**: Electrification driving content per vehicle growth
3. **IoT/Edge Computing**: Expanding addressable market

### Pricing Environment
Memory pricing has stabilized after the cyclical downturn, with HBM commanding significant premiums. Logic pricing remains firm for advanced nodes.

## Valuation Framework

The sector trades at elevated multiples relative to historical averages, but earnings growth projections support current valuations for market leaders.

## Recommendation
Maintain overweight positioning in semiconductor equipment and advanced logic manufacturers. Exercise caution on commodity memory producers.`,
  },
  {
    title: "Weekly Market Digest: February 3-7, 2026",
    reportType: "weekly_digest",
    content: `## Market Performance Summary

### U.S. Equity Markets
- **S&P 500**: +1.2% (5,890)
- **Nasdaq Composite**: +1.8% (19,450)
- **Dow Jones**: +0.7% (44,200)
- **Russell 2000**: +0.3% (2,180)

### International Markets
- **MSCI EAFE**: +0.5%
- **MSCI Emerging Markets**: -0.2%
- **Nikkei 225**: +1.1%

### Fixed Income
- **10Y Treasury Yield**: 4.15% (-5bps)
- **2Y Treasury Yield**: 3.85% (-8bps)
- **Investment Grade Spread**: 95bps (unchanged)

## Key Events This Week

### Economic Data
- **Nonfarm Payrolls**: 185K (vs. 200K expected) - labor market cooling
- **ISM Services**: 53.2 (expansion continues)
- **Consumer Sentiment**: 72.5 (slight improvement)

### Earnings Highlights
Notable Q4 earnings releases:
- **Alphabet**: Beat on revenue and EPS, cloud segment accelerating
- **Amazon**: Strong AWS growth, retail margins expanding
- **Eli Lilly**: GLP-1 demand exceeding capacity

### Central Bank Activity
- Fed speakers maintained data-dependent messaging
- ECB minutes revealed growing consensus for continued easing

## Sector Performance
Technology and Communication Services led gains, while Utilities and Real Estate lagged.

## Looking Ahead
Key events next week: CPI data (Wednesday), retail sales (Thursday), and earnings from major financials.`,
  },
  {
    title: "Healthcare Innovation: GLP-1 Market Landscape",
    reportType: "equity_research",
    content: `## Investment Thesis

The GLP-1 receptor agonist market represents one of the most significant pharmaceutical growth opportunities in decades. With expanding indications beyond diabetes and obesity, the total addressable market could exceed $150 billion by 2030.

## Market Leaders

### Novo Nordisk (NVO)
- **Wegovy/Ozempic**: Dominant market position with strong brand recognition
- **Pipeline**: Oral semaglutide (higher doses), CagriSema combination therapy
- **Manufacturing**: Aggressive capacity expansion underway
- **Valuation**: Premium justified by market leadership and pipeline depth

### Eli Lilly (LLY)
- **Mounjaro/Zepbound**: Rapid market share gains with best-in-class efficacy data
- **Pipeline**: Orforglipron (oral GLP-1), retatrutide (triple agonist)
- **Advantage**: Superior weight loss outcomes in clinical trials
- **Valuation**: Growth premium reflects pipeline optionality

## Expanding Indications

Clinical trials are exploring GLP-1 applications in:
1. **Cardiovascular disease**: SELECT trial demonstrated 20% MACE reduction
2. **NASH/MAFLD**: Liver fibrosis improvement
3. **Sleep apnea**: Significant AHI reduction
4. **Alzheimer's disease**: Early-stage exploration
5. **Addiction**: Preliminary signal in alcohol use disorder

## Competitive Landscape

New entrants and biosimilar competition will reshape the market:
- **Amgen**: MariTide (long-acting injectable, monthly dosing)
- **Pfizer**: Danuglipron (oral, differentiated mechanism)
- **Viking Therapeutics**: VK2735 (subcutaneous and oral formulations)

## Supply Chain Analysis

Manufacturing capacity remains the binding constraint. Key bottleneck areas:
- Active pharmaceutical ingredient (API) production
- Fill-finish capacity for injectable formulations
- Device manufacturing (auto-injectors, pens)

## Financial Model

| Metric | 2025E | 2026E | 2027E |
|--------|-------|-------|-------|
| Global GLP-1 Revenue | $55B | $80B | $110B |
| Novo Nordisk Share | 52% | 48% | 45% |
| Eli Lilly Share | 38% | 40% | 42% |
| Others | 10% | 12% | 13% |

## Risks
- Manufacturing delays or quality issues
- Regulatory setbacks for new indications
- Long-term safety data uncertainty
- Pricing pressure from payers and governments

## Recommendation
Maintain overweight on both Novo Nordisk and Eli Lilly. The secular growth trend in GLP-1 therapies supports premium valuations despite near-term supply constraints.`,
  },
  {
    title: "Fixed Income Strategy: Duration and Credit Positioning for 2026",
    reportType: "market_analysis",
    content: `## Strategic Overview

The fixed income landscape presents a nuanced opportunity set as central banks navigate the final stages of their tightening cycles. This report outlines our recommended positioning across duration, credit, and geographic allocation.

## Interest Rate Outlook

### United States
- Terminal rate expectations: 3.75-4.00%
- Pace of easing: Gradual, data-dependent
- Curve shape: Continued normalization expected

### Europe
- ECB likely to reach neutral rate of 2.00-2.25% by mid-2026
- Peripheral spread compression may continue
- Political risk in France warrants monitoring

### Japan
- BOJ normalization proceeding cautiously
- JGB yields likely to drift higher
- Yen carry trade dynamics shifting

## Duration Recommendations

### Core Positioning
- **U.S. Treasuries**: Modestly long duration (target: 6.5 years)
- **European Government Bonds**: Neutral duration
- **Emerging Market Local**: Selective opportunities in high-real-yield markets

### Tactical Considerations
The inverted yield curve has largely normalized, reducing the carry advantage of short-duration strategies. We recommend extending duration selectively:
- 5-7 year segment offers attractive risk-adjusted returns
- 30-year treasuries for liability-matching portfolios
- TIPS for inflation protection at current breakeven levels

## Credit Analysis

### Investment Grade
- Spreads remain historically tight but fundamentals support current levels
- Prefer financials and utilities over industrials
- New issuance well-absorbed by demand

### High Yield
- Default rates remain below historical averages
- Quality bias recommended (BB-rated over CCC)
- Floating rate exposure through leveraged loans

## Portfolio Construction

| Allocation | Weight | Duration |
|------------|--------|----------|
| U.S. Treasuries | 30% | 6.5yr |
| Investment Grade Corporate | 25% | 5.0yr |
| Agency MBS | 15% | 4.5yr |
| High Yield | 10% | 3.0yr |
| EM Debt (Hard Currency) | 10% | 5.5yr |
| TIPS | 5% | 7.0yr |
| Cash/Short Duration | 5% | 0.3yr |

## Key Risks
1. Inflation re-acceleration forcing central bank reversal
2. Credit event in leveraged finance
3. Sovereign debt concerns in developed markets
4. Liquidity deterioration during risk-off episodes

## Conclusion
Fixed income offers compelling value at current yield levels. A balanced approach combining duration extension with credit quality emphasis positions portfolios for multiple scenarios.`,
  },
];

export async function seedReports() {
  try {
    const existing = await storage.getReports();
    if (existing.length > 0) {
      return;
    }

    for (const report of sampleReports) {
      await storage.createReport(report);
    }
    console.log(`Seeded ${sampleReports.length} sample reports`);
  } catch (err) {
    console.error("Failed to seed reports:", err);
  }
}
