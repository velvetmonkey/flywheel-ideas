---
id: company-run-sec-10y-100-company-thesis
type: report
report_kind: company_sector_bundle_thesis
schema: sec-company-ledger-markdown-v1
run_id: sec-10y-100-company
entity_id: company-run-sec-10y-100-company-thesis
entity_type: company_sector_bundle_thesis
source: flywheel-ideas
---
# Company Thesis Report sec-10y-100-company

A deterministic decision-support view of current company bets, prior failures, unresolved review events, and next watchpoints.

## Executive Readout

- Companies: AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT
- Filings scanned: 1468
- Current thesis dependencies: 408 open bet(s).
- Human review queue: 187 event(s), 358 staged candidate(s).
- Accepted failures: 5; lessons recorded: 5; missing lesson memos: 0.
- Posture: evidence needs human review before thesis confidence should increase.

## Current Thesis Dependencies

- **NFLX / Demand** - fresh, review pressure 23, 84 observation(s), latest 2026-04-17
  - Assumption: asm-bmBJ3gyo
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **CSCO / Demand** - fresh, review pressure 21, 82 observation(s), latest 2026-02-17
  - Assumption: asm-apaexpGF
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **AVGO / Macro and foreign exchange** - fresh, review pressure 17, 49 observation(s), latest 2026-03-11
  - Assumption: asm-v2qMGCiq
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **TSLA / Supply chain** - fresh, review pressure 16, 79 observation(s), latest 2026-04-23
  - Assumption: asm-zXRB5TcJ
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **COST / Liquidity** - fresh, review pressure 13, 72 observation(s), latest 2026-03-11
  - Assumption: asm-P5mRwhf3
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **AMD / Supply chain** - fresh, review pressure 10, 79 observation(s), latest 2026-02-04
  - Assumption: asm-Eesv17uF
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **AMD / Inventory and channel** - fresh, review pressure 10, 66 observation(s), latest 2026-02-04
  - Assumption: asm-cX6hzDj2
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **DIS / Regulation and legal** - fresh, review pressure 10, 46 observation(s), latest 2026-02-02
  - Assumption: asm-K8rwQyCS
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **NVDA / Inventory and channel** - fresh, review pressure 8, 61 observation(s), latest 2026-02-25
  - Assumption: asm-XtUoWXU4
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **CSCO / Supply chain** - fresh, review pressure 8, 60 observation(s), latest 2026-02-17
  - Assumption: asm-SrGYCsLi
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **BKNG / Liquidity** - fresh, review pressure 7, 77 observation(s), latest 2026-04-28
  - Assumption: asm-r3YunLyG
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.
- **WBD / Regulation and legal** - fresh, review pressure 7, 58 observation(s), latest 2026-02-27
  - Assumption: asm-iVeAyyNH
  - Why it matters: Staged evidence exists; review before treating this assumption as intact.

## Prior Failures And Lessons

- **Platform demand assumptions for travel marketplaces can fail quickly when the underlying activity is externally restricted; review should focus on transaction-volume collapse before balance-sheet stress appears.**
  - Evidence: 1 accepted failure verdict(s) across BKNG / Demand
  - Representative context: The May 2020 10-Q disclosed material declines in gross travel bookings, room nights, total revenues, net income, operating cash flow, and April newly-booked room reservations down over 85% year over year.
  - Outcomes: out-A5GENqAJ
- **Export controls can turn a high-growth AI hardware bet into an inventory impairment risk; the ledger should connect geopolitics, capacity, and channel assumptions instead of reviewing them separately.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Cloud and data center capacity
  - Representative context: The 2026 10-K disclosed approximately $800 million of inventory and related charges on AMD Instinct MI308 products due to new export restrictions on China shipments.
  - Outcomes: out-dkrWjofL
- **For semiconductor companies, demand assumptions should be tested against channel inventory corrections, not just end-customer demand language.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Demand
  - Representative context: The November 2022 10-Q disclosed a Client revenue decline caused by weak PC macro conditions and inventory correction across the PC supply chain.
  - Outcomes: out-8fYekrdT
- **Geographic concentration is not just abstract geopolitical boilerplate; when a shock closes factories, logistics, and retail channels together, it can directly impair supply and demand in the same quarter.**
  - Evidence: 1 accepted failure verdict(s) across AAPL / Geopolitics and tariffs
  - Representative context: The May 2020 10-Q disclosed manufacturing, supply-chain, logistics, retail, and channel disruptions that caused temporary iPhone shortages and hurt China sales.
  - Outcomes: out-XVDcouNG
- **Regulatory permission is not equivalent to realized demand; export-control reviews should track revenue and shipment evidence after licenses are granted.**
  - Evidence: 1 accepted failure verdict(s) across NVDA / Demand
  - Representative context: The August 2025 10-Q disclosed a $4.5 billion H20 charge, diminished H20 demand, and no revenue or shipments under later-granted licenses as of the filing.
  - Outcomes: out-4GsRMjM5

## What Needs Human Review

- **NFLX / Demand** - 18 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-oPtGqLz2, cout-mvJwryY4, cout-S9XgtkYv, cout-8VtB1TTf, cout-2Pe19Uau, cout-BxgbQE6m, cout-UPwoxps4, cout-N2vAe4iJ, cout-B6mR21uo, cout-CJZPRJjt, cout-36FeGpiW, cout-pYPsuKHJ, cout-K4ZwjKRK, cout-nzSNaZpd, cout-rjZXPRvD, cout-oYUceTHj, cout-RMMDndfy, cout-8QDdz3Za
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-oPtGqLz2","cout-mvJwryY4","cout-S9XgtkYv","cout-8VtB1TTf","cout-2Pe19Uau","cout-BxgbQE6m","cout-UPwoxps4","cout-N2vAe4iJ","cout-B6mR21uo","cout-CJZPRJjt","cout-36FeGpiW","cout-pYPsuKHJ","cout-K4ZwjKRK","cout-nzSNaZpd","cout-rjZXPRvD","cout-oYUceTHj","cout-RMMDndfy","cout-8QDdz3Za"], confirm: true })`
  - Evidence: Since this launch, we have developed an ecosystem for Internet-connected screens and have added increasing amounts of content that enable consumers to enjoy TV shows and movies directly on their Internet-connected screens. As a result of these efforts, we have experienced growing consumer acceptance
- **AMD / Demand, Inventory and channel, Supply chain** - 9 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-kbxfopz5, cout-v6Ty6Zdj, cout-d99mgcRR, cout-QBMjwVwE, cout-j1jeGumr, cout-wLUjMTye, cout-5Yqbggez, cout-kU3Mq2WL, cout-828qFtnQ
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-kbxfopz5","cout-v6Ty6Zdj","cout-d99mgcRR","cout-QBMjwVwE","cout-j1jeGumr","cout-wLUjMTye","cout-5Yqbggez","cout-kU3Mq2WL","cout-828qFtnQ"], confirm: true })`
  - Evidence: The semiconductor industry is highly cyclical and has experienced significant downturns, often in conjunction with constant and rapid technological change, wide fluctuations in supply and demand, continuous new product introductions, price erosion and declines in general economic conditions. We have
- **BKNG / Demand, Liquidity** - 9 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-yhix48Sp, cout-LhXvMm8P, cout-Satn2WvP, cout-e4PxmHyN, cout-sfL2mhjW, cout-agp7CCTX, cout-NibTzGns, cout-pZRQmYjJ, cout-y8JXQgmy
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-yhix48Sp","cout-LhXvMm8P","cout-Satn2WvP","cout-e4PxmHyN","cout-sfL2mhjW","cout-agp7CCTX","cout-NibTzGns","cout-pZRQmYjJ","cout-y8JXQgmy"], confirm: true })`
  - Evidence: Our financial results and prospects are almost entirely dependent on the sale of such travel and restaurant-related services. Although it is impossible to accurately predict the ultimate impact of the COVID-19 pandemic and any resurgences of the pandemic on our business, our results for the three mo
- **TSLA / Supply chain** - 9 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-WRx31iqm, cout-jN4oqgop, cout-xp6TWpoc, cout-4GYhcYtu, cout-KQ9njBd7, cout-rVQCqAvX, cout-wBULifYr, cout-cR6u6CAy, cout-GoaZfWGJ
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-WRx31iqm","cout-jN4oqgop","cout-xp6TWpoc","cout-4GYhcYtu","cout-KQ9njBd7","cout-rVQCqAvX","cout-wBULifYr","cout-cR6u6CAy","cout-GoaZfWGJ"], confirm: true })`
  - Evidence: We will also need to hire, train and compensate skilled employees to operate these facilities. Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing proce
- **AMD / Demand, Inventory and channel, Macro and foreign exchange, Supply chain** - 8 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-jSPT2XmR, cout-Ce9PXTvY, cout-vDn3jCLs, cout-CogsohKF, cout-pKuDjHb2, cout-hahLCJDZ, cout-T4pvMqQg, cout-w5kcoghf
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-jSPT2XmR","cout-Ce9PXTvY","cout-vDn3jCLs","cout-CogsohKF","cout-pKuDjHb2","cout-hahLCJDZ","cout-T4pvMqQg","cout-w5kcoghf"], confirm: true })`
  - Evidence: Uncertainty in the worldwide economic environment or other unfavorable changes in economic conditions, such as inflation, interest rates or recession, may negatively impact consumer confidence and spending causing our customers to postpone purchases. For example, we have experienced a decline in our
- **COST / Liquidity** - 8 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-nJkW3yT3, cout-rk4WSMF4, cout-W2SZ4da5, cout-3bPeB17x, cout-Zsq2eHMQ, cout-fJjXN6d9, cout-w6ir3tva, cout-NxALTZCX
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-nJkW3yT3","cout-rk4WSMF4","cout-W2SZ4da5","cout-3bPeB17x","cout-Zsq2eHMQ","cout-fJjXN6d9","cout-w6ir3tva","cout-NxALTZCX"], confirm: true })`
  - Evidence: The Company's current financial liabilities have fair values that approximate their carrying values. The Company's long-term financial liabilities consist of long-term debt, which is recorded on the balance sheet at issuance price and adjusted for any applicable unamortized discounts or premiums and
- **AVGO / Macro and foreign exchange** - 7 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-HwFSLE7Q, cout-c5Dzq3kJ, cout-Vn8xq8ax, cout-6QiFPUbp, cout-SLWcKgjk, cout-vZBKKL1q, cout-Ddu9L23S
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-HwFSLE7Q","cout-c5Dzq3kJ","cout-Vn8xq8ax","cout-6QiFPUbp","cout-SLWcKgjk","cout-vZBKKL1q","cout-Ddu9L23S"], confirm: true })`
  - Evidence: A general slowdown in the global economy, including a recession, or in a particular region or industry, an increase in trade tensions with U.S. trading partners, inflation or a tightening of the credit markets could negatively impact our business, financial condition and liquidity. Adverse global ec
- **CSCO / Supply chain** - 7 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-HS3YK6Pe, cout-w2zC9TTB, cout-b3v8ZNpH, cout-AhH6jJvj, cout-7LcnP2xS, cout-yMGfyKDt, cout-USGy8doV
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-HS3YK6Pe","cout-w2zC9TTB","cout-b3v8ZNpH","cout-AhH6jJvj","cout-7LcnP2xS","cout-yMGfyKDt","cout-USGy8doV"], confirm: true })`
  - Evidence: Our growth and ability to meet customer demands depend in part on our ability to obtain timely deliveries of parts from our suppliers and contract manufacturers. We have experienced component shortages in the past, including shortages caused by manufacturing process issues, that have affected our op
- **TSLA / Macro and foreign exchange, Supply chain** - 6 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-JqgZNKCT, cout-y7rUjhBu, cout-XRP3yQYc, cout-et8KJcXt, cout-p2pm3Zfk, cout-VwaAdw5p
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-JqgZNKCT","cout-y7rUjhBu","cout-XRP3yQYc","cout-et8KJcXt","cout-p2pm3Zfk","cout-VwaAdw5p"], confirm: true })`
  - Evidence: In addition, we have experienced and are experiencing varying levels of inflation resulting in part from various supply chain disruptions, increased shipping and transportation costs, increased raw material and labor costs and other disruptions caused by the COVID‐19 pandemic and general global econ
- **COST / Liquidity** - 5 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-uoG1Fh3k, cout-xZUvpn16, cout-BqotHCgo, cout-EdkkVKh5, cout-ajPwzADX
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-uoG1Fh3k","cout-xZUvpn16","cout-BqotHCgo","cout-EdkkVKh5","cout-ajPwzADX"], confirm: true })`
  - Evidence: Current financial liabilities have fair values that approximate their carrying values. Long-term financial liabilities include the Company's long-term debt, which are recorded on the balance sheet at issuance price and adjusted for unamortized discounts or premiums and debt issuance costs, which are
- **AMD / Demand, Inventory and channel, Macro and foreign exchange, Supply chain** - 4 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-b7rv9AWz, cout-PMsTitrS, cout-aSYX3eRq, cout-hV8zfv1P
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-b7rv9AWz","cout-PMsTitrS","cout-aSYX3eRq","cout-hV8zfv1P"], confirm: true })`
  - Evidence: We experienced a decline in our Client segment revenue as a result of weak PC market macroeconomic conditions and inventory correction actions across the PC supply chain in the second half of 2022. Uncertain global economic conditions have and may in the future adversely impact our business.
- **AMD / Demand, Inventory and channel, Macro and foreign exchange, Supply chain** - 4 candidate(s), confidence up to 0.92
  - Candidate IDs: cout-d3GjJYuM, cout-YuYPEoN7, cout-qkpYLSZB, cout-4WNwfTGT
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-d3GjJYuM","cout-YuYPEoN7","cout-qkpYLSZB","cout-4WNwfTGT"], confirm: true })`
  - Evidence: Uncertainty in the economic environment or other unfavorable changes in economic conditions, such as inflation, higher interest rates, recession, slowing growth, increased unemployment, tighter credit markets, changes in fiscal monetary or trade policy, or currency fluctuations, may negatively impac

## Cross-Company Patterns

- **Demand**: 34 open bet(s) across AAPL, ABNB, AMZN, AVGO, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 2537 observation(s), review pressure 86, latest 2026-05-01
- **Supply chain**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1858 observation(s), review pressure 53, latest 2026-05-01
- **Liquidity**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 2606 observation(s), review pressure 47, latest 2026-05-01
- **Macro and foreign exchange**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 2109 observation(s), review pressure 33, latest 2026-05-01
- **Inventory and channel**: 36 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1438 observation(s), review pressure 33, latest 2026-05-01
- **Regulation and legal**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 2374 observation(s), review pressure 27, latest 2026-05-01
- **Geopolitics and tariffs**: 36 open bet(s) across ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1293 observation(s), review pressure 20, latest 2026-04-30
- **Cloud and data center capacity**: 35 open bet(s) across AAPL, ABNB, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1291 observation(s), review pressure 18, latest 2026-05-01
- **AI, R&D, and technology**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1459 observation(s), review pressure 11, latest 2026-05-01
- **Customer and platform dependency**: 36 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1293 observation(s), review pressure 9, latest 2026-05-01
- **Competition**: 37 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT, 1713 observation(s), review pressure 3, latest 2026-05-01
- **Cybersecurity and privacy**: 35 open bet(s) across AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, SBUX, T, TMUS, TSLA, VZ, WBD, WMT, 844 observation(s), review pressure 1, latest 2026-05-01

## What To Watch Next

- **NFLX / Demand**
  - Reason: 18 staged outcome candidate(s) need human review.
  - Next action: company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-oPtGqLz2","cout-mvJwryY4","cout-S9XgtkYv","cout-8VtB1TTf","cout-2Pe19Uau","cout-BxgbQE6m","cout-UPwoxps4","cout-N2vAe4iJ","cout-B6mR21uo","cout-CJZPRJjt","cout-36FeGpiW","cout-pYPsuKHJ","cout-K4ZwjKRK","cout-nzSNaZpd","cout-rjZXPRvD","cout-oYUceTHj","cout-RMMDndfy","cout-8QDdz3Za"], confirm: true })
  - Evidence: Since this launch, we have developed an ecosystem for Internet-connected screens and have added increasing amounts of content that enable consumers to enjoy TV shows and movies directly on their Internet-connected screens. As a result of these efforts, we have experienced growing consumer acceptance
- **AMD / Demand, Inventory and channel, Supply chain**
  - Reason: 9 staged outcome candidate(s) need human review.
  - Next action: company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-kbxfopz5","cout-v6Ty6Zdj","cout-d99mgcRR","cout-QBMjwVwE","cout-j1jeGumr","cout-wLUjMTye","cout-5Yqbggez","cout-kU3Mq2WL","cout-828qFtnQ"], confirm: true })
  - Evidence: The semiconductor industry is highly cyclical and has experienced significant downturns, often in conjunction with constant and rapid technological change, wide fluctuations in supply and demand, continuous new product introductions, price erosion and declines in general economic conditions. We have
- **BKNG / Demand, Liquidity**
  - Reason: 9 staged outcome candidate(s) need human review.
  - Next action: company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-yhix48Sp","cout-LhXvMm8P","cout-Satn2WvP","cout-e4PxmHyN","cout-sfL2mhjW","cout-agp7CCTX","cout-NibTzGns","cout-pZRQmYjJ","cout-y8JXQgmy"], confirm: true })
  - Evidence: Our financial results and prospects are almost entirely dependent on the sale of such travel and restaurant-related services. Although it is impossible to accurately predict the ultimate impact of the COVID-19 pandemic and any resurgences of the pandemic on our business, our results for the three mo
- **TSLA / Supply chain**
  - Reason: 9 staged outcome candidate(s) need human review.
  - Next action: company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-WRx31iqm","cout-jN4oqgop","cout-xp6TWpoc","cout-4GYhcYtu","cout-KQ9njBd7","cout-rVQCqAvX","cout-wBULifYr","cout-cR6u6CAy","cout-GoaZfWGJ"], confirm: true })
  - Evidence: We will also need to hire, train and compensate skilled employees to operate these facilities. Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing proce
- **AMD / Demand, Inventory and channel, Macro and foreign exchange, Supply chain**
  - Reason: 8 staged outcome candidate(s) need human review.
  - Next action: company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-jSPT2XmR","cout-Ce9PXTvY","cout-vDn3jCLs","cout-CogsohKF","cout-pKuDjHb2","cout-hahLCJDZ","cout-T4pvMqQg","cout-w5kcoghf"], confirm: true })
  - Evidence: Uncertainty in the worldwide economic environment or other unfavorable changes in economic conditions, such as inflation, interest rates or recession, may negatively impact consumer confidence and spending causing our customers to postpone purchases. For example, we have experienced a decline in our
- **CSCO / Demand**
  - Reason: Open assumption has review pressure 21.
  - Next action: Review staged candidates linked to assumption asm-apaexpGF before carrying this bet forward.
  - Evidence: 82 observation(s), latest 2026-02-17.
- **AVGO / Macro and foreign exchange**
  - Reason: Open assumption has review pressure 17.
  - Next action: Review staged candidates linked to assumption asm-v2qMGCiq before carrying this bet forward.
  - Evidence: 49 observation(s), latest 2026-03-11.
- **COST / Liquidity**
  - Reason: Open assumption has review pressure 13.
  - Next action: Review staged candidates linked to assumption asm-P5mRwhf3 before carrying this bet forward.
  - Evidence: 72 observation(s), latest 2026-03-11.

## Limits

- This is decision support, not investment advice or a buy/sell recommendation.
- SEC disclosures are issuer-authored evidence; they are useful but not independent proof of business reality.
- A staged review event is not a pass/fail verdict until a human applies it.
- The report does not use price feeds, valuation models, technical indicators, or portfolio allocation.

## Flywheel Audit

```flywheel-audit-json
{
  "schema": "sec-company-ledger-markdown-v1",
  "run_id": "sec-10y-100-company",
  "entity_id": "company-run-sec-10y-100-company-thesis",
  "entity_type": "company_sector_bundle_thesis",
  "path": "reports/company-runs/sec-10y-100-company/thesis.md"
}
```
