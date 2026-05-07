---
id: company-run-sec-10y-100-company-tracker
type: report
report_kind: company_sector_bundle_tracker
schema: sec-company-ledger-markdown-v1
run_id: sec-10y-100-company
entity_id: company-run-sec-10y-100-company-tracker
entity_type: company_sector_bundle_tracker
source: flywheel-ideas
---
# Company Tracker sec-10y-100-company

- Companies: ["NVDA","AAPL","MSFT","AVGO","MU","AMD","INTC","ORCL","CSCO","PLTR","AMZN","TSLA","HD","MCD","TJX","BKNG","LOW","SBUX","MAR","ABNB","GOOGL","META","NFLX","TMUS","VZ","DIS","T","CMCSA","WBD","EA","WMT","COST","PG","KO","PM","PEP","MO","MDLZ","MNST","CL","BRK-B","JPM","V","MA","BAC","MS","GS","WFC","AXP","C","LLY","JNJ","ABBV","UNH","MRK","AMGN","TMO","GILD","ISRG","ABT","XOM","CVX","COP","WMB","SLB","EOG","VLO","MPC","KMI","PSX","CAT","GE","GEV","RTX","BA","ETN","UNP","DE","UBER","HON","LIN","NEM","FCX","SHW","CRH","ECL","APD","CTVA","NUE","VMC","NEE","CEG","SO","DUK","AEP","SRE","D","ETR","VST","XEL","WELL","PLD","EQIX","AMT","DLR","SPG","O","PSA","VTR","CBRE"]
- Years: 10
- Forms: ["10-K","10-Q"]
- Filings scanned: 1468
- Themes tracked: 439
- Staged outcomes: 55
- Applied outcomes: 55

## SEC Company Lifecycle Report

This report tracks the loop: current bets -> evidence over time -> review queue -> accepted outcomes -> lessons.

## Lifecycle Snapshot

- Corpus: AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT across 1468 filing(s), 439 tracked assumption(s), and 21186 dated observation(s).
- Current bets: 361 open company/theme assumption(s) still being carried.
- Review queue: 24 event(s), 55 staged candidate(s) awaiting human judgment.
- Accepted outcomes: 55 failure(s), 0 validation(s).
- Lessons: 55 recorded memo(s), 0 missing memo(s).
- Triage completion: 55/363 candidate(s) applied (15%).

## Operator Next Step

Review the highest-pressure event and apply only if the evidence really refutes the bet: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-255h14jf"], confirm: true })`

## Lifecycle Status

55 accepted verdict(s) are in the ledger, and all accepted failures have durable lesson memos.

## Lessons Captured

- **Cybersecurity risk becomes decision-grade when breach disclosure connects unauthorized access to quantified costs, customer data exposure, and follow-on litigation.**
  - Evidence: 1 accepted failure verdict(s) across HD / Cybersecurity and privacy
  - Representative context: Home Depot disclosed a data breach involving stolen payment-card information and customer email addresses, $161M of pretax expenses net of expected insurance recoveries, and related class-action/shareholder litigation.
  - Outcomes: out-btdioMuB
- **Technology/R&D exposure becomes falsified when strategic cost resets require quantified restructuring and severance charges rather than normal operating adjustment.**
  - Evidence: 1 accepted failure verdict(s) across MU / AI, R&D, and technology
  - Representative context: Micron disclosed $171M of restructuring charges in 2023, primarily related to employee severance, while pursuing a plan expected to generate cost savings.
  - Outcomes: out-TJEZc2NV
- **Liquidity risk is decision-grade when financing actions create quantified extinguishment losses and explicit margin/EPS impacts.**
  - Evidence: 1 accepted failure verdict(s) across TJX / Liquidity
  - Representative context: TJX completed make-whole calls for $2B of debt and recorded a $242M pre-tax loss on early extinguishment, reducing fiscal 2022 pre-tax margin by 2.0 points and EPS by $0.15.
  - Outcomes: out-51DsRhsa
- **Investment/liquidity risks become falsified when fair-value declines are no longer temporary and management records a quantified impairment.**
  - Evidence: 1 accepted failure verdict(s) across MO / Liquidity
  - Representative context: Altria disclosed a $2.5B non-cash pre-tax impairment charge on its ABI equity investment after concluding the fair-value decline was other-than-temporary.
  - Outcomes: out-V13Rkdgz
- **Liquidity/capital allocation risk becomes decision-grade when a company exits a market and quantifies the impairment required to unwind the bet.**
  - Evidence: 1 accepted failure verdict(s) across LOW / Liquidity
  - Representative context: Lowe's disclosed a $530M non-cash impairment charge associated with exiting the Australian home improvement market.
  - Outcomes: out-nzwXFuEc
- **Legal/liquidity risks become falsified when filings move from exposure language to probable adverse outcomes with quantified P&L and EPS effects.**
  - Evidence: 1 accepted failure verdict(s) across PM / Liquidity
  - Representative context: PM recorded a $204M non-cash pre-tax charge after concluding an adverse outcome was probable, with a stated $0.11 diluted EPS impact.
  - Outcomes: out-VEELu9Yp
- **For platform companies, geopolitical risk becomes decision-grade when access restrictions are tied to measured user engagement declines, even before the filing quantifies revenue loss.**
  - Evidence: 1 accepted failure verdict(s) across META / Geopolitics and tariffs
  - Representative context: Meta disclosed a slight quarter-over-quarter decline in Family daily active people driven by internet disruptions in Iran and WhatsApp access restrictions in Russia.
  - Outcomes: out-aWE2ftCq
- **A geopolitics risk becomes decision-grade when filings move from generic exposure language to named-market exits, impairment charges, and quantified restructuring costs.**
  - Evidence: 1 accepted failure verdict(s) across DIS / Geopolitics and tariffs
  - Representative context: Disney recorded about $0.2B of restructuring and impairment charges primarily tied to Russia businesses and warned that additional exit charges could follow.
  - Outcomes: out-tnWp4P7Z
- **Experience and media demand assumptions should track revenue and operating-income shocks together because attendance, production, advertising, and distribution disruptions can compound into enterprise-level losses.**
  - Evidence: 1 accepted failure verdict(s) across DIS / Demand
  - Representative context: The filing disclosed quarterly revenues decreased 42%, or $8.5 billion, to $11.8 billion, while net income attributable to Disney decreased $6.5 billion to a $4.7 billion loss.
  - Outcomes: out-bDqnUbbv
- **Semiconductor supply-chain assumptions should track early disruption language even when quantified impact is limited because it signals the operating loop being actively rebalanced.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Supply chain
  - Representative context: The filing disclosed AMD experienced some disruptions to parts of its supply chain during the first quarter of 2020 and continued adjusting supply-chain requirements based on changing customer needs and demand.
  - Outcomes: out-AiaZth1U
- **Semiconductor legal assumptions should track contingent-loss language because even small legal reserves mark realized friction that can recur or compound around transactions.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Regulation and legal
  - Representative context: The filing disclosed a $5 million contingent loss in connection with a legal matter, alongside other transaction-related expense items.
  - Outcomes: out-PzSBYfnX
- **Hardware demand assumptions should track channel availability because temporary closures can weaken demand even when supply-chain issues are the more visible shock.**
  - Evidence: 1 accepted failure verdict(s) across AAPL / Demand
  - Representative context: The filing disclosed many channel partner points of sale outside China temporarily closed and Apple experienced weakened demand for products and services outside China during the last three weeks of the quarter.
  - Outcomes: out-ziDKD8UB
- **Media-production regulation assumptions should track production shutdowns and reopening compliance costs because restrictions can impair both content supply and operating margins.**
  - Evidence: 1 accepted failure verdict(s) across WBD / Regulation and legal
  - Representative context: The filing disclosed third-party production partners were shut down during most of the second quarter of 2020 due to COVID-19 restrictions, and after reopening the company incurred additional costs to comply with governmental regulations and safety measures.
  - Outcomes: out-sTpYBDUQ
- **EV demand assumptions should track revenue declines across both quarterly and year-to-date windows because short-term delivery or pricing weakness can compound into a broader demand reset.**
  - Evidence: 1 accepted failure verdict(s) across TSLA / Demand
  - Representative context: During the three and six months ended June 30, 2025, Tesla disclosed total revenues of $22.50 billion and $41.83 billion, representing year-over-year decreases of $3.00 billion and $4.97 billion.
  - Outcomes: out-dRsn956z
- **Channel assumptions should track distributor-arrangement charges because route-to-market decisions can create direct P&L costs even when underlying consumer demand is stable.**
  - Evidence: 1 accepted failure verdict(s) across PM / Inventory and channel
  - Representative context: The filing disclosed that, based on decisions and arrangements with distributors, Philip Morris recorded a $246 million pre-tax charge in the second quarter of 2021.
  - Outcomes: out-PJAxG7yK
- **Tobacco demand assumptions should track volume/mix by market because pricing can mask broad volume pressure until it appears in net revenue.**
  - Evidence: 1 accepted failure verdict(s) across PM / Demand
  - Representative context: For the nine months ended September 30, 2020, Philip Morris disclosed net revenues excluding unfavorable currency decreased 1.7%, reflecting unfavorable volume/mix primarily due to lower cigarette volume in multiple markets.
  - Outcomes: out-srjsEnMV
- **Semiconductor supply-chain assumptions should track architecture-transition inventory because component commitments can become charges when product platforms shift.**
  - Evidence: 1 accepted failure verdict(s) across NVDA / Supply chain
  - Representative context: The filing disclosed approximately $128 million in excess DRAM and other component charges plus a $57 million charge for prior-architecture components and chips.
  - Outcomes: out-QuoB6Xk9
- **Memory inventory assumptions should track product-line exits because technology discontinuation can convert both assets and inventory into charges.**
  - Evidence: 1 accepted failure verdict(s) across MU / Inventory and channel
  - Representative context: In 2021, Micron recognized a $435 million restructure and asset-impairment charge related to assets held for sale and a $49 million cost-of-goods-sold charge to write down 3D XPoint inventory.
  - Outcomes: out-ckuQwvui
- **AI/R&D assumptions should separate productive investment from impairment-backed cost pressure; both can rise together and change the risk profile.**
  - Evidence: 1 accepted failure verdict(s) across MSFT / AI, R&D, and technology
  - Representative context: The filing disclosed operating expenses increased $236 million, driven by Gaming impairment charges and R&D investments in compute capacity and AI talent.
  - Outcomes: out-JiCcBcGp
- **Technology-platform assumptions should track impairment charges inside R&D because they identify product or portfolio bets that failed to compound.**
  - Evidence: 1 accepted failure verdict(s) across MSFT / AI, R&D, and technology
  - Representative context: The filing disclosed R&D expenses increased $1.1 billion, driven partly by impairment charges resulting from changes to the hardware portfolio.
  - Outcomes: out-4u23dr9z
- **Supply-chain assumptions should track availability of component parts and alternative sourcing work because mitigation language often reveals operational pressure already being felt.**
  - Evidence: 1 accepted failure verdict(s) across MO / Geopolitics and tariffs
  - Representative context: The filing disclosed continued domestic and global supply and distribution chain disruptions and negative effects on raw-material and component cost and availability.
  - Outcomes: out-nojVhWNc
- **Domestic-business geopolitics assumptions should still track indirect input exposure because conflict can reach companies through supplier cost and availability rather than direct revenue.**
  - Evidence: 1 accepted failure verdict(s) across MO / Supply chain
  - Representative context: The filing disclosed negative effects on the cost and availability of certain raw materials and component parts despite little direct Russia/Ukraine exposure.
  - Outcomes: out-pHzkjaqp
- **Experience-business macro assumptions should track cost inflation in guest-facing merchandise, food, and beverage because demand recovery can still carry margin pressure.**
  - Evidence: 1 accepted failure verdict(s) across DIS / Macro and foreign exchange
  - Representative context: The filing disclosed cost of products increased 4% to $1.7 billion due to higher sales volumes and cost inflation at theme parks and resorts.
  - Outcomes: out-oGp6QiUf
- **Experience-business regulation assumptions should track operating restrictions and compliance-cost burdens because rules can affect both revenue availability and cost structure.**
  - Evidence: 1 accepted failure verdict(s) across DIS / Regulation and legal
  - Representative context: The filing disclosed that reopening or closure of Disney businesses depended on changing government requirements and that reopened businesses incurred additional costs to address regulations and safety of employees, talent, and guests.
  - Outcomes: out-HR8ZaBsU
- **Infrastructure demand assumptions should track customer digestion of prior shipments because channel absorption can turn apparent backlog strength into later revenue weakness.**
  - Evidence: 1 accepted failure verdict(s) across CSCO / Demand
  - Representative context: During the first nine months of fiscal 2024, Cisco disclosed a decline in product demand and revenue as customers scrutinized spend and worked through elevated product shipments received in prior quarters.
  - Outcomes: out-TiY265ie
- **Regulation and legal assumptions should track settlement charges when management connects them to margin movement, not only litigation headlines or final judgments.**
  - Evidence: 1 accepted failure verdict(s) across CSCO / Regulation and legal
  - Representative context: The filing disclosed gross-margin pressure driven by unfavorable pricing, lower productivity benefits from higher memory-component costs, and a $122 million legal and indemnification settlement charge.
  - Outcomes: out-4D4Rto1C
- **Semiconductor geopolitics assumptions should track export-control inventory charges because policy changes can immediately convert product roadmaps into stranded assets.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Geopolitics and tariffs
  - Representative context: The fiscal 2025 filing disclosed approximately $800 million of inventory and related charges on MI308 Data Center GPU products due to new U.S. export restrictions to China.
  - Outcomes: out-BqJTAbxZ
- **Channel-dependency assumptions should treat retail and partner access as load-bearing when regional shutdowns can directly suppress sales.**
  - Evidence: 1 accepted failure verdict(s) across AAPL / Customer and platform dependency
  - Representative context: The filing disclosed that China sales were adversely affected by public-health measures, including temporary closure of Apple retail stores and channel-partner points of sale.
  - Outcomes: out-yu9stwSH
- **Hardware supply-chain assumptions should track outsourcing-partner geography because localized disruptions can create global product shortages.**
  - Evidence: 1 accepted failure verdict(s) across AAPL / Supply chain
  - Representative context: The filing disclosed temporary iPhone supply shortages that affected sales worldwide after manufacturing, supply-chain, and logistics disruptions.
  - Outcomes: out-1ZsB57E2
- **Retail supply-chain assumptions should include supplier-obligation rigidity because fixed commitments can amplify demand shocks.**
  - Evidence: 1 accepted failure verdict(s) across SBUX / Supply chain
  - Representative context: The filing disclosed higher expenses from honoring supplier obligations, alongside lost revenues and inventory write-offs.
  - Outcomes: out-xsQzN5r7
- **Perishable retail inventory assumptions should watch write-off language because demand shocks can convert quickly into margin losses.**
  - Evidence: 1 accepted failure verdict(s) across SBUX / Inventory and channel
  - Representative context: The filing disclosed higher expenses from inventory write-offs, contributing to significantly lower operating margins for retail store businesses.
  - Outcomes: out-P9gZXJq1
- **Retail demand assumptions should connect store disruption to margin impact, not only same-store sales or traffic changes.**
  - Evidence: 1 accepted failure verdict(s) across SBUX / Demand
  - Representative context: The filing disclosed lost revenues and incremental wages and benefits that significantly lowered operating margins for retail store businesses.
  - Outcomes: out-urqMFWZx
- **Consumer-staples supply-chain assumptions should include labor availability and plant operating capacity, not only logistics and input availability.**
  - Evidence: 1 accepted failure verdict(s) across PEP / Supply chain
  - Representative context: The filing disclosed reduced manufacturing capacity at certain facilities and increased employee, sanitation, and other COVID-related operating costs.
  - Outcomes: out-gHyrXMxQ
- **AI accelerator inventory assumptions should treat export-control shocks as channel-risk events because regulatory access can instantly impair demand and purchase commitments.**
  - Evidence: 1 accepted failure verdict(s) across NVDA / Inventory and channel
  - Representative context: The fiscal 2026 filing disclosed a $4.5 billion charge associated with H20 excess inventory and purchase obligations after new China export license requirements diminished demand.
  - Outcomes: out-VxXuqAUS
- **Platform macro assumptions should translate broad economic pressure into customer budget behavior, especially ad-spend elasticity.**
  - Evidence: 1 accepted failure verdict(s) across META / Macro and foreign exchange
  - Representative context: The filing tied reduced advertising demand in 2022 to reduced marketer spending caused by a more challenging macroeconomic environment.
  - Outcomes: out-NwPZo75s
- **Regulatory and platform-policy assumptions should track measurement and targeting degradation because tooling limits can become revenue pressure before direct fines or bans appear.**
  - Evidence: 1 accepted failure verdict(s) across META / Regulation and legal
  - Representative context: The 2022 filing disclosed advertising revenue was affected by targeting and measurement limitations arising from iOS changes and the regulatory environment.
  - Outcomes: out-bbr3AY3V
- **Advertising demand assumptions should track marketer budget pullbacks separately from user engagement because revenue can weaken even when the platform remains central.**
  - Evidence: 1 accepted failure verdict(s) across META / Demand
  - Representative context: The 2022 filing disclosed advertising revenue was impacted by reduced advertising demand compared with 2021, driven partly by reduced marketer spending.
  - Outcomes: out-jUaaxLu9
- **Competition assumptions should be reviewed when management ties category weakness to competitive pressure and named customer-market weakness.**
  - Evidence: 1 accepted failure verdict(s) across CSCO / Competition
  - Representative context: The filing disclosed that the competitive environment negatively impacted certain Infrastructure Platforms offerings and that service-provider weakness was expected to remain uncertain.
  - Outcomes: out-v6eDv9xd
- **Liquidity assumptions for capital-intensive telecoms should track interest-expense sensitivity when rates rise, not only near-term cash availability.**
  - Evidence: 1 accepted failure verdict(s) across VZ / Liquidity
  - Representative context: The 2023 filing disclosed increased interest expenses related to rising interest rates, along with direct-cost inflation and lower EPS/guidance.
  - Outcomes: out-Ei2WCFV6
- **Telecom macro assumptions should connect inflation to network operating costs, margin compression, and guidance revisions.**
  - Evidence: 1 accepted failure verdict(s) across VZ / Macro and foreign exchange
  - Representative context: The 2023 filing disclosed inflation-driven direct cost increases that, together with competition, reduced earnings per share and caused Verizon to lower growth expectations and financial guidance for 2022.
  - Outcomes: out-sbU8GNki
- **Adjacent R&D bets should be tracked through impairment language because small charges can reveal which innovation options failed to compound.**
  - Evidence: 1 accepted failure verdict(s) across PM / AI, R&D, and technology
  - Representative context: The 2025 filing disclosed a $27 million impairment charge primarily reflecting impairment of non-amortizable intangible assets related to an in-process R&D project.
  - Outcomes: out-cS3hKxNW
- **Manufacturing-footprint assumptions should track restructuring and exit-cost language, not only raw-material or logistics disruptions.**
  - Evidence: 1 accepted failure verdict(s) across PM / Supply chain
  - Representative context: The filing disclosed pre-tax asset impairment and exit costs tied to global manufacturing infrastructure optimization.
  - Outcomes: out-umHxDk8F
- **Memory demand assumptions should track end-market mix shifts; aggregate demand can hide painful reallocations between weakening and strengthening markets.**
  - Evidence: 1 accepted failure verdict(s) across MU / Demand
  - Representative context: The 2020 filing disclosed that Micron shifted supply from markets with demand declines, such as smartphones, to markets with demand increases, such as data centers.
  - Outcomes: out-T3eXcgML
- **Channel inventory corrections can convert end-market weakness into a distinct company-level revenue failure signal.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Inventory and channel
  - Representative context: The 2023 10-K disclosed Client segment revenue decline caused by weak PC macro conditions and inventory correction actions across the PC supply chain.
  - Outcomes: out-a6jEU45k
- **Semiconductor macro assumptions should be tested against segment-level revenue deterioration, not only company-wide demand language.**
  - Evidence: 1 accepted failure verdict(s) across AMD / Macro and foreign exchange
  - Representative context: The 2023 10-K disclosed a Client segment revenue decline from weak PC market macroeconomic conditions and inventory correction actions across the PC supply chain in the second half of 2022.
  - Outcomes: out-vm5Za9Qq
- **Macro assumptions for manufacturers should connect inflation language to pricing actions and margin pressure, not treat macro risk as abstract background noise.**
  - Evidence: 1 accepted failure verdict(s) across TSLA / Macro and foreign exchange
  - Representative context: The 2022 10-Q disclosed inflationary pressure tied to global economic conditions and supply-chain disruptions, with cost-structure impact contributing to product pricing adjustments.
  - Outcomes: out-9gcDshGU
- **Manufacturing scale assumptions should track whether supply-chain disruption is forcing price increases, not only whether production volumes continue growing.**
  - Evidence: 1 accepted failure verdict(s) across TSLA / Supply chain
  - Representative context: The 2022 10-Q disclosed inflation from supply-chain disruption, increased shipping, raw-material, and labor costs, and pricing adjustments despite a continued focus on reducing manufacturing costs.
  - Outcomes: out-99MnKT3H
- **Supply-chain assumptions should be downgraded when shortage language moves from possible supplier dependency to disclosed effects on lead times, cost, and customer demand fulfilment.**
  - Evidence: 1 accepted failure verdict(s) across CSCO / Supply chain
  - Representative context: The 2023 filing disclosed component shortages, including market shortages of semiconductor and other component supply, that affected operations, lead times, supply cost, and Cisco's ability to meet customer demand.
  - Outcomes: out-X2u99tro
- **Macro assumptions for diversified semiconductor companies should track management's disclosed forecasting impairment, not just reported revenue declines.**
  - Evidence: 1 accepted failure verdict(s) across AVGO / Macro and foreign exchange
  - Representative context: The filing disclosed that adverse global economic conditions have caused or exacerbated slowdowns in Broadcom's markets, adversely affected business and results of operations, and made revenue, margin, and expense forecasting harder.
  - Outcomes: out-Thryg6qv
- **Marketplace liquidity assumptions should be reviewed when transaction volume collapses, not only when debt or cash-balance stress appears.**
  - Evidence: 1 accepted failure verdict(s) across BKNG / Liquidity
  - Representative context: The May 2020 10-Q disclosed a material decline in gross travel bookings, room nights, total revenues, net income, and cash flow from operations, with April 2020 newly booked room nights down over 85% year over year.
  - Outcomes: out-VoaZ4Yv9
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

## Current Bets

Open company/theme assumptions. Staged evidence raises review pressure; it does not count as failure.

- **NFLX / Demand** — fresh, 84 observation(s), review pressure 5, latest 2026-04-17
  - Assumption: asm-bmBJ3gyo
- **PM / Geopolitics and tariffs** — fresh, 54 observation(s), review pressure 4, latest 2026-04-24
  - Assumption: asm-qsuv2tV3
- **MSFT / Demand** — fresh, 84 observation(s), review pressure 2, latest 2026-04-29
  - Assumption: asm-GpdfFh1C
- **VZ / Demand** — fresh, 84 observation(s), review pressure 1, latest 2026-05-01
  - Assumption: asm-ktbpwdZ5
- **KO / Demand** — fresh, 84 observation(s), review pressure 1, latest 2026-04-30
  - Assumption: asm-5B3UtjSr
- **MSFT / Liquidity** — fresh, 64 observation(s), review pressure 1, latest 2026-04-29
  - Assumption: asm-pvTxdvNS
- **TMUS / Demand** — fresh, 65 observation(s), review pressure 1, latest 2026-04-28
  - Assumption: asm-NyHDPWBk
- **TJX / Geopolitics and tariffs** — fresh, 15 observation(s), review pressure 1, latest 2026-03-31
  - Assumption: asm-GtYjUncm
- **MU / Supply chain** — fresh, 84 observation(s), review pressure 1, latest 2026-03-19
  - Assumption: asm-TN54hhrX
- **HD / Demand** — fresh, 82 observation(s), review pressure 1, latest 2026-03-18
  - Assumption: asm-XBSku9xU
- **WMT / Inventory and channel** — fresh, 38 observation(s), review pressure 1, latest 2026-03-13
  - Assumption: asm-rLgC687v
- **WBD / Demand** — fresh, 82 observation(s), review pressure 1, latest 2026-02-27
  - Assumption: asm-GY8sY5ge

## Outcome Review Queue

- **KO** 2022-10-26: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-255h14jf
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-255h14jf"], confirm: true })`
  - Source: sec-company://0000021344/0000021344-22-000042#part-i-item-2:theme:geopolitics-tariffs:outcome
  - During the nine months ended September 30, 2022, the Company recorded an other-than-temporary impairment charge of $96 million related to an equity method investee in Russia. As of September 30, 2022, the remaining carrying value of the Company's assets related to Russia and Ukraine was less than 0.
- **MU** 2024-10-04: 1 candidate(s), Supply chain
  - Candidate IDs: cout-n8rgakW6
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-n8rgakW6"], confirm: true })`
  - Source: sec-company://0000723125/0000723125-24-000027#item-7:theme:supply-chain:outcome
  - We believe this approach to node migration and consequent wafer capacity reduction was adopted across the industry. We recognized period costs from fabrication facility underutilization of $382 million in 2023 and $165 million in the first quarter of 2024 due to wafer start reductions. Subsequently,
- **PM** 2023-02-10: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-fynsGdQk
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-fynsGdQk"], confirm: true })`
  - Source: sec-company://0001413329/0001413329-23-000025#item-7:theme:geopolitics-tariffs:outcome
  - We recorded pre-tax charges related to the war in Ukraine of approximately $151 million in 2022 (including humanitarian efforts). This includes charges in Russia related to the cancellation of the planned launch of
- **PM** 2022-10-27: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-4pUPM9nU
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-4pUPM9nU"], confirm: true })`
  - Source: sec-company://0001413329/0001413329-22-000114#part-i-item-2:theme:geopolitics-tariffs:outcome
  - We recorded pre-tax charges related to the war in Ukraine of approximately $6 million in the third quarter of 2022 and approximately $128 million in the September year-to-date period. This includes charges in Russia related to the cancellation of the planned launch of
- **PM** 2022-07-29: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-yBsxhpgg
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-yBsxhpgg"], confirm: true })`
  - Source: sec-company://0001413329/0001413329-22-000072#part-i-item-2:theme:geopolitics-tariffs:outcome
  - We recorded charges related to the war in Ukraine of approximately $80 million in the second quarter of 2022 and approximately $122 million in the first half of 2022. This includes charges in Russia related to the cancellation of the planned launch of
- **WBD** 2025-05-08: 1 candidate(s), Demand
  - Candidate IDs: cout-2gso7KJ6
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-2gso7KJ6"], confirm: true })`
  - Source: sec-company://0001437107/0001437107-25-000096#part-i-item-2:theme:demand:outcome
  - Costs of revenues decreased 15% for the three months ended March 31, 2025, primarily attributable to a 41% decrease in theatrical product content expense, as a result of lower film costs commensurate with lower theatrical product revenue and lower payments to partners and participants, and a 66% dec
- **MCD** 2016-08-04: 1 candidate(s), Liquidity
  - Candidate IDs: cout-UkCnhUp1
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-UkCnhUp1"], confirm: true })`
  - Source: sec-company://0000063908/0000063908-16-000142#part-i-item-2:theme:liquidity:outcome
  - Results for the quarter and six months benefited from stronger operating performance and higher gains on sales of restaurant businesses. Both periods were impacted by approximately $230 million, or $0.20 per share, of strategic charges, consisting primarily of non-cash impairment charges incurred in
- **PM** 2024-04-26: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-fHbC6VNw
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-fHbC6VNw"], confirm: true })`
  - Source: sec-company://0001413329/0001413329-24-000087#part-i-item-2:theme:geopolitics-tariffs:outcome
  - – Following the termination of a distribution arrangement in the Middle East, we recorded a pre-tax charge of $80 million in the first quarter of 2023 (representing $70 million net of income tax and a diluted EPS charge of $0.04 per share). The pre-tax charge was recorded as a reduction of net reven
- **TJX** 2022-03-30: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-CFFZUQMx
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-CFFZUQMx"], confirm: true })`
  - Source: sec-company://0000109198/0000109198-22-000008#item-7:theme:geopolitics-tariffs:outcome
  - We account for our investment in Familia using the equity method of accounting. As of January 29, 2022, the carrying value of our investment in Familia was $186 million, which reflects the revaluing of the investment from Russian rubles to the U.S. dollar, resulting in a cumulative translation loss
- **TMUS** 2016-10-24: 1 candidate(s), Demand
  - Candidate IDs: cout-mibPR2Sf
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-mibPR2Sf"], confirm: true })`
  - Source: sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:demand:outcome
  - During the quarter ended and subsequent to September 30, 2016, a handset Original Equipment Manufacturer ("OEM") announced recalls on certain of its smartphone devices. As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable
- **TMUS** 2016-10-24: 1 candidate(s), Customer and platform dependency
  - Candidate IDs: cout-ybHov4a1
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-ybHov4a1"], confirm: true })`
  - Source: sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:customer-platform-dependency:outcome
  - As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable value. The OEM has agreed to reimburse T-Mobile, as such, we have recorded an amount due from the OEM as an offset to the loss recorded in
- **VZ** 2020-04-27: 1 candidate(s), Demand
  - Candidate IDs: cout-tygeYzjs
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-tygeYzjs"], confirm: true })`
  - Source: sec-company://0000732712/0000732712-20-000027#part-i-item-2:theme:demand:outcome
  - In Verizon Media, we experienced a decline in advertising and search revenue as advertisers paused or canceled campaigns during this period, and users searched for fewer commercial terms, providing less opportunity for monetization.
- **MSFT** 2016-10-20: 1 candidate(s), Demand
  - Candidate IDs: cout-8zSNs1oh
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-8zSNs1oh"], confirm: true })`
  - Source: sec-company://0000789019/0001193125-16-742796#part-i-item-2:theme:demand:outcome
  - Operating income included an unfavorable foreign currency impact of 5%. Gross margin decreased $563 million or 4%, driven by higher cost of revenue. Gross margin included an unfavorable
- **NFLX** 2025-07-18: 1 candidate(s), Demand
  - Candidate IDs: cout-tuYofcfL
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-tuYofcfL"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-25-000323#part-i-item-2:theme:demand:outcome
  - r the three months ended June 30, 2025 increased $978 million as compared to the prior comparative period, primarily due to a $1,172 million increase in operating income, driven by a $1,520 million increase in revenues and partially offset by a $151 million increase in cost of revenues primarily due
- **NFLX** 2025-04-18: 1 candidate(s), Demand
  - Candidate IDs: cout-tgtYW1HH
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-tgtYW1HH"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-25-000176#part-i-item-2:theme:demand:outcome
  - increased $558 million as compared to the prior comparative period, primarily due to a $714 million increase in operating income, driven by a $1,172 million increase in revenues and partially offset by a $286 million increase in cost of revenues primarily due to the increase in content amortization.
- **WMT** 2017-03-31: 1 candidate(s), Inventory and channel
  - Candidate IDs: cout-22Ztexb6
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-22Ztexb6"], confirm: true })`
  - Source: sec-company://0000104169/0000104169-17-000021#item-1a:theme:inventory-channel:outcome
  - In light of the substantial premiums payable for insurance coverage for losses caused by certain natural disasters, such as hurricanes, cyclones, typhoons, tropical storms, earthquakes, floods and tsunamis, as well as the limitations on available coverage for such losses, we have chosen to be primar
- **HD** 2024-08-20: 1 candidate(s), Demand
  - Candidate IDs: cout-xqjTni51
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-xqjTni51"], confirm: true })`
  - Source: sec-company://0000354950/0000354950-24-000201#part-i-item-2:theme:demand:outcome
  - Depreciation and amortization for the second quarter of fiscal 2024 increased $85 million, or 13.0%, to $738 million from $653 million for the second quarter of fiscal 2023. As a percentage of net sales, depreciation and amortization was 1.7% for the second quarter of fiscal 2024 compared to 1.5% fo
- **MSFT** 2020-04-29: 1 candidate(s), Liquidity
  - Candidate IDs: cout-sYG7DHXL
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-sYG7DHXL"], confirm: true })`
  - Source: sec-company://0000789019/0001564590-20-019706#part-i-item-2:theme:liquidity:outcome
  - Sales and marketing expenses increased $346 million or 8%, driven by investments in LinkedIn and commercial sales, as well as an increase in bad debt expense.
- **NFLX** 2026-04-17: 1 candidate(s), Demand
  - Candidate IDs: cout-EdbcVB6t
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-EdbcVB6t"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil
- **NFLX** 2025-10-22: 1 candidate(s), Demand
  - Candidate IDs: cout-ZnjYmKtK
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-ZnjYmKtK"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-25-000406#part-i-item-2:theme:demand:outcome
  - r the three months ended September 30, 2025 increased $183 million as compared to the prior comparative period, primarily due to a $339 million increase in operating income, driven by a $1,686 million increase in revenues and partially offset by a $1,044 million increase in cost of revenues primaril
- **NFLX** 2024-04-22: 1 candidate(s), Demand
  - Candidate IDs: cout-SoKXEF1c
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-SoKXEF1c"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-24-000128#part-i-item-2:theme:demand:outcome
  - The increase in cost of revenues for the three months ended March 31, 2024 as compared to the three months ended March 31, 2023 is primarily due to a $211 million increase in content amortization relating to our existing and new content, partially offset by a $38 million decrease in other cost of re
- **KO** 2024-02-20: 1 candidate(s), Demand
  - Candidate IDs: cout-pLrEFLiU
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-pLrEFLiU"], confirm: true })`
  - Source: sec-company://0000021344/0000021344-24-000009#item-1a:theme:demand:outcome
  - Geopolitical instability may also lead to heightened security risk, impacting employee safety and/or damage to infrastructure or our assets. At times, we have faced product boycotts resulting from activism, which have reduced demand for our products. Restrictions on our ability to transfer earnings
- **MAR** 2020-11-06: 1 candidate(s), Liquidity
  - Candidate IDs: cout-v6UCJTdD
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-v6UCJTdD"], confirm: true })`
  - Source: sec-company://0001048286/0001628280-20-015909#part-ii-item-1a:theme:liquidity:outcome
  - we recorded a provision for credit losses of $
- **MSFT** 2017-04-27: 1 candidate(s), Demand
  - Candidate IDs: cout-quUySYaJ
  - Apply after review: `company.apply_outcomes({ run_id: "sec-10y-100-company", outcome_candidate_ids: ["cout-quUySYaJ"], confirm: true })`
  - Source: sec-company://0000789019/0001564590-17-007547#part-i-item-2:theme:demand:outcome
  - Operating income included an unfavorable foreign currency impact of 3%. Gross margin increased $1.2 billion or 10%, driven by higher revenue, offset in part by higher cost of revenue.

## Accepted Pass/Fail Verdicts

- **FAIL** NVDA / Demand: asm-QncdPdYh via out-4GsRMjM5
  - In the context of **NVDA disclosed demand risk in 10-K 2016-03-17.**, facing **If we are unable to successfully compete in our target markets, our revenue and financial results will be adversely impacted**, we assume **NVDA can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Regulatory permission is not equivalent to realized demand; export-control reviews should track revenue and shipment evidence after licenses are granted.
- **FAIL** AAPL / Geopolitics and tariffs: asm-6eLPnrAX via out-XVDcouNG
  - In the context of **AAPL disclosed geopolitics and tariffs risk in 10-Q 2016-01-27.**, facing **Greater China**, we assume **AAPL can manage geopolitics and tariffs risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Geographic concentration is not just abstract geopolitical boilerplate; when a shock closes factories, logistics, and retail channels together, it can directly impair supply and demand in the same quarter.
- **FAIL** AMD / Demand: asm-MM6Hc6gr via out-8fYekrdT
  - In the context of **AMD disclosed demand risk in 10-K 2016-02-18.**, facing **Intel's market share, margins and significant financial resources enable it to market its products aggressively, to target our customers and our channel partners with special incentives and to influence customers who do business with us. These aggressive activities have in the past and are likely in the future to result in lower unit sales and a lower average selling price for many of our products and adversely affect our margins and profitability.**, we assume **AMD can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: For semiconductor companies, demand assumptions should be tested against channel inventory corrections, not just end-customer demand language.
- **FAIL** AMD / Cloud and data center capacity: asm-Vc3UnXrd via out-dkrWjofL
  - In the context of **AMD disclosed cloud and data center capacity risk in 10-K 2016-02-18.**, facing **Pursuant to the WSA, we are required to purchase all of our microprocessor and APU product requirements, and a certain portion of our GPU product requirements, from GF with limited exceptions. If GF is unable to achieve anticipated manufacturing yields, remain competitive using or implementing advanced leading-edge process technologies needed to manufacture future generations of our products, manufacture our products on a timely basis at competitive prices or meet our capacity requirements, then we may experience delays in product launches, supply shortages for certain products or increased costs and our business could be materially adversely affected.**, we assume **AMD can manage cloud and data center capacity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Export controls can turn a high-growth AI hardware bet into an inventory impairment risk; the ledger should connect geopolitics, capacity, and channel assumptions instead of reviewing them separately.
- **FAIL** BKNG / Demand: asm-SzfgJvKs via out-A5GENqAJ
  - In the context of **BKNG disclosed demand risk in 10-K 2016-02-17.**, facing **Travel, including accommodation (including hotels, bed and breakfasts, hostels, apartments, vacation rentals and other properties), rental car and airline ticket reservations, is dependent on discretionary spending levels. As a result, sales of travel services tend to decline during general economic downturns and recessions when consumers engage in less discretionary spending, are concerned about unemployment or inflation, have reduced access to credit or experience other concerns or effects that reduce their ability or willingness to travel. For example, the recent worldwide recession led to a weakening in the fundamental demand for our travel reservation services and an increase in the number of consumers who canceled existing travel reservations with us.**, we assume **BKNG can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Platform demand assumptions for travel marketplaces can fail quickly when the underlying activity is externally restricted; review should focus on transaction-volume collapse before balance-sheet stress appears.
- **FAIL** BKNG / Liquidity: asm-r3YunLyG via out-VoaZ4Yv9
  - In the context of **BKNG disclosed liquidity risk in 10-K 2016-02-17.**, facing **Additional risks and uncertainties not presently known to us or that we currently believe are immaterial may also impair our business, results of operations or financial condition. If any of the following risks occur, our business, financial condition, operating results and cash flows could be materially adversely affected.**, we assume **BKNG can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Marketplace liquidity assumptions should be reviewed when transaction volume collapses, not only when debt or cash-balance stress appears.
- **FAIL** AVGO / Macro and foreign exchange: asm-v2qMGCiq via out-Thryg6qv
  - In the context of **AVGO disclosed macro and foreign exchange risk in 10-K 2018-12-21.**, facing **These forward-looking statements may include projections of financial information; statements about historical results that may suggest trends for our business; statements of the plans, strategies, and objectives of management for future operations; statements of expectation or belief regarding future events (including any acquisitions we may make), technology developments, our products, product sales, expenses, liquidity, cash flow and growth rates, or enforceability of our intellectual property rights; and the effects of seasonality on our business. Such statements are based on current expectations, estimates, forecasts and projections of our or industry performance and macroeconomic conditions, based on management's judgment, beliefs, current trends and market conditions, and involve risks and uncertainties that may cause actual results to differ materially from those contained in the**, we assume **AVGO can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Macro assumptions for diversified semiconductor companies should track management's disclosed forecasting impairment, not just reported revenue declines.
- **FAIL** CSCO / Supply chain: asm-SrGYCsLi via out-X2u99tro
  - In the context of **CSCO disclosed supply chain risk in 10-Q 2016-02-18.**, facing **Manufacturing and customer lead times**, we assume **CSCO can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Supply-chain assumptions should be downgraded when shortage language moves from possible supplier dependency to disclosed effects on lead times, cost, and customer demand fulfilment.
- **FAIL** TSLA / Supply chain: asm-zXRB5TcJ via out-99MnKT3H
  - In the context of **TSLA disclosed supply chain risk in 10-K 2016-02-24.**, facing **We design, develop, manufacture and sell high-performance fully electric vehicles and energy storage products. We have established our own network of vehicle sales and service centers and Supercharger stations globally to accelerate the widespread adoption of electric vehicles.**, we assume **TSLA can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Manufacturing scale assumptions should track whether supply-chain disruption is forcing price increases, not only whether production volumes continue growing.
- **FAIL** TSLA / Macro and foreign exchange: asm-UGMSaHwm via out-9gcDshGU
  - In the context of **TSLA disclosed macro and foreign exchange risk in 10-Q 2016-05-10.**, facing **Foreign currency translation adjustment**, we assume **TSLA can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Macro assumptions for manufacturers should connect inflation language to pricing actions and margin pressure, not treat macro risk as abstract background noise.
- **FAIL** AMD / Macro and foreign exchange: asm-twCPY7xY via out-vm5Za9Qq
  - In the context of **AMD disclosed macro and foreign exchange risk in 10-K 2016-02-18.**, facing **its business in the future; acquisitions, divestitures and/or joint ventures could disrupt its business, harm its financial condition and operating results or dilute, or adversely affect the price of its common stock; AMD's business is dependent upon the proper functioning of its internal business processes and information systems and modification or interruption of such systems may disrupt its business, processes and internal controls; data breaches and cyber-attacks could compromise AMD's intellectual property or other sensitive information, be costly to remediate and cause significant damage to its business and reputation; AMD's operating results are subject to quarterly and seasonal sales patterns; if essential equipment, materials or manufacturing processes are not available to manufacture its products, AMD could be materially adversely affected; if AMD's products are not compatible**, we assume **AMD can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Semiconductor macro assumptions should be tested against segment-level revenue deterioration, not only company-wide demand language.
- **FAIL** AMD / Inventory and channel: asm-cX6hzDj2 via out-a6jEU45k
  - In the context of **AMD disclosed inventory and channel risk in 10-K 2016-02-18.**, facing **Intel also dominates the computer system platform, which includes core logic chipsets, graphics chips, motherboards and other components necessary to assemble a computer system. OEMs that purchase microprocessors for computer systems are highly dependent on Intel, less innovative on their own and, to a large extent, are distributors of Intel technology. Additionally, Intel is able to drive de facto standards and specifications for x86 microprocessors that could cause us and other companies to have delayed access to such standards.**, we assume **AMD can manage inventory and channel risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Channel inventory corrections can convert end-market weakness into a distinct company-level revenue failure signal.
- **FAIL** MU / Demand: asm-PNGucCzS via out-T3eXcgML
  - In the context of **MU disclosed demand risk in 10-Q 2016-01-08.**, facing **Our broad portfolio of high-performance memory technologies, including DRAM, NAND Flash, and NOR Flash, is the basis for solid-state drives, modules, multi-chip packages, and other system solutions. Our memory solutions enable the world's most innovative computing, consumer, enterprise storage, networking, mobile, embedded, and automotive applications. We market our products through our internal sales force, independent sales representatives, and distributors, primarily to OEMs and retailers located around the world.**, we assume **MU can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Memory demand assumptions should track end-market mix shifts; aggregate demand can hide painful reallocations between weakening and strengthening markets.
- **FAIL** PM / Supply chain: asm-qcAhVDVt via out-umHxDk8F
  - In the context of **PM disclosed supply chain risk in 10-K 2016-02-17.**, facing **Philip Morris International Inc. is a Virginia holding company incorporated in 1987. Our subsidiaries and affiliates and their licensees are engaged in the manufacture and sale of cigarettes, other tobacco products and other nicotine-containing products in markets outside of the United States of America. Our products are sold in more than 180 markets, and in many of these markets they hold the number one or number two market share position.**, we assume **PM can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Manufacturing-footprint assumptions should track restructuring and exit-cost language, not only raw-material or logistics disruptions.
- **FAIL** PM / AI, R&D, and technology: asm-rBkykPVM via out-cS3hKxNW
  - In the context of **PM disclosed ai, r&d, and technology risk in 10-K 2017-02-14.**, facing **We compete primarily on the basis of product quality, brand recognition, brand loyalty, taste, innovation, packaging, service, marketing, advertising and price. We are subject to highly competitive conditions in all aspects of our business.**, we assume **PM can manage ai, r&d, and technology risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Adjacent R&D bets should be tracked through impairment language because small charges can reveal which innovation options failed to compound.
- **FAIL** VZ / Macro and foreign exchange: asm-J2mS7Cp9 via out-sbU8GNki
  - In the context of **VZ disclosed macro and foreign exchange risk in 10-Q 2016-04-28.**, facing **Foreign currency translation adjustments**, we assume **VZ can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Telecom macro assumptions should connect inflation to network operating costs, margin compression, and guidance revisions.
- **FAIL** VZ / Liquidity: asm-grGzqr3M via out-Ei2WCFV6
  - In the context of **VZ disclosed liquidity risk in 10-K 2016-02-23.**, facing **acquired 100% ownership of Verizon Wireless. The consideration paid was primarily comprised of cash and Verizon common stock.**, we assume **VZ can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Liquidity assumptions for capital-intensive telecoms should track interest-expense sensitivity when rates rise, not only near-term cash availability.
- **FAIL** CSCO / Competition: asm-x5MTksh5 via out-v6eDv9xd
  - In the context of **CSCO disclosed competition risk in 10-Q 2016-02-18.**, facing **We see our customers, in every industry, increasingly using technology—and, specifically, the network—to grow their business, drive efficiencies, and try to gain a competitive advantage. In this increasingly digital world, data is the most strategic asset and is increasingly distributed across every organization and ecosystem—on customer premises, at the edge of the network, and in the cloud.**, we assume **CSCO can manage competition risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Competition assumptions should be reviewed when management ties category weakness to competitive pressure and named customer-market weakness.
- **FAIL** META / Demand: asm-s331HAs6 via out-jUaaxLu9
  - In the context of **META disclosed demand risk in 10-K 2016-01-28.**, facing **If we fail to retain existing users or add new users, or if our users decrease their level of engagement with our products, our revenue, financial results, and business may be significantly harmed.**, we assume **META can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Advertising demand assumptions should track marketer budget pullbacks separately from user engagement because revenue can weaken even when the platform remains central.
- **FAIL** META / Regulation and legal: asm-Jxt8cx8d via out-bbr3AY3V
  - In the context of **META disclosed regulation and legal risk in 10-K 2016-01-28.**, facing **there are adverse changes in our products that are mandated by legislation, regulatory authorities, or litigation, including settlements or consent decrees;**, we assume **META can manage regulation and legal risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Regulatory and platform-policy assumptions should track measurement and targeting degradation because tooling limits can become revenue pressure before direct fines or bans appear.
- **FAIL** META / Macro and foreign exchange: asm-H79M9Vrk via out-NwPZo75s
  - In the context of **META disclosed macro and foreign exchange risk in 10-K 2016-01-28.**, facing **the impact of macroeconomic conditions, whether in the advertising industry in general, or among specific types of marketers or within particular geographies.**, we assume **META can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Platform macro assumptions should translate broad economic pressure into customer budget behavior, especially ad-spend elasticity.
- **FAIL** NVDA / Inventory and channel: asm-XtUoWXU4 via out-VxXuqAUS
  - In the context of **NVDA disclosed inventory and channel risk in 10-K 2016-03-17.**, facing **For sales to certain distributors with rights of return for which the level of returns cannot be reasonably estimated, our policy is to defer recognition of revenue and related cost of revenue until the distributors resell the product and, in some cases, when customer return rights lapse.**, we assume **NVDA can manage inventory and channel risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: AI accelerator inventory assumptions should treat export-control shocks as channel-risk events because regulatory access can instantly impair demand and purchase commitments.
- **FAIL** PEP / Supply chain: asm-2ZCThYZi via out-gHyrXMxQ
  - In the context of **PEP disclosed supply chain risk in 10-K 2016-02-11.**, facing **perception of social media posts or other information disseminated by us or our employees, agents, customers, suppliers, bottlers, distributors, joint venture partners or other third parties; consumer perception of our employees, agents, customers, suppliers, bottlers, distributors, joint venture partners or other third parties or the business practices of such parties; or a downturn in economic conditions. Any of these changes may reduce consumers' willingness to purchase our products.**, we assume **PEP can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Consumer-staples supply-chain assumptions should include labor availability and plant operating capacity, not only logistics and input availability.
- **FAIL** SBUX / Demand: asm-b5wJFCYT via out-urqMFWZx
  - In the context of **SBUX disclosed demand risk in 10-Q 2016-01-26.**, facing **Certain statements herein, including statements regarding trends in or expectations relating to the expected effects of our initiatives and plans, as well as trends in or expectations regarding earnings per share, revenues, operating margins, comparable store sales, sales leverage, sales growth, profitability, expenses, dividends, share repurchases, other financial results, the integration of Starbucks Japan and the anticipated gains and costs related to the acquisition of Starbucks Japan, capital expenditures, investments in our business and partners, product innovation, offerings and distribution, scaling and expansion of international operations, foreign currency translation, the contribution of the China/Asia Pacific segment to overall company revenue, growth of China into one of our largest international markets, continued disciplined licensed store expansion and focus on the custom**, we assume **SBUX can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Retail demand assumptions should connect store disruption to margin impact, not only same-store sales or traffic changes.
- **FAIL** SBUX / Inventory and channel: asm-HmKU6471 via out-P9gZXJq1
  - In the context of **SBUX disclosed inventory and channel risk in 10-Q 2016-01-26.**, facing **In July 2015, the FASB issued guidance on the subsequent measurement of inventory, which changes the measurement from lower of cost or market to lower of cost and net realizable value. The guidance will require prospective application at the beginning of our first quarter of fiscal 2018, but permits adoption in an earlier period.**, we assume **SBUX can manage inventory and channel risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Perishable retail inventory assumptions should watch write-off language because demand shocks can convert quickly into margin losses.
- **FAIL** SBUX / Supply chain: asm-JaYwNZmb via out-xsQzN5r7
  - In the context of **SBUX disclosed supply chain risk in 10-K 2016-11-18.**, facing **Additionally, our business strategy, including our plans for new stores, foodservice, branded products and other initiatives, relies significantly on a variety of business partners, including licensee and joint venture relationships, particularly in our international markets, and third party manufacturers, distributors and retailers, particularly in our international Channel Development business. Licensees and foodservice operators are often authorized to use our logos and provide branded food, beverage and other products directly to customers.**, we assume **SBUX can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Retail supply-chain assumptions should include supplier-obligation rigidity because fixed commitments can amplify demand shocks.
- **FAIL** AAPL / Supply chain: asm-yY6f8ynA via out-1ZsB57E2
  - In the context of **AAPL disclosed supply chain risk in 10-Q 2016-01-27.**, facing **The Company designs, manufactures and markets mobile communication and media devices, personal computers and portable digital music players, and sells a**, we assume **AAPL can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Hardware supply-chain assumptions should track outsourcing-partner geography because localized disruptions can create global product shortages.
- **FAIL** AAPL / Customer and platform dependency: asm-hPkWQPGc via out-yu9stwSH
  - In the context of **AAPL disclosed customer and platform dependency risk in 10-Q 2016-01-27.**, facing **, Mac App Store, TV App Store, iBooks Store and Apple Music (collectively Internet Services). The Company sells its products worldwide through its retail stores,**, we assume **AAPL can manage customer and platform dependency risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Channel-dependency assumptions should treat retail and partner access as load-bearing when regional shutdowns can directly suppress sales.
- **FAIL** AMD / Geopolitics and tariffs: asm-tFb8q31Y via out-BqJTAbxZ
  - In the context of **AMD disclosed geopolitics and tariffs risk in 10-Q 2016-04-28.**, facing **The forward-looking statements relate to, among other things: demand for AMD's products; the growth, change and competitive landscape of the markets in which AMD participates; future restructuring activities; the nature and extent of AMD's future payments to GLOBALFOUNDRIES Inc. (GF) and the materiality of these payments; the materiality of AMD's future purchases from GF; statements regarding the proposed joint ventures (the JVs) between AMD and Nantong Fujitsu Microelectronics Co. Ltd., including the JVs' expected future performance (including expected results of operations and financial guidance); benefits from the proposed JVs; the JVs' future financial condition, operating results, strategy and plans; statements about regulatory and other approvals; the closing date for the proposed transaction and the amount to be received at closing; the expected amounts to be received by AMD under**, we assume **AMD can manage geopolitics and tariffs risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Semiconductor geopolitics assumptions should track export-control inventory charges because policy changes can immediately convert product roadmaps into stranded assets.
- **FAIL** CSCO / Regulation and legal: asm-g69CFqyf via out-4D4Rto1C
  - In the context of **CSCO disclosed regulation and legal risk in 10-Q 2016-02-18.**, facing **Changes in tax laws or accounting rules, or interpretations thereof**, we assume **CSCO can manage regulation and legal risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Regulation and legal assumptions should track settlement charges when management connects them to margin movement, not only litigation headlines or final judgments.
- **FAIL** CSCO / Demand: asm-apaexpGF via out-TiY265ie
  - In the context of **CSCO disclosed demand risk in 10-Q 2016-02-18.**, facing **we experienced product revenue declines in the public sector and enterprise markets. We believe our sales in the enterprise market were impacted by uncertainty in the macro environment, which led to a slowdown in customer spending, and by currency impacts.**, we assume **CSCO can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Infrastructure demand assumptions should track customer digestion of prior shipments because channel absorption can turn apparent backlog strength into later revenue weakness.
- **FAIL** DIS / Regulation and legal: asm-K8rwQyCS via out-HR8ZaBsU
  - In the context of **DIS disclosed regulation and legal risk in 10-Q 2019-05-08.**, facing **in the prior-year quarter was due to insurance recoveries related to a legal matter.**, we assume **DIS can manage regulation and legal risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Experience-business regulation assumptions should track operating restrictions and compliance-cost burdens because rules can affect both revenue availability and cost structure.
- **FAIL** DIS / Macro and foreign exchange: asm-13tyLWKi via out-oGp6QiUf
  - In the context of **DIS disclosed macro and foreign exchange risk in 10-Q 2019-05-08.**, facing **due to the consolidation of 21CF and Hulu, higher affiliate fees and growth in guest spending at our theme parks and resorts, partially offset by lower theatrical distribution revenue and a decrease in program sales at our Media Networks segment. Service revenues reflected an approximate 1 percentage point decrease due to an unfavorable movement of the U.S. dollar against major currencies including the impact of our hedging program (FX Impact).**, we assume **DIS can manage macro and foreign exchange risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Experience-business macro assumptions should track cost inflation in guest-facing merchandise, food, and beverage because demand recovery can still carry margin pressure.
- **FAIL** MO / Supply chain: asm-BmMCyKey via out-pHzkjaqp
  - In the context of **MO disclosed supply chain risk in 10-K 2016-02-25.**, facing **in Item 7, may impact the consumer acceptability of tobacco products, limit adult tobacco consumer choices, delay or prevent the launch of new or modified tobacco products or products with claims of reduced risk, require the recall or other removal of tobacco products from the marketplace (for example as a result of product contamination or a determination by the FDA that one or more tobacco products do not satisfy the statutory requirements for substantial equivalence), restrict communications to adult tobacco consumers, restrict the ability to differentiate tobacco products, create a competitive advantage or disadvantage for certain tobacco companies, impose additional manufacturing, labeling or packing requirements, interrupt manufacturing or otherwise significantly increase the cost of doing business, or restrict or prevent the use of specified tobacco products in certain locations o**, we assume **MO can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Domestic-business geopolitics assumptions should still track indirect input exposure because conflict can reach companies through supplier cost and availability rather than direct revenue.
- **FAIL** MO / Geopolitics and tariffs: asm-jyPd6Wjg via out-nojVhWNc
  - In the context of **MO disclosed geopolitics and tariffs risk in 10-Q 2020-04-30.**, facing **To date, Altria believes it has experienced minimal impact to productivity due to the remote working and its critical information technology systems have remained operational. Although Altria temporarily suspended operations at Philip Morris USA Inc.'s ("PM USA") Richmond, Virginia-area manufacturing facilities, John Middleton Co.'s (Middleton) King of Prussia, Pennsylvania manufacturing facility, as well as U.S. Smokeless Tobacco Company LLC's ("USSTC") Nashville, Tennessee-area manufacturing facilities in March 2020, Altria resumed operations at those facilities under enhanced safety protocols in April 2020 and all of Altria's manufacturing facilities are currently operational.**, we assume **MO can manage geopolitics and tariffs risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Supply-chain assumptions should track availability of component parts and alternative sourcing work because mitigation language often reveals operational pressure already being felt.
- **FAIL** MSFT / AI, R&D, and technology: asm-e7XCszRn via out-4u23dr9z
  - In the context of **MSFT disclosed ai, r&d, and technology risk in 10-Q 2016-01-28.**, facing **can further transform the industry and our business. At Microsoft, we push the boundaries of what is possible through a broad range of research and development activities that seek to identify and address the changing demands of customers, industry**, we assume **MSFT can manage ai, r&d, and technology risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Technology-platform assumptions should track impairment charges inside R&D because they identify product or portfolio bets that failed to compound.
- **FAIL** MSFT / AI, R&D, and technology: asm-e7XCszRn via out-JiCcBcGp
  - In the context of **MSFT disclosed ai, r&d, and technology risk in 10-Q 2016-01-28.**, facing **can further transform the industry and our business. At Microsoft, we push the boundaries of what is possible through a broad range of research and development activities that seek to identify and address the changing demands of customers, industry**, we assume **MSFT can manage ai, r&d, and technology risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: AI/R&D assumptions should separate productive investment from impairment-backed cost pressure; both can rise together and change the risk profile.
- **FAIL** MU / Inventory and channel: asm-mohAyweE via out-ckuQwvui
  - In the context of **MU disclosed inventory and channel risk in 10-Q 2016-01-08.**, facing **Our memory solutions enable the world's most innovative computing, consumer, enterprise storage, networking, mobile, embedded, and automotive applications. We market our products through our internal sales force, independent sales representatives, and distributors, primarily to OEMs and retailers located around the world. Our success is largely dependent on the market acceptance of our diversified portfolio of semiconductor products, efficient utilization of our manufacturing infrastructure, successful ongoing development of advanced product and process technologies, and generating a return on R&D investments.**, we assume **MU can manage inventory and channel risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Memory inventory assumptions should track product-line exits because technology discontinuation can convert both assets and inventory into charges.
- **FAIL** NVDA / Supply chain: asm-iGQnHDHS via out-QuoB6Xk9
  - In the context of **NVDA disclosed supply chain risk in 10-K 2016-03-17.**, facing **Our competitors' products, services and technologies may be less costly, or may offer superior functionality or different features than ours. In addition, many of our competitors operate and maintain their own fabrication facilities and have longer operating histories, greater name recognition, larger customer bases, and greater financial, sales, marketing and distribution resources than we do. These competitors may be able to more effectively identify and capitalize upon opportunities in new markets and end user customer trends, quickly transition their semiconductor products to increasingly smaller line width geometries and obtain sufficient foundry capacity and packaging materials, which could harm our business.**, we assume **NVDA can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Semiconductor supply-chain assumptions should track architecture-transition inventory because component commitments can become charges when product platforms shift.
- **FAIL** PM / Demand: asm-ENkEBfSg via out-srjsEnMV
  - In the context of **PM disclosed demand risk in 10-K 2016-02-17.**, facing **Net revenues and operating companies income**, we assume **PM can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Tobacco demand assumptions should track volume/mix by market because pricing can mask broad volume pressure until it appears in net revenue.
- **FAIL** PM / Inventory and channel: asm-3mQ3s1U8 via out-PJAxG7yK
  - In the context of **PM disclosed inventory and channel risk in 10-K 2016-02-17.**, facing **On December 12, 2013, we acquired from Megapolis Investment BV a 20% equity interest in Megapolis Distribution BV, the holding company of CJSC TK Megapolis ("Megapolis"), PMI's distributor in Russia. The purchase price of $760 million excludes an additional payment of up to $100 million, which is contingent on Megapolis's operational performance over the four fiscal years following the closing of the transaction.**, we assume **PM can manage inventory and channel risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Channel assumptions should track distributor-arrangement charges because route-to-market decisions can create direct P&L costs even when underlying consumer demand is stable.
- **FAIL** TSLA / Demand: asm-jRQLiAWW via out-dRsn956z
  - In the context of **TSLA disclosed demand risk in 10-K 2016-02-24.**, facing **The discussions in this Annual Report on Form 10-K contain forward-looking statements reflecting our current expectations that involve risks and uncertainties. These forward-looking statements include, but are not limited to, statements concerning our strategy, future operations, future financial position, future revenues, projected costs, profitability, expected cost reductions, capital adequacy, expectations regarding demand and acceptance for our technologies, growth opportunities and trends in the market in which we operate, prospects and plans and objectives of management. The words "anticipates", "believes", "estimates", "expects", "intends", "may", "plans", "projects", "will", "would" and similar expressions are intended to identify forward-looking statements, although not all forward-looking statements contain these identifying words.**, we assume **TSLA can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: EV demand assumptions should track revenue declines across both quarterly and year-to-date windows because short-term delivery or pricing weakness can compound into a broader demand reset.
- **FAIL** WBD / Regulation and legal: asm-iVeAyyNH via out-sTpYBDUQ
  - In the context of **WBD disclosed regulation and legal risk in 10-K 2016-02-18.**, facing **We face cybersecurity and similar risks, which could result in the disclosure of confidential information, disruption of our programming services, damage to our brands and reputation, legal exposure and financial losses.**, we assume **WBD can manage regulation and legal risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Media-production regulation assumptions should track production shutdowns and reopening compliance costs because restrictions can impair both content supply and operating margins.
- **FAIL** AAPL / Demand: asm-mB3Z4msd via out-ziDKD8UB
  - In the context of **AAPL disclosed demand risk in 10-Q 2016-01-27.**, facing **, a portfolio of consumer and professional software applications, iOS, OS X**, we assume **AAPL can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Hardware demand assumptions should track channel availability because temporary closures can weaken demand even when supply-chain issues are the more visible shock.
- **FAIL** AMD / Regulation and legal: asm-UMyfURLG via out-PzSBYfnX
  - In the context of **AMD disclosed regulation and legal risk in 10-K 2016-02-18.**, facing **Other risks associated with our dependence on third-party manufacturers include limited control over delivery schedules and quality assurance, lack of capacity in periods of excess demand, misappropriation of our intellectual property, dependence on several small undercapitalized subcontractors and limited ability to manage inventory and parts. Moreover, if any of our third-party manufacturers suffer any damage to facilities, lose benefits under material agreements, experience power outages, lack sufficient capacity to manufacture our products, encounter financial difficulties, are unable to secure necessary raw materials from their suppliers or suffer any other disruption or reduction in efficiency, we may encounter supply delays or disruptions.**, we assume **AMD can manage regulation and legal risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Semiconductor legal assumptions should track contingent-loss language because even small legal reserves mark realized friction that can recur or compound around transactions.
- **FAIL** AMD / Supply chain: asm-Eesv17uF via out-AiaZth1U
  - In the context of **AMD disclosed supply chain risk in 10-K 2016-02-18.**, facing **Intel exerts substantial influence over computer manufacturers and their channels of distribution through various brand and other marketing programs. As a result of Intel's position in the microprocessor market, Intel has been able to control x86 microprocessor and computer system standards and benchmarks and to dictate the type of products the microprocessor market requires of us.**, we assume **AMD can manage supply chain risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Semiconductor supply-chain assumptions should track early disruption language even when quantified impact is limited because it signals the operating loop being actively rebalanced.
- **FAIL** DIS / Demand: asm-6o8MAEsY via out-bDqnUbbv
  - In the context of **DIS disclosed demand risk in 10-Q 2019-05-08.**, facing **Seasonality**, we assume **DIS can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Experience and media demand assumptions should track revenue and operating-income shocks together because attendance, production, advertising, and distribution disruptions can compound into enterprise-level losses.
- **FAIL** DIS / Geopolitics and tariffs: asm-xakuDdYD via out-tnWp4P7Z
  - In the context of **DIS disclosed geopolitics and tariffs risk in 10-Q 2022-05-11.**, facing **In March 2022, in response to events in Russia and Ukraine, the Company announced a pause of its operations in Russia, which include theatrical distribution and other licensing businesses and the distribution of the Disney Channel in Russia. These business generate approximately two percent of the Company's operating income.**, we assume **DIS can manage geopolitics and tariffs risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: A geopolitics risk becomes decision-grade when filings move from generic exposure language to named-market exits, impairment charges, and quantified restructuring costs.
- **FAIL** META / Geopolitics and tariffs: asm-ysQyika4 via out-aWE2ftCq
  - In the context of **META disclosed geopolitics and tariffs risk in 10-Q 2016-11-03.**, facing **Note: For purposes of reporting DAUs, MAUs, and ARPU by geographic region, Europe includes all users in Russia and Turkey and Rest of World includes all users in Africa, Latin America, and the Middle East.**, we assume **META can manage geopolitics and tariffs risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: For platform companies, geopolitical risk becomes decision-grade when access restrictions are tied to measured user engagement declines, even before the filing quantifies revenue loss.
- **FAIL** PM / Liquidity: asm-dGcwZvEF via out-VEELu9Yp
  - In the context of **PM disclosed liquidity risk in 10-K 2016-02-17.**, facing **The dissolution, mutually agreed with SWMA, means that both companies will now focus on independent strategies for the commercialization of these products, and the trademarks and intellectual property licensed to the joint venture by the companies will revert to their original owners. The dissolution of this agreement was not material to our consolidated financial position, results of operations or cash flows in any of the periods presented.**, we assume **PM can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Legal/liquidity risks become falsified when filings move from exposure language to probable adverse outcomes with quantified P&L and EPS effects.
- **FAIL** LOW / Liquidity: asm-c1UaX4xS via out-nzwXFuEc
  - In the context of **LOW disclosed liquidity risk in 10-K 2016-03-29.**, facing **We accept payments using a variety of methods, including credit card, debit card, credit accounts, our private label and co-branded credit cards, gift cards, direct debit from a customer's bank account, consumer invoicing, and physical bank checks, and we may offer different payment options over time. These payment options subject us to many compliance requirements, including, but not limited to, compliance with payment card association operating rules, including data security rules, certification requirements, rules governing electronic funds transfers and Payment Card Industry Data Security Standards.**, we assume **LOW can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Liquidity/capital allocation risk becomes decision-grade when a company exits a market and quantifies the impairment required to unwind the bet.
- **FAIL** MO / Liquidity: asm-kZQCFeFw via out-V13Rkdgz
  - In the context of **MO disclosed liquidity risk in 10-K 2016-02-25.**, facing **The following risk factors should be read carefully in connection with evaluating our business and the forward-looking statements contained in this Annual Report on Form 10-K. Any of the following risks could materially adversely affect our business, our results of operations, our cash flows, our financial position and the actual outcome of matters as to which forward-looking statements are made in this Annual Report on Form 10-K.**, we assume **MO can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Investment/liquidity risks become falsified when fair-value declines are no longer temporary and management records a quantified impairment.
- **FAIL** TJX / Liquidity: asm-YS9U4MTJ via out-51DsRhsa
  - In the context of **TJX disclosed liquidity risk in 10-K 2016-03-29.**, facing **increases in both fiscal 2015 and fiscal 2014. We continued to generate strong cash flows, allowing us to return value to our shareholders through cash dividends and share repurchases, while continuing to reinvest in our business by adding new**, we assume **TJX can manage liquidity risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Liquidity risk is decision-grade when financing actions create quantified extinguishment losses and explicit margin/EPS impacts.
- **FAIL** MU / AI, R&D, and technology: asm-o5RkVgmn via out-TJEZc2NV
  - In the context of **MU disclosed ai, r&d, and technology risk in 10-Q 2016-01-08.**, facing **We market our products through our internal sales force, independent sales representatives, and distributors, primarily to OEMs and retailers located around the world. Our success is largely dependent on the market acceptance of our diversified portfolio of semiconductor products, efficient utilization of our manufacturing infrastructure, successful ongoing development of advanced product and process technologies, and generating a return on R&D investments.**, we assume **MU can manage ai, r&d, and technology risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Technology/R&D exposure becomes falsified when strategic cost resets require quantified restructuring and severance charges rather than normal operating adjustment.
- **FAIL** HD / Cybersecurity and privacy: asm-tCv4Rh7b via out-btdioMuB
  - In the context of **HD disclosed cybersecurity and privacy risk in 10-K 2016-03-24.**, facing **The Data Breach involved the theft of certain payment card information and customer email addresses through unauthorized access to our systems. Since the Data Breach occurred, we have recorded $161 million of pretax expenses, net of expected insurance recoveries, in connection with the Data Breach, as described in more detail in Item 7, "Management's Discussion and Analysis of Financial Condition and Results of Operation" and Note 13 to the Consolidated Financial Statements included in Item 8, "Financial Statements and Supplementary Data". We are facing putative class actions filed in the U.S. and Canada and a consolidated shareholder derivative action brought by two purported shareholders in the U.S., and other claims have been and may be asserted on behalf of customers, payment card issuing banks, shareholders, or others seeking damages or other related relief, allegedly arising out of**, we assume **HD can manage cybersecurity and privacy risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: Cybersecurity risk becomes decision-grade when breach disclosure connects unauthorized access to quantified costs, customer data exposure, and follow-on litigation.

## Dependent Ideas Needing Review

No dependent ideas are currently flagged by accepted refutations.

## Lifecycle Summary

- Corpus: 1468 SEC filing(s) scanned.
- Observation ledger: 21186 dated observation(s) grouped into 439 tracked assumption theme(s).
- Cross-company comparison: 12 theme(s) appeared in more than one company.
- Realized outcome candidates: 55 staged, 55 applied.
- Value signal: recurring issuer-authored evidence is organized for review; outcomes are not applied until explicitly accepted.

## Company Summaries

### AMD

- Filings scanned: 41
- Window: 2016-02-18 to 2026-02-04
- Themes tracked: 12
- Observations: 794
- Staged outcomes: 0

- **Demand**: 82 observation(s), latest 2026-02-04, assumption asm-MM6Hc6gr
- **Regulation and legal**: 82 observation(s), latest 2026-02-04, assumption asm-UMyfURLG
- **Supply chain**: 79 observation(s), latest 2026-02-04, assumption asm-Eesv17uF
- **AI, R&D, and technology**: 76 observation(s), latest 2026-02-04, assumption asm-YZqMAAdx
- **Competition**: 71 observation(s), latest 2026-02-04, assumption asm-6USJ5rRZ
- **Customer and platform dependency**: 71 observation(s), latest 2026-02-04, assumption asm-M8Xsoi1Q
- **Liquidity**: 68 observation(s), latest 2026-02-04, assumption asm-E1S8hNjw
- **Cloud and data center capacity**: 66 observation(s), latest 2026-02-04, assumption asm-Vc3UnXrd

### KO

- Filings scanned: 42
- Window: 2016-02-25 to 2026-04-30
- Themes tracked: 12
- Observations: 520
- Staged outcomes: 2

- **Demand**: 84 observation(s), latest 2026-04-30, assumption asm-5B3UtjSr
- **Regulation and legal**: 84 observation(s), latest 2026-04-30, assumption asm-pzkApQ3D
- **Macro and foreign exchange**: 80 observation(s), latest 2026-04-30, assumption asm-LUzMWzaf
- **Liquidity**: 79 observation(s), latest 2026-04-30, assumption asm-VHwYXgcz
- **Supply chain**: 55 observation(s), latest 2026-04-30, assumption asm-8PrAsUNA
- **Inventory and channel**: 29 observation(s), latest 2026-04-30, assumption asm-4o6cP28W
- **AI, R&D, and technology**: 27 observation(s), latest 2026-04-30, assumption asm-Eny9pPGh
- **Geopolitics and tariffs**: 23 observation(s), latest 2026-02-20, assumption asm-mkYzo5Ud

### INTC

- Filings scanned: 34
- Window: 2016-02-12 to 2026-04-24
- Themes tracked: 12
- Observations: 167
- Staged outcomes: 0

- **Liquidity**: 48 observation(s), latest 2026-04-24, assumption asm-TPsPEwFm
- **Regulation and legal**: 33 observation(s), latest 2026-04-24, assumption asm-nWMnsLFe
- **Demand**: 14 observation(s), latest 2017-10-26, assumption asm-fZWuLM4W
- **AI, R&D, and technology**: 13 observation(s), latest 2017-10-26, assumption asm-qGbyzbxQ
- **Inventory and channel**: 11 observation(s), latest 2017-10-26, assumption asm-3tdVousy
- **Customer and platform dependency**: 10 observation(s), latest 2017-10-26, assumption asm-vzCKnHAd
- **Cloud and data center capacity**: 9 observation(s), latest 2017-10-26, assumption asm-tLcP6T72
- **Macro and foreign exchange**: 9 observation(s), latest 2017-10-26, assumption asm-n7mBdTkt

### LOW

- Filings scanned: 41
- Window: 2016-03-29 to 2026-03-23
- Themes tracked: 12
- Observations: 546
- Staged outcomes: 1

- **Demand**: 82 observation(s), latest 2026-03-23, assumption asm-2bsXCx1z
- **Regulation and legal**: 79 observation(s), latest 2026-03-23, assumption asm-RvnDU8Y8
- **Liquidity**: 76 observation(s), latest 2026-03-23, assumption asm-c1UaX4xS
- **Inventory and channel**: 72 observation(s), latest 2026-03-23, assumption asm-FZY4k5Kg
- **Macro and foreign exchange**: 65 observation(s), latest 2026-03-23, assumption asm-n1JkTZiU
- **Supply chain**: 52 observation(s), latest 2026-03-23, assumption asm-2JkyVQb8
- **Geopolitics and tariffs**: 51 observation(s), latest 2026-03-23, assumption asm-SXfx7kfb
- **Competition**: 23 observation(s), latest 2026-03-23, assumption asm-Q3KwonZ9

### MCD

- Filings scanned: 41
- Window: 2016-02-25 to 2026-02-24
- Themes tracked: 12
- Observations: 419
- Staged outcomes: 1

- **Demand**: 68 observation(s), latest 2025-11-05, assumption asm-n6h4Xk4Y
- **Liquidity**: 68 observation(s), latest 2025-11-05, assumption asm-sfuU8h2r
- **Supply chain**: 54 observation(s), latest 2025-11-05, assumption asm-ZXtE58Qr
- **Macro and foreign exchange**: 50 observation(s), latest 2025-11-05, assumption asm-yH5YJvzD
- **Geopolitics and tariffs**: 38 observation(s), latest 2025-11-05, assumption asm-xpQWPuVt
- **Regulation and legal**: 35 observation(s), latest 2026-02-24, assumption asm-cdaZZ8c6
- **Competition**: 29 observation(s), latest 2025-11-05, assumption asm-TaAReeC4
- **AI, R&D, and technology**: 24 observation(s), latest 2025-11-05, assumption asm-yP8FEAiY

### PEP

- Filings scanned: 42
- Window: 2016-02-11 to 2026-04-16
- Themes tracked: 12
- Observations: 538
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-04-16, assumption asm-EttqoebR
- **Liquidity**: 77 observation(s), latest 2026-04-16, assumption asm-wLsugjzr
- **Regulation and legal**: 72 observation(s), latest 2026-04-16, assumption asm-uqZsL8Rj
- **Macro and foreign exchange**: 61 observation(s), latest 2026-04-16, assumption asm-aunCsZFj
- **Supply chain**: 54 observation(s), latest 2026-04-16, assumption asm-2ZCThYZi
- **Geopolitics and tariffs**: 49 observation(s), latest 2026-04-16, assumption asm-omkTzJvr
- **Cybersecurity and privacy**: 39 observation(s), latest 2026-04-16, assumption asm-VcMrtKBQ
- **Competition**: 35 observation(s), latest 2026-02-03, assumption asm-G7W6asH4

### PG

- Filings scanned: 42
- Window: 2016-01-26 to 2026-04-24
- Themes tracked: 11
- Observations: 609
- Staged outcomes: 0

- **Liquidity**: 84 observation(s), latest 2026-04-24, assumption asm-tuW4CzkJ
- **Regulation and legal**: 84 observation(s), latest 2026-04-24, assumption asm-x2zkgzBa
- **Demand**: 64 observation(s), latest 2026-04-24, assumption asm-BgMcSnir
- **Macro and foreign exchange**: 62 observation(s), latest 2026-04-24, assumption asm-vhvWW7Y8
- **Inventory and channel**: 60 observation(s), latest 2026-04-24, assumption asm-b8Th3fBK
- **Supply chain**: 60 observation(s), latest 2026-04-24, assumption asm-f5Lj2fiq
- **Competition**: 55 observation(s), latest 2026-04-24, assumption asm-W9cZ2Hr6
- **AI, R&D, and technology**: 53 observation(s), latest 2026-04-24, assumption asm-C8UQhXLB

### WMT

- Filings scanned: 41
- Window: 2016-03-30 to 2026-03-13
- Themes tracked: 12
- Observations: 615
- Staged outcomes: 1

- **Demand**: 80 observation(s), latest 2026-03-13, assumption asm-cvCS8mqh
- **Liquidity**: 77 observation(s), latest 2026-03-13, assumption asm-TdCfCYWy
- **Supply chain**: 65 observation(s), latest 2026-03-13, assumption asm-RQqF2iAr
- **Competition**: 55 observation(s), latest 2026-03-13, assumption asm-tkJE9ARS
- **Macro and foreign exchange**: 55 observation(s), latest 2026-03-13, assumption asm-CmkdeW2a
- **Regulation and legal**: 51 observation(s), latest 2026-03-13, assumption asm-hFxnyU2j
- **Geopolitics and tariffs**: 50 observation(s), latest 2026-03-13, assumption asm-XgTNDGLM
- **Customer and platform dependency**: 47 observation(s), latest 2026-03-13, assumption asm-Wrv39kRv

### TJX

- Filings scanned: 41
- Window: 2016-03-29 to 2026-03-31
- Themes tracked: 11
- Observations: 382
- Staged outcomes: 1

- **Demand**: 70 observation(s), latest 2026-03-31, assumption asm-s1DMMs1D
- **Liquidity**: 68 observation(s), latest 2026-03-31, assumption asm-YS9U4MTJ
- **Macro and foreign exchange**: 64 observation(s), latest 2026-03-31, assumption asm-AaKimrur
- **Inventory and channel**: 60 observation(s), latest 2026-03-31, assumption asm-Pw3aRPMq
- **Regulation and legal**: 39 observation(s), latest 2026-03-31, assumption asm-EpxtKNbh
- **Supply chain**: 35 observation(s), latest 2026-03-31, assumption asm-HjKpY9y2
- **Competition**: 15 observation(s), latest 2026-03-31, assumption asm-cJV54dWm
- **Geopolitics and tariffs**: 15 observation(s), latest 2026-03-31, assumption asm-GtYjUncm

### AAPL

- Filings scanned: 42
- Window: 2016-01-27 to 2026-05-01
- Themes tracked: 12
- Observations: 672
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-05-01, assumption asm-mB3Z4msd
- **Liquidity**: 77 observation(s), latest 2026-05-01, assumption asm-Ci3UyXkx
- **AI, R&D, and technology**: 66 observation(s), latest 2026-05-01, assumption asm-K7yH9uXU
- **Macro and foreign exchange**: 65 observation(s), latest 2026-05-01, assumption asm-yxrE5cms
- **Regulation and legal**: 64 observation(s), latest 2026-05-01, assumption asm-ZbiY6z1v
- **Customer and platform dependency**: 61 observation(s), latest 2026-05-01, assumption asm-hPkWQPGc
- **Inventory and channel**: 59 observation(s), latest 2026-05-01, assumption asm-kAXYVk2E
- **Geopolitics and tariffs**: 57 observation(s), latest 2026-05-01, assumption asm-6eLPnrAX

### HD

- Filings scanned: 41
- Window: 2016-03-24 to 2026-03-18
- Themes tracked: 12
- Observations: 683
- Staged outcomes: 1

- **Demand**: 82 observation(s), latest 2026-03-18, assumption asm-XBSku9xU
- **Liquidity**: 81 observation(s), latest 2026-03-18, assumption asm-TFmHzJEj
- **Macro and foreign exchange**: 79 observation(s), latest 2026-03-18, assumption asm-baDQqB4o
- **Supply chain**: 79 observation(s), latest 2026-03-18, assumption asm-fPQrCJDg
- **Inventory and channel**: 77 observation(s), latest 2026-03-18, assumption asm-RqRzVoBY
- **Regulation and legal**: 72 observation(s), latest 2026-03-18, assumption asm-e4CubdhJ
- **Competition**: 69 observation(s), latest 2026-03-18, assumption asm-H4c83tdg
- **Geopolitics and tariffs**: 44 observation(s), latest 2026-03-18, assumption asm-KPCgwrwa

### EA

- Filings scanned: 41
- Window: 2016-02-08 to 2026-02-03
- Themes tracked: 12
- Observations: 559
- Staged outcomes: 0

- **Demand**: 82 observation(s), latest 2026-02-03, assumption asm-wFp7jc4R
- **Regulation and legal**: 82 observation(s), latest 2026-02-03, assumption asm-MgGNzK6z
- **AI, R&D, and technology**: 78 observation(s), latest 2026-02-03, assumption asm-TjYtzgef
- **Customer and platform dependency**: 66 observation(s), latest 2026-02-03, assumption asm-r3FWa1c1
- **Liquidity**: 55 observation(s), latest 2026-02-03, assumption asm-Dn2rzHuU
- **Macro and foreign exchange**: 47 observation(s), latest 2026-02-03, assumption asm-7Tni2uL5
- **Competition**: 42 observation(s), latest 2026-02-03, assumption asm-Mndus4RU
- **Supply chain**: 34 observation(s), latest 2026-02-03, assumption asm-dxrZndfW

### MU

- Filings scanned: 42
- Window: 2016-01-08 to 2026-03-19
- Themes tracked: 12
- Observations: 790
- Staged outcomes: 8

- **Supply chain**: 84 observation(s), latest 2026-03-19, assumption asm-TN54hhrX
- **AI, R&D, and technology**: 83 observation(s), latest 2026-03-19, assumption asm-o5RkVgmn
- **Demand**: 83 observation(s), latest 2026-03-19, assumption asm-PNGucCzS
- **Cloud and data center capacity**: 82 observation(s), latest 2026-03-19, assumption asm-sjxR8DDD
- **Liquidity**: 71 observation(s), latest 2026-03-19, assumption asm-RFSk51ax
- **Geopolitics and tariffs**: 70 observation(s), latest 2026-03-19, assumption asm-wqLG5C3V
- **Competition**: 67 observation(s), latest 2026-03-19, assumption asm-9u6GsKqY
- **Regulation and legal**: 67 observation(s), latest 2026-03-19, assumption asm-qUnSzML4

### VZ

- Filings scanned: 42
- Window: 2016-02-23 to 2026-05-01
- Themes tracked: 12
- Observations: 522
- Staged outcomes: 1

- **Demand**: 84 observation(s), latest 2026-05-01, assumption asm-ktbpwdZ5
- **Liquidity**: 79 observation(s), latest 2026-05-01, assumption asm-grGzqr3M
- **Macro and foreign exchange**: 54 observation(s), latest 2026-05-01, assumption asm-J2mS7Cp9
- **Customer and platform dependency**: 50 observation(s), latest 2026-05-01, assumption asm-vNY9Aig5
- **Cloud and data center capacity**: 48 observation(s), latest 2026-05-01, assumption asm-3bGK86qL
- **Competition**: 40 observation(s), latest 2025-10-29, assumption asm-Bf4Gknt3
- **Supply chain**: 40 observation(s), latest 2026-05-01, assumption asm-jx9SfN5a
- **Regulation and legal**: 39 observation(s), latest 2026-05-01, assumption asm-CuLwa4vn

### T

- Filings scanned: 42
- Window: 2016-02-18 to 2026-04-27
- Themes tracked: 12
- Observations: 440
- Staged outcomes: 0

- **Liquidity**: 72 observation(s), latest 2026-04-27, assumption asm-GJg2kRDx
- **Demand**: 58 observation(s), latest 2026-04-27, assumption asm-SuwGymEp
- **Regulation and legal**: 55 observation(s), latest 2026-04-27, assumption asm-Q4CGhim2
- **Competition**: 47 observation(s), latest 2026-04-27, assumption asm-1RAXyoyS
- **Cloud and data center capacity**: 42 observation(s), latest 2026-04-27, assumption asm-EZUWzbiP
- **Supply chain**: 36 observation(s), latest 2026-04-27, assumption asm-JQ83Qjny
- **Inventory and channel**: 32 observation(s), latest 2026-04-27, assumption asm-9mDrajo6
- **Macro and foreign exchange**: 28 observation(s), latest 2026-04-27, assumption asm-CKb9jFyj

### MO

- Filings scanned: 42
- Window: 2016-02-25 to 2026-04-30
- Themes tracked: 12
- Observations: 471
- Staged outcomes: 3

- **Demand**: 84 observation(s), latest 2026-04-30, assumption asm-GzBCvRcp
- **Liquidity**: 83 observation(s), latest 2026-04-30, assumption asm-kZQCFeFw
- **Supply chain**: 80 observation(s), latest 2026-04-30, assumption asm-BmMCyKey
- **Regulation and legal**: 78 observation(s), latest 2026-04-30, assumption asm-D2cw2U6U
- **AI, R&D, and technology**: 49 observation(s), latest 2026-04-30, assumption asm-zu3jRoXT
- **Inventory and channel**: 33 observation(s), latest 2026-04-30, assumption asm-7n3pdG2q
- **Competition**: 26 observation(s), latest 2026-04-30, assumption asm-xBx1iatS
- **Macro and foreign exchange**: 19 observation(s), latest 2026-04-30, assumption asm-t8x5aPDE

### MSFT

- Filings scanned: 42
- Window: 2016-01-28 to 2026-04-29
- Themes tracked: 12
- Observations: 816
- Staged outcomes: 4

- **Demand**: 84 observation(s), latest 2026-04-29, assumption asm-GpdfFh1C
- **AI, R&D, and technology**: 83 observation(s), latest 2026-04-29, assumption asm-e7XCszRn
- **Cloud and data center capacity**: 83 observation(s), latest 2026-04-29, assumption asm-YKKrQv95
- **Regulation and legal**: 83 observation(s), latest 2026-04-29, assumption asm-EqZEvCR8
- **Supply chain**: 83 observation(s), latest 2026-04-29, assumption asm-rVK5kqKU
- **Customer and platform dependency**: 73 observation(s), latest 2026-04-29, assumption asm-pY64YDwZ
- **Liquidity**: 64 observation(s), latest 2026-04-29, assumption asm-pvTxdvNS
- **Macro and foreign exchange**: 61 observation(s), latest 2026-04-29, assumption asm-jVgFUFR3

### SBUX

- Filings scanned: 42
- Window: 2016-01-26 to 2026-04-28
- Themes tracked: 12
- Observations: 541
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-04-28, assumption asm-b5wJFCYT
- **Liquidity**: 77 observation(s), latest 2026-04-28, assumption asm-BcRAAh3G
- **Regulation and legal**: 73 observation(s), latest 2026-04-28, assumption asm-agHQPazh
- **Geopolitics and tariffs**: 50 observation(s), latest 2026-04-28, assumption asm-dM8YjiES
- **Competition**: 48 observation(s), latest 2026-04-28, assumption asm-bZ4tohxb
- **Macro and foreign exchange**: 48 observation(s), latest 2026-04-28, assumption asm-W3JSzH6m
- **Supply chain**: 42 observation(s), latest 2026-04-28, assumption asm-JaYwNZmb
- **AI, R&D, and technology**: 32 observation(s), latest 2026-04-28, assumption asm-katVwK23

### CSCO

- Filings scanned: 41
- Window: 2016-02-18 to 2026-02-17
- Themes tracked: 12
- Observations: 782
- Staged outcomes: 0

- **AI, R&D, and technology**: 82 observation(s), latest 2026-02-17, assumption asm-n7FhB48i
- **Demand**: 82 observation(s), latest 2026-02-17, assumption asm-apaexpGF
- **Liquidity**: 78 observation(s), latest 2026-02-17, assumption asm-UsPRNsQW
- **Cloud and data center capacity**: 73 observation(s), latest 2026-02-17, assumption asm-2uJDeUV2
- **Competition**: 73 observation(s), latest 2026-02-17, assumption asm-x5MTksh5
- **Customer and platform dependency**: 73 observation(s), latest 2026-02-17, assumption asm-G8uoQwJk
- **Geopolitics and tariffs**: 73 observation(s), latest 2026-02-17, assumption asm-sXr7pBZe
- **Macro and foreign exchange**: 62 observation(s), latest 2026-02-17, assumption asm-sEBXyjEz

### COST

- Filings scanned: 41
- Window: 2016-03-09 to 2026-03-11
- Themes tracked: 11
- Observations: 610
- Staged outcomes: 0

- **Demand**: 82 observation(s), latest 2026-03-11, assumption asm-BSzuTp35
- **Inventory and channel**: 82 observation(s), latest 2026-03-11, assumption asm-2qgZNfRr
- **Regulation and legal**: 81 observation(s), latest 2026-03-11, assumption asm-H2Mr6T9T
- **Liquidity**: 72 observation(s), latest 2026-03-11, assumption asm-P5mRwhf3
- **Supply chain**: 72 observation(s), latest 2026-03-11, assumption asm-bgprY9KW
- **Geopolitics and tariffs**: 69 observation(s), latest 2026-03-11, assumption asm-SXrXBNsj
- **Macro and foreign exchange**: 53 observation(s), latest 2026-03-11, assumption asm-mzoh69FJ
- **Competition**: 38 observation(s), latest 2026-03-11, assumption asm-dGpsJ26w

### AMZN

- Filings scanned: 42
- Window: 2016-01-29 to 2026-04-30
- Themes tracked: 12
- Observations: 810
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-04-30, assumption asm-vyQBE4kp
- **Inventory and channel**: 84 observation(s), latest 2026-04-30, assumption asm-YKKxzUbi
- **Liquidity**: 84 observation(s), latest 2026-04-30, assumption asm-LPvDrzY9
- **Regulation and legal**: 84 observation(s), latest 2026-04-30, assumption asm-KNZTaZZZ
- **Supply chain**: 84 observation(s), latest 2026-04-30, assumption asm-p9bqfJFt
- **Macro and foreign exchange**: 82 observation(s), latest 2026-04-30, assumption asm-B5T3mVMZ
- **Cloud and data center capacity**: 80 observation(s), latest 2026-04-30, assumption asm-WG1dCesU
- **Competition**: 80 observation(s), latest 2026-04-30, assumption asm-vKZCmN6S

### NVDA

- Filings scanned: 41
- Window: 2016-03-17 to 2026-02-25
- Themes tracked: 12
- Observations: 704
- Staged outcomes: 2

- **Demand**: 82 observation(s), latest 2026-02-25, assumption asm-QncdPdYh
- **AI, R&D, and technology**: 77 observation(s), latest 2026-02-25, assumption asm-GDaMBKx5
- **Regulation and legal**: 72 observation(s), latest 2026-02-25, assumption asm-Nj15znFh
- **Liquidity**: 69 observation(s), latest 2026-02-25, assumption asm-z8gxKvQh
- **Supply chain**: 66 observation(s), latest 2026-02-25, assumption asm-iGQnHDHS
- **Cloud and data center capacity**: 63 observation(s), latest 2026-02-25, assumption asm-z6FaBvWf
- **Customer and platform dependency**: 62 observation(s), latest 2026-02-25, assumption asm-tF3gKQpt
- **Inventory and channel**: 61 observation(s), latest 2026-02-25, assumption asm-XtUoWXU4

### MAR

- Filings scanned: 41
- Window: 2016-02-18 to 2026-02-10
- Themes tracked: 12
- Observations: 598
- Staged outcomes: 1

- **Demand**: 82 observation(s), latest 2026-02-10, assumption asm-KPbuoyUk
- **Liquidity**: 80 observation(s), latest 2026-02-10, assumption asm-D1qsFGdq
- **Geopolitics and tariffs**: 76 observation(s), latest 2026-02-10, assumption asm-LLbu9L8w
- **Macro and foreign exchange**: 69 observation(s), latest 2026-02-10, assumption asm-FyFu6xz7
- **Regulation and legal**: 68 observation(s), latest 2026-02-10, assumption asm-gdMeBrzP
- **Supply chain**: 58 observation(s), latest 2026-02-10, assumption asm-jsir8Jct
- **Competition**: 53 observation(s), latest 2026-02-10, assumption asm-aBCwqGss
- **Cybersecurity and privacy**: 45 observation(s), latest 2026-02-10, assumption asm-GuBtWuig

### NFLX

- Filings scanned: 42
- Window: 2016-01-28 to 2026-04-17
- Themes tracked: 12
- Observations: 500
- Staged outcomes: 5

- **Demand**: 84 observation(s), latest 2026-04-17, assumption asm-bmBJ3gyo
- **Liquidity**: 84 observation(s), latest 2026-04-17, assumption asm-gZAoZePf
- **Macro and foreign exchange**: 70 observation(s), latest 2026-04-17, assumption asm-HPJvWDyx
- **Supply chain**: 57 observation(s), latest 2026-04-17, assumption asm-aZnYXCED
- **Regulation and legal**: 46 observation(s), latest 2026-04-17, assumption asm-G6NBoRBf
- **Inventory and channel**: 38 observation(s), latest 2026-01-23, assumption asm-QqDi6DKc
- **Geopolitics and tariffs**: 36 observation(s), latest 2026-04-17, assumption asm-G1d7TLaB
- **Cloud and data center capacity**: 25 observation(s), latest 2026-04-17, assumption asm-BQ8JmuMR

### BKNG

- Filings scanned: 42
- Window: 2016-02-17 to 2026-04-28
- Themes tracked: 12
- Observations: 501
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-04-28, assumption asm-SzfgJvKs
- **Macro and foreign exchange**: 83 observation(s), latest 2026-04-28, assumption asm-SZ1og8By
- **Liquidity**: 77 observation(s), latest 2026-04-28, assumption asm-r3YunLyG
- **Customer and platform dependency**: 46 observation(s), latest 2026-04-28, assumption asm-hBkiCTUB
- **Geopolitics and tariffs**: 44 observation(s), latest 2026-04-28, assumption asm-jXNpwW3C
- **Regulation and legal**: 43 observation(s), latest 2026-04-28, assumption asm-rMjZC6aj
- **Competition**: 42 observation(s), latest 2026-02-18, assumption asm-j65FarTK
- **Supply chain**: 36 observation(s), latest 2026-04-28, assumption asm-PNX3KyR7

### CMCSA

- Filings scanned: 42
- Window: 2016-02-05 to 2026-04-23
- Themes tracked: 12
- Observations: 550
- Staged outcomes: 0

- **Demand**: 84 observation(s), latest 2026-04-23, assumption asm-hNS1BXy4
- **Competition**: 77 observation(s), latest 2026-04-23, assumption asm-rPQ3gUSs
- **Macro and foreign exchange**: 75 observation(s), latest 2026-04-23, assumption asm-Qw2RNyYr
- **Liquidity**: 73 observation(s), latest 2026-04-23, assumption asm-bZEYteB4
- **Regulation and legal**: 73 observation(s), latest 2026-04-23, assumption asm-Vq1KB2xB
- **Cybersecurity and privacy**: 58 observation(s), latest 2026-04-23, assumption asm-QBKTT7E8
- **Customer and platform dependency**: 55 observation(s), latest 2026-02-03, assumption asm-AJnfVh8h
- **Cloud and data center capacity**: 17 observation(s), latest 2026-02-03, assumption asm-DuGpHhgo

### TMUS

- Filings scanned: 42
- Window: 2016-02-17 to 2026-04-28
- Themes tracked: 12
- Observations: 525
- Staged outcomes: 2

- **Liquidity**: 84 observation(s), latest 2026-04-28, assumption asm-CJ5Kd9BY
- **Demand**: 65 observation(s), latest 2026-04-28, assumption asm-NyHDPWBk
- **Regulation and legal**: 62 observation(s), latest 2026-04-28, assumption asm-bebTqrbN
- **Inventory and channel**: 60 observation(s), latest 2026-04-28, assumption asm-1voyARfr
- **Supply chain**: 50 observation(s), latest 2026-02-11, assumption asm-uDnUFn7W
- **Competition**: 42 observation(s), latest 2026-02-11, assumption asm-z5GANxbE
- **Macro and foreign exchange**: 37 observation(s), latest 2026-02-11, assumption asm-ji8XFodt
- **Cybersecurity and privacy**: 33 observation(s), latest 2026-02-11, assumption asm-9zvzkp5p

### TSLA

- Filings scanned: 42
- Window: 2016-02-24 to 2026-04-23
- Themes tracked: 12
- Observations: 679
- Staged outcomes: 4

- **Demand**: 84 observation(s), latest 2026-04-23, assumption asm-jRQLiAWW
- **Supply chain**: 79 observation(s), latest 2026-04-23, assumption asm-zXRB5TcJ
- **AI, R&D, and technology**: 76 observation(s), latest 2026-04-23, assumption asm-mvpfdpYB
- **Liquidity**: 76 observation(s), latest 2026-04-23, assumption asm-1XjmnzvT
- **Macro and foreign exchange**: 70 observation(s), latest 2026-04-23, assumption asm-UGMSaHwm
- **Regulation and legal**: 69 observation(s), latest 2026-04-23, assumption asm-DgAURpbD
- **Inventory and channel**: 61 observation(s), latest 2026-04-23, assumption asm-MXng6fyh
- **Cloud and data center capacity**: 56 observation(s), latest 2026-04-23, assumption asm-xMkZ5VjM

### PLTR

- Filings scanned: 22
- Window: 2020-11-13 to 2026-02-17
- Themes tracked: 11
- Observations: 379
- Staged outcomes: 0

- **Demand**: 44 observation(s), latest 2026-02-17, assumption asm-RYdmdFym
- **Customer and platform dependency**: 43 observation(s), latest 2026-02-17, assumption asm-zT554GZv
- **Regulation and legal**: 42 observation(s), latest 2026-02-17, assumption asm-oridaenZ
- **AI, R&D, and technology**: 41 observation(s), latest 2026-02-17, assumption asm-CFdDZ1Qg
- **Liquidity**: 38 observation(s), latest 2026-02-17, assumption asm-EA7XXQ4c
- **Macro and foreign exchange**: 36 observation(s), latest 2026-02-17, assumption asm-7QoEGjkb
- **Cloud and data center capacity**: 35 observation(s), latest 2026-02-17, assumption asm-puiyGvAQ
- **Competition**: 29 observation(s), latest 2026-02-17, assumption asm-aw5W6Z2w

### META

- Filings scanned: 42
- Window: 2016-01-28 to 2026-04-30
- Themes tracked: 12
- Observations: 720
- Staged outcomes: 5

- **Demand**: 84 observation(s), latest 2026-04-30, assumption asm-s331HAs6
- **AI, R&D, and technology**: 82 observation(s), latest 2026-04-30, assumption asm-62M2pid4
- **Customer and platform dependency**: 77 observation(s), latest 2026-04-30, assumption asm-Dv846kMU
- **Regulation and legal**: 75 observation(s), latest 2026-04-30, assumption asm-Jxt8cx8d
- **Competition**: 70 observation(s), latest 2026-04-30, assumption asm-rj6pPT8r
- **Macro and foreign exchange**: 66 observation(s), latest 2026-04-30, assumption asm-H79M9Vrk
- **Cloud and data center capacity**: 63 observation(s), latest 2026-04-30, assumption asm-DwyATMoV
- **Cybersecurity and privacy**: 58 observation(s), latest 2026-04-30, assumption asm-BqHCtE9n

### ORCL

- Filings scanned: 41
- Window: 2016-03-18 to 2026-03-11
- Themes tracked: 12
- Observations: 655
- Staged outcomes: 0

- **AI, R&D, and technology**: 82 observation(s), latest 2026-03-11, assumption asm-iR8p4eRQ
- **Cloud and data center capacity**: 82 observation(s), latest 2026-03-11, assumption asm-kd1wg1i3
- **Demand**: 82 observation(s), latest 2026-03-11, assumption asm-w2KZCbog
- **Competition**: 80 observation(s), latest 2026-03-11, assumption asm-nwLYDwmb
- **Regulation and legal**: 78 observation(s), latest 2026-03-11, assumption asm-Zu1asXEe
- **Macro and foreign exchange**: 72 observation(s), latest 2026-03-11, assumption asm-BgEPBKBS
- **Liquidity**: 69 observation(s), latest 2026-03-11, assumption asm-3sW43ezk
- **Customer and platform dependency**: 37 observation(s), latest 2025-06-18, assumption asm-uXtpdB2q

### PM

- Filings scanned: 42
- Window: 2016-02-17 to 2026-04-24
- Themes tracked: 11
- Observations: 536
- Staged outcomes: 7

- **Demand**: 84 observation(s), latest 2026-04-24, assumption asm-ENkEBfSg
- **Liquidity**: 83 observation(s), latest 2026-04-24, assumption asm-dGcwZvEF
- **Supply chain**: 68 observation(s), latest 2026-04-24, assumption asm-qcAhVDVt
- **Regulation and legal**: 59 observation(s), latest 2026-04-24, assumption asm-fmUJaJ5m
- **Geopolitics and tariffs**: 54 observation(s), latest 2026-04-24, assumption asm-qsuv2tV3
- **Competition**: 53 observation(s), latest 2026-04-24, assumption asm-QC4w7zdT
- **Macro and foreign exchange**: 50 observation(s), latest 2026-04-24, assumption asm-EcMoPfNa
- **Customer and platform dependency**: 30 observation(s), latest 2024-04-26, assumption asm-3NumxF4J

### WBD

- Filings scanned: 41
- Window: 2016-02-18 to 2026-02-27
- Themes tracked: 12
- Observations: 514
- Staged outcomes: 2

- **Demand**: 82 observation(s), latest 2026-02-27, assumption asm-GY8sY5ge
- **Liquidity**: 82 observation(s), latest 2026-02-27, assumption asm-CKkzkocd
- **Macro and foreign exchange**: 75 observation(s), latest 2026-02-27, assumption asm-4a8c9YYa
- **Regulation and legal**: 58 observation(s), latest 2026-02-27, assumption asm-iVeAyyNH
- **Customer and platform dependency**: 57 observation(s), latest 2026-02-27, assumption asm-pyWSE6fE
- **Competition**: 40 observation(s), latest 2026-02-27, assumption asm-eXpHRrQr
- **Inventory and channel**: 39 observation(s), latest 2026-02-27, assumption asm-VmrZrPYS
- **Supply chain**: 39 observation(s), latest 2026-02-27, assumption asm-KQQCeduW

### ABNB

- Filings scanned: 21
- Window: 2021-02-26 to 2026-02-12
- Themes tracked: 12
- Observations: 342
- Staged outcomes: 0

- **Competition**: 42 observation(s), latest 2026-02-12, assumption asm-sDdgHQR7
- **Customer and platform dependency**: 42 observation(s), latest 2026-02-12, assumption asm-VaQDKpNC
- **Demand**: 42 observation(s), latest 2026-02-12, assumption asm-k1uM3Zeu
- **Regulation and legal**: 42 observation(s), latest 2026-02-12, assumption asm-cscDFapF
- **Liquidity**: 40 observation(s), latest 2026-02-12, assumption asm-no4PdwkJ
- **Macro and foreign exchange**: 40 observation(s), latest 2026-02-12, assumption asm-fKKxSKHu
- **Cloud and data center capacity**: 34 observation(s), latest 2026-02-12, assumption asm-eEpjuoTm
- **Geopolitics and tariffs**: 22 observation(s), latest 2026-02-12, assumption asm-3euGTgYT

### GOOGL

- Filings scanned: 42
- Window: 2016-02-11 to 2026-04-30
- Themes tracked: 12
- Observations: 711
- Staged outcomes: 0

- **AI, R&D, and technology**: 84 observation(s), latest 2026-04-30, assumption asm-aWH7uZAE
- **Demand**: 84 observation(s), latest 2026-04-30, assumption asm-ZdUnXqPQ
- **Macro and foreign exchange**: 84 observation(s), latest 2026-04-30, assumption asm-cgiKEvcN
- **Cloud and data center capacity**: 83 observation(s), latest 2026-04-30, assumption asm-ofhsdo1p
- **Competition**: 83 observation(s), latest 2026-04-30, assumption asm-NcDdzVnR
- **Regulation and legal**: 83 observation(s), latest 2026-04-30, assumption asm-jVUMVYoy
- **Liquidity**: 58 observation(s), latest 2026-04-30, assumption asm-fiiTg9bN
- **Inventory and channel**: 50 observation(s), latest 2026-04-30, assumption asm-VLBeYHJ8

### AVGO

- Filings scanned: 32
- Window: 2018-06-14 to 2026-03-11
- Themes tracked: 12
- Observations: 653
- Staged outcomes: 0

- **Cloud and data center capacity**: 64 observation(s), latest 2026-03-11, assumption asm-b1fJ1AUN
- **Demand**: 64 observation(s), latest 2026-03-11, assumption asm-GcYWRhWg
- **Liquidity**: 64 observation(s), latest 2026-03-11, assumption asm-LXzDpZwY
- **Inventory and channel**: 63 observation(s), latest 2026-03-11, assumption asm-1ntwTeQv
- **Customer and platform dependency**: 62 observation(s), latest 2026-03-11, assumption asm-DoMCjScg
- **Regulation and legal**: 61 observation(s), latest 2026-03-11, assumption asm-Yv1uKg9n
- **AI, R&D, and technology**: 58 observation(s), latest 2026-03-11, assumption asm-MCUcyamw
- **Supply chain**: 51 observation(s), latest 2026-03-11, assumption asm-wuVGw4ij

### DIS

- Filings scanned: 28
- Window: 2019-05-08 to 2026-02-02
- Themes tracked: 12
- Observations: 333
- Staged outcomes: 4

- **Demand**: 53 observation(s), latest 2026-02-02, assumption asm-6o8MAEsY
- **Regulation and legal**: 46 observation(s), latest 2026-02-02, assumption asm-K8rwQyCS
- **Macro and foreign exchange**: 40 observation(s), latest 2026-02-02, assumption asm-13tyLWKi
- **Liquidity**: 39 observation(s), latest 2026-02-02, assumption asm-cAuLNidr
- **Competition**: 32 observation(s), latest 2026-02-02, assumption asm-tZA5hLSt
- **Geopolitics and tariffs**: 24 observation(s), latest 2026-02-02, assumption asm-xakuDdYD
- **Supply chain**: 20 observation(s), latest 2025-08-06, assumption asm-aQPAtK7X
- **AI, R&D, and technology**: 18 observation(s), latest 2025-08-06, assumption asm-C8y7Vzh5

## Cross-Company Theme Matrix

| Theme | Companies | Observations | Latest Seen |
|---|---:|---:|---|
| Demand | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 2785 | 2026-05-01 |
| Liquidity | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 2606 | 2026-05-01 |
| Regulation and legal | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 2374 | 2026-05-01 |
| Macro and foreign exchange | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 2109 | 2026-05-01 |
| Supply chain | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1858 | 2026-05-01 |
| Competition | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1713 | 2026-05-01 |
| AI, R&D, and technology | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1459 | 2026-05-01 |
| Geopolitics and tariffs | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1350 | 2026-05-01 |
| Inventory and channel | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1438 | 2026-05-01 |
| Cloud and data center capacity | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1357 | 2026-05-01 |
| Customer and platform dependency | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, PM, SBUX, T, TJX, TMUS, TSLA, VZ, WBD, WMT | 1293 | 2026-05-01 |
| Cybersecurity and privacy | AAPL, ABNB, AMD, AMZN, AVGO, BKNG, CMCSA, COST, CSCO, DIS, EA, GOOGL, HD, INTC, KO, LOW, MAR, MCD, META, MO, MSFT, MU, NFLX, NVDA, ORCL, PEP, PG, PLTR, SBUX, T, TMUS, TSLA, VZ, WBD, WMT | 844 | 2026-05-01 |

## Sector Assumption Matrix

| Sector | Companies | Themes | Observations | Staged Outcomes | Top Shared Themes |
|---|---:|---:|---:|---:|---|
| Communication Services | 10 | 12 | 5374 | 19 | Demand, Liquidity, Regulation and legal, Macro and foreign exchange, Competition |
| Consumer Discretionary | 10 | 12 | 5501 | 9 | Demand, Liquidity, Macro and foreign exchange, Regulation and legal, Supply chain |
| Consumer Staples | 10 | 12 | 3899 | 13 | Demand, Liquidity, Regulation and legal, Supply chain, Macro and foreign exchange |
| Energy | 10 | 0 | 0 | 0 |  |
| Financials | 10 | 0 | 0 | 0 |  |
| Health Care | 10 | 0 | 0 | 0 |  |
| Industrials | 10 | 0 | 0 | 0 |  |
| Information Technology | 10 | 12 | 6412 | 14 | Demand, AI, R&D, and technology, Liquidity, Regulation and legal, Cloud and data center capacity |
| Materials | 10 | 0 | 0 | 0 |  |
| Real Estate | 10 | 0 | 0 | 0 |  |
| Utilities | 10 | 0 | 0 | 0 |  |

## Cross-Sector Mechanism Patterns

- **Geopolitics and tariffs / Geographic concentration or local disruption**: 4 sector(s), 25 company(ies), 896 observation(s), 12 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Inventory and channel / Platform or customer concentration**: 2 sector(s), 2 company(ies), 58 observation(s), 5 realized candidate(s).
  - Sectors: Consumer Discretionary, Information Technology
- **Demand / Consumer or end-market demand shock**: 4 sector(s), 6 company(ies), 408 observation(s), 4 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Supply chain / Geographic concentration or local disruption**: 3 sector(s), 4 company(ies), 214 observation(s), 4 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples
- **Supply chain / Single supplier or manufacturing concentration**: 2 sector(s), 3 company(ies), 142 observation(s), 3 realized candidate(s).
  - Sectors: Consumer Staples, Information Technology
- **Customer and platform dependency / Platform or customer concentration**: 4 sector(s), 26 company(ies), 1011 observation(s), 2 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Macro and foreign exchange / Geographic concentration or local disruption**: 4 sector(s), 12 company(ies), 741 observation(s), 2 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Supply chain / Capacity investment and operating expense drag**: 2 sector(s), 4 company(ies), 203 observation(s), 2 realized candidate(s).
  - Sectors: Communication Services, Information Technology
- **Liquidity / Interest, credit, or liquidity stress**: 4 sector(s), 13 company(ies), 925 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Regulation and legal / Regulatory investigation or litigation**: 4 sector(s), 9 company(ies), 615 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Cloud and data center capacity / Capacity investment and operating expense drag**: 4 sector(s), 15 company(ies), 480 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Cybersecurity and privacy / Data breach, outage, or service disruption**: 4 sector(s), 6 company(ies), 107 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples, Information Technology
- **Supply chain / Platform or customer concentration**: 3 sector(s), 4 company(ies), 176 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Information Technology
- **Demand / Geographic concentration or local disruption**: 2 sector(s), 2 company(ies), 164 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary
- **Macro and foreign exchange / Consumer or end-market demand shock**: 2 sector(s), 3 company(ies), 146 observation(s), 1 realized candidate(s).
  - Sectors: Consumer Staples, Information Technology
- **Demand / Capacity investment and operating expense drag**: 2 sector(s), 2 company(ies), 128 observation(s), 1 realized candidate(s).
  - Sectors: Consumer Discretionary, Information Technology
- **Inventory and channel / Capacity investment and operating expense drag**: 2 sector(s), 2 company(ies), 116 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Information Technology
- **Cybersecurity and privacy / Regulatory investigation or litigation**: 3 sector(s), 4 company(ies), 103 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples
- **Customer and platform dependency / Geographic concentration or local disruption**: 3 sector(s), 4 company(ies), 89 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Consumer Staples
- **Cybersecurity and privacy / Geographic concentration or local disruption**: 3 sector(s), 4 company(ies), 52 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Staples, Information Technology

## Observation Evidence Examples

- **GOOGL / AI, R&D, and technology** (2016-02-11, item-1a)
  - Source: sec-company://0001652044/0001652044-16-000012#item-1a:theme:ai-rd-technology:assumption
  - Our current and potential domestic and international competitors range from large and established companies to emerging start-ups. Established companies have longer operating histories and more established relationships with customers and users, and they can use their experiences and resources in wa
- **KO / Demand** (2016-02-25, item-1a)
  - Source: sec-company://0000021344/0000021344-16-000050#item-1a:theme:demand:assumption
  - Obesity concerns may reduce demand for some of our products.
- **PEP / Demand** (2016-02-11, item-1a)
  - Source: sec-company://0000077476/0000077476-16-000066#item-1a:theme:demand:assumption
  - Demand for our products may be adversely affected by changes in consumer preferences or any inability on our part to innovate or market our products effectively, and any significant reduction in demand could adversely affect our business, financial condition or results of operations.
- **AAPL / Demand** (2016-01-27, part-i-item-2)
  - Source: sec-company://0000320193/0001193125-16-439878#part-i-item-2:theme:demand:assumption
  - , a portfolio of consumer and professional software applications, iOS, OS X
- **VZ / Demand** (2016-02-23, item-1a)
  - Source: sec-company://0000732712/0001193125-16-473367#item-1a:theme:demand:assumption
  - subsidiaries, is one of the worlds leading providers of communications, information and entertainment products and services to consumers, businesses and governmental agencies. With a presence around the world, we offer voice, data and video
- **MO / Demand** (2016-02-25, item-1a)
  - Source: sec-company://0000764180/0000764180-16-000128#item-1a:theme:demand:assumption
  - Legal proceedings covering a wide range of matters are pending or threatened in various United States and foreign jurisdictions against Altria Group, Inc. and its subsidiaries, including PM USA and UST and its subsidiaries, as well as their respective indemnitees. Various types of claims may be rais

## Realized Outcome Review Events

55 staged candidate(s) grouped into 24 review event(s). Apply still operates on candidate IDs; groups are for review only.

- **KO** 2022-10-26: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-255h14jf
  - Representative source: sec-company://0000021344/0000021344-22-000042#part-i-item-2:theme:geopolitics-tariffs:outcome
  - During the nine months ended September 30, 2022, the Company recorded an other-than-temporary impairment charge of $96 million related to an equity method investee in Russia. As of September 30, 2022, the remaining carrying value of the Company's assets related to Russia and Ukraine was less than 0.
- **MU** 2024-10-04: 1 candidate(s), Supply chain
  - Candidate IDs: cout-n8rgakW6
  - Representative source: sec-company://0000723125/0000723125-24-000027#item-7:theme:supply-chain:outcome
  - We believe this approach to node migration and consequent wafer capacity reduction was adopted across the industry. We recognized period costs from fabrication facility underutilization of $382 million in 2023 and $165 million in the first quarter of 2024 due to wafer start reductions. Subsequently,
- **PM** 2023-02-10: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-fynsGdQk
  - Representative source: sec-company://0001413329/0001413329-23-000025#item-7:theme:geopolitics-tariffs:outcome
  - We recorded pre-tax charges related to the war in Ukraine of approximately $151 million in 2022 (including humanitarian efforts). This includes charges in Russia related to the cancellation of the planned launch of
- **PM** 2022-10-27: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-4pUPM9nU
  - Representative source: sec-company://0001413329/0001413329-22-000114#part-i-item-2:theme:geopolitics-tariffs:outcome
  - We recorded pre-tax charges related to the war in Ukraine of approximately $6 million in the third quarter of 2022 and approximately $128 million in the September year-to-date period. This includes charges in Russia related to the cancellation of the planned launch of
- **PM** 2022-07-29: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-yBsxhpgg
  - Representative source: sec-company://0001413329/0001413329-22-000072#part-i-item-2:theme:geopolitics-tariffs:outcome
  - We recorded charges related to the war in Ukraine of approximately $80 million in the second quarter of 2022 and approximately $122 million in the first half of 2022. This includes charges in Russia related to the cancellation of the planned launch of
- **WBD** 2025-05-08: 1 candidate(s), Demand
  - Candidate IDs: cout-2gso7KJ6
  - Representative source: sec-company://0001437107/0001437107-25-000096#part-i-item-2:theme:demand:outcome
  - Costs of revenues decreased 15% for the three months ended March 31, 2025, primarily attributable to a 41% decrease in theatrical product content expense, as a result of lower film costs commensurate with lower theatrical product revenue and lower payments to partners and participants, and a 66% dec
- **MCD** 2016-08-04: 1 candidate(s), Liquidity
  - Candidate IDs: cout-UkCnhUp1
  - Representative source: sec-company://0000063908/0000063908-16-000142#part-i-item-2:theme:liquidity:outcome
  - Results for the quarter and six months benefited from stronger operating performance and higher gains on sales of restaurant businesses. Both periods were impacted by approximately $230 million, or $0.20 per share, of strategic charges, consisting primarily of non-cash impairment charges incurred in
- **PM** 2024-04-26: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-fHbC6VNw
  - Representative source: sec-company://0001413329/0001413329-24-000087#part-i-item-2:theme:geopolitics-tariffs:outcome
  - – Following the termination of a distribution arrangement in the Middle East, we recorded a pre-tax charge of $80 million in the first quarter of 2023 (representing $70 million net of income tax and a diluted EPS charge of $0.04 per share). The pre-tax charge was recorded as a reduction of net reven
- **TJX** 2022-03-30: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-CFFZUQMx
  - Representative source: sec-company://0000109198/0000109198-22-000008#item-7:theme:geopolitics-tariffs:outcome
  - We account for our investment in Familia using the equity method of accounting. As of January 29, 2022, the carrying value of our investment in Familia was $186 million, which reflects the revaluing of the investment from Russian rubles to the U.S. dollar, resulting in a cumulative translation loss
- **TMUS** 2016-10-24: 1 candidate(s), Demand
  - Candidate IDs: cout-mibPR2Sf
  - Representative source: sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:demand:outcome
  - During the quarter ended and subsequent to September 30, 2016, a handset Original Equipment Manufacturer ("OEM") announced recalls on certain of its smartphone devices. As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable
- **TMUS** 2016-10-24: 1 candidate(s), Customer and platform dependency
  - Candidate IDs: cout-ybHov4a1
  - Representative source: sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:customer-platform-dependency:outcome
  - As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable value. The OEM has agreed to reimburse T-Mobile, as such, we have recorded an amount due from the OEM as an offset to the loss recorded in
- **VZ** 2020-04-27: 1 candidate(s), Demand
  - Candidate IDs: cout-tygeYzjs
  - Representative source: sec-company://0000732712/0000732712-20-000027#part-i-item-2:theme:demand:outcome
  - In Verizon Media, we experienced a decline in advertising and search revenue as advertisers paused or canceled campaigns during this period, and users searched for fewer commercial terms, providing less opportunity for monetization.
- **MSFT** 2016-10-20: 1 candidate(s), Demand
  - Candidate IDs: cout-8zSNs1oh
  - Representative source: sec-company://0000789019/0001193125-16-742796#part-i-item-2:theme:demand:outcome
  - Operating income included an unfavorable foreign currency impact of 5%. Gross margin decreased $563 million or 4%, driven by higher cost of revenue. Gross margin included an unfavorable
- **NFLX** 2025-07-18: 1 candidate(s), Demand
  - Candidate IDs: cout-tuYofcfL
  - Representative source: sec-company://0001065280/0001065280-25-000323#part-i-item-2:theme:demand:outcome
  - r the three months ended June 30, 2025 increased $978 million as compared to the prior comparative period, primarily due to a $1,172 million increase in operating income, driven by a $1,520 million increase in revenues and partially offset by a $151 million increase in cost of revenues primarily due
- **NFLX** 2025-04-18: 1 candidate(s), Demand
  - Candidate IDs: cout-tgtYW1HH
  - Representative source: sec-company://0001065280/0001065280-25-000176#part-i-item-2:theme:demand:outcome
  - increased $558 million as compared to the prior comparative period, primarily due to a $714 million increase in operating income, driven by a $1,172 million increase in revenues and partially offset by a $286 million increase in cost of revenues primarily due to the increase in content amortization.
- **WMT** 2017-03-31: 1 candidate(s), Inventory and channel
  - Candidate IDs: cout-22Ztexb6
  - Representative source: sec-company://0000104169/0000104169-17-000021#item-1a:theme:inventory-channel:outcome
  - In light of the substantial premiums payable for insurance coverage for losses caused by certain natural disasters, such as hurricanes, cyclones, typhoons, tropical storms, earthquakes, floods and tsunamis, as well as the limitations on available coverage for such losses, we have chosen to be primar
- **HD** 2024-08-20: 1 candidate(s), Demand
  - Candidate IDs: cout-xqjTni51
  - Representative source: sec-company://0000354950/0000354950-24-000201#part-i-item-2:theme:demand:outcome
  - Depreciation and amortization for the second quarter of fiscal 2024 increased $85 million, or 13.0%, to $738 million from $653 million for the second quarter of fiscal 2023. As a percentage of net sales, depreciation and amortization was 1.7% for the second quarter of fiscal 2024 compared to 1.5% fo
- **MSFT** 2020-04-29: 1 candidate(s), Liquidity
  - Candidate IDs: cout-sYG7DHXL
  - Representative source: sec-company://0000789019/0001564590-20-019706#part-i-item-2:theme:liquidity:outcome
  - Sales and marketing expenses increased $346 million or 8%, driven by investments in LinkedIn and commercial sales, as well as an increase in bad debt expense.
- **NFLX** 2026-04-17: 1 candidate(s), Demand
  - Candidate IDs: cout-EdbcVB6t
  - Representative source: sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil
- **NFLX** 2025-10-22: 1 candidate(s), Demand
  - Candidate IDs: cout-ZnjYmKtK
  - Representative source: sec-company://0001065280/0001065280-25-000406#part-i-item-2:theme:demand:outcome
  - r the three months ended September 30, 2025 increased $183 million as compared to the prior comparative period, primarily due to a $339 million increase in operating income, driven by a $1,686 million increase in revenues and partially offset by a $1,044 million increase in cost of revenues primaril
- **NFLX** 2024-04-22: 1 candidate(s), Demand
  - Candidate IDs: cout-SoKXEF1c
  - Representative source: sec-company://0001065280/0001065280-24-000128#part-i-item-2:theme:demand:outcome
  - The increase in cost of revenues for the three months ended March 31, 2024 as compared to the three months ended March 31, 2023 is primarily due to a $211 million increase in content amortization relating to our existing and new content, partially offset by a $38 million decrease in other cost of re
- **KO** 2024-02-20: 1 candidate(s), Demand
  - Candidate IDs: cout-pLrEFLiU
  - Representative source: sec-company://0000021344/0000021344-24-000009#item-1a:theme:demand:outcome
  - Geopolitical instability may also lead to heightened security risk, impacting employee safety and/or damage to infrastructure or our assets. At times, we have faced product boycotts resulting from activism, which have reduced demand for our products. Restrictions on our ability to transfer earnings
- **MAR** 2020-11-06: 1 candidate(s), Liquidity
  - Candidate IDs: cout-v6UCJTdD
  - Representative source: sec-company://0001048286/0001628280-20-015909#part-ii-item-1a:theme:liquidity:outcome
  - we recorded a provision for credit losses of $
- **MSFT** 2017-04-27: 1 candidate(s), Demand
  - Candidate IDs: cout-quUySYaJ
  - Representative source: sec-company://0000789019/0001564590-17-007547#part-i-item-2:theme:demand:outcome
  - Operating income included an unfavorable foreign currency impact of 3%. Gross margin increased $1.2 billion or 10%, driven by higher revenue, offset in part by higher cost of revenue.

## Realized Outcome Candidates

These candidates are staged for human review. Applying them requires company.apply_outcomes.

- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001045810/0001045810-20-000065#part-i-item-2:theme:supply-chain:outcome)
  - During the first quarter of fiscal year 2021, we experienced disruptions to our supply chain and logistical services provided by outsourcing partners and component supply, primarily based in Asia. These disruptions adversely impacted our linearity of supply and sales within the quarter.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001045810/0001045810-20-000065#part-ii-item-1a:theme:supply-chain:outcome)
  - impact, our workforce and operations, the operations of our customers and our partners, and those of our respective vendors and suppliers (including our subcontractors and third-party contract manufacturers). For example, during the first quarter of fiscal year 2021, we experienced disruptions to ou
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001193125-16-742796#part-i-item-2:theme:demand:outcome)
  - Operating income included an unfavorable foreign currency impact of 5%. Gross margin decreased $563 million or 4%, driven by higher cost of revenue. Gross margin included an unfavorable
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001564590-17-007547#part-i-item-2:theme:demand:outcome)
  - Operating income included an unfavorable foreign currency impact of 3%. Gross margin increased $1.2 billion or 10%, driven by higher revenue, offset in part by higher cost of revenue.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001564590-18-019062#item-7:theme:ai-rd-technology:outcome)
  - Operating income increased $2.9 billion or 11%, primarily due to higher gross margin and lower impairment and restructuring expenses, offset in part by an increase in research and development and sales and marketing expenses. Operating income included an operating loss of $924 million related to the
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001564590-20-019706#part-i-item-2:theme:liquidity:outcome)
  - Sales and marketing expenses increased $346 million or 8%, driven by investments in LinkedIn and commercial sales, as well as an increase in bad debt expense.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-21-000012#part-i-item-2:theme:demand:outcome)
  - The ultimate severity and duration of these economic repercussions, including any resulting impact on our business, remain largely unknown and ultimately will depend on many factors. As a result, we have experienced volatility in the markets that our products are sold into, driven by the move to a s
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-21-000052#part-i-item-2:theme:inventory-channel:outcome)
  - In the third quarter of 2021, we recognized a charge of $435 million included in restructure and asset impairments (and a tax benefit of $104 million included in income tax (provision) benefit) to write down the assets held for sale to the expected consideration, net of estimated selling costs, to b
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-21-000065#item-7:theme:inventory-channel:outcome)
  - the expected consideration, net of estimated selling costs, to be realized from the sale of these assets and liabilities. In the second quarter of 2021, we also recognized a charge of $49 million to cost of goods sold to write down 3D XPoint inventory due to our decision to cease further development
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-22-000048#item-7:theme:inventory-channel:outcome)
  - In 2021, we recognized a charge of $435 million included in restructure and asset impairments in connection with the definitive agreement with TI (and a tax benefit of $104 million included in income tax (provision) benefit) to write down the assets held for sale to the expected consideration, net o
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-23-000022#part-i-item-2:theme:ai-rd-technology:outcome)
  - We expect the plan to be substantially completed by the end of the third quarter of 2023. As a result of the 2023 Restructure Plan, we expect to realize cost savings of approximately $130 million per quarter (approximately 60% in cost of goods sold, 30% in R&D, and 10% in SG&A) starting in the fourt
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-23-000022#part-i-item-2:theme:inventory-channel:outcome)
  - As a result of these conditions and increases in our inventory levels, we have reduced wafer starts and capital expenditures. We recognized $27 million of period costs from underutilization in the second quarter of 2023 due to wafer start reductions.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-24-000027#item-7:theme:supply-chain:outcome)
  - We believe this approach to node migration and consequent wafer capacity reduction was adopted across the industry. We recognized period costs from fabrication facility underutilization of $382 million in 2023 and $165 million in the first quarter of 2024 due to wafer start reductions. Subsequently,
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000723125/0000723125-24-000027#item-7:theme:demand:outcome)
  - These conditions, which began in the fourth quarter of 2022 and persisted into early 2024, led to significant reductions in average selling prices for both DRAM and NAND and reductions in bit shipments for DRAM. We experienced declines in revenue across all our business segments and nearly all our e
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001564590-21-004599#item-1a:theme:supply-chain:outcome)
  - Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing processes and reducing costs. If we are not successful in achieving these goals, we could face delay
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001628280-25-018911#part-i-item-2:theme:demand:outcome)
  - During the three months ended March 31, 2025, we recognized total revenues of $19.34 billion, representing a decrease of $1.97 billion compared to the same period in the prior year. During the three months ended March 31, 2025, our net income attributable to common stockholders was $409 million, rep
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001628280-25-045968#part-i-item-2:theme:demand:outcome)
  - During the three and nine months ended September 30, 2025, we recognized total revenues of $28.10 billion and $69.93 billion, respectively, representing an increase of $2.91 billion and a decrease of $2.06 billion, respectively, compared to the same periods in the prior year. During the three and ni
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001628280-26-003952#item-7:theme:demand:outcome)
  - In 2025, we recognized total revenues of $94.83 billion, representing a decrease of $2.86 billion compared to the prior year. In 2025, our net income attributable to common stockholders was $3.79 billion, representing a decrease of $3.30 billion compared to the prior year.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000354950/0000354950-24-000201#part-i-item-2:theme:demand:outcome)
  - Depreciation and amortization for the second quarter of fiscal 2024 increased $85 million, or 13.0%, to $738 million from $653 million for the second quarter of fiscal 2023. As a percentage of net sales, depreciation and amortization was 1.7% for the second quarter of fiscal 2024 compared to 1.5% fo
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000063908/0000063908-16-000142#part-i-item-2:theme:liquidity:outcome)
  - Results for the quarter and six months benefited from stronger operating performance and higher gains on sales of restaurant businesses. Both periods were impacted by approximately $230 million, or $0.20 per share, of strategic charges, consisting primarily of non-cash impairment charges incurred in
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000109198/0000109198-22-000008#item-7:theme:geopolitics-tariffs:outcome)
  - We account for our investment in Familia using the equity method of accounting. As of January 29, 2022, the carrying value of our investment in Familia was $186 million, which reflects the revaluing of the investment from Russian rubles to the U.S. dollar, resulting in a cumulative translation loss
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000060667/0000060667-19-000042#item-7:theme:liquidity:outcome)
  - In addition, our fourth quarter annual goodwill impairment review resulted in a non-cash goodwill impairment charge of $952 million related to our Canadian operations (Canadian goodwill impairment). Given the softening outlook for the Canadian housing market, we determined that the book value of thi
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001048286/0001628280-20-015909#part-ii-item-1a:theme:liquidity:outcome)
  - we recorded a provision for credit losses of $
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001326801-20-000048#part-ii-item-1a:theme:demand:outcome)
  - These measures have caused, and are continuing to cause, business slowdowns or shutdowns in affected areas, both regionally and worldwide, which have significantly impacted our business and results of operations. In the first quarter of 2020, our advertising revenue grew 17% year-over-year, which wa
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001326801-22-000018#item-7:theme:demand:outcome)
  - The COVID-19 pandemic has also had a varied impact on the demand for and pricing of our ads from period to period. While we experienced a reduction in demand and a related decline in pricing during the onset of the pandemic, we believe the pandemic subsequently contributed to an acceleration in the
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001326801-22-000057#part-i-item-2:theme:demand:outcome)
  - The COVID-19 pandemic has also impacted our business and results of operations, with a varied impact on the demand for and pricing of our ads from period to period. While we experienced a reduction in advertising demand and a related decline in pricing during the onset of the pandemic, we believe th
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001326801-22-000108#part-i-item-2:theme:demand:outcome)
  - The COVID-19 pandemic has also impacted our business and results of operations, with a varied impact on user growth and engagement, as well as the demand for and pricing of our ads from period to period. While we experienced a reduction in advertising demand and a related decline in pricing during t
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001326801-22-000108#part-i-item-2:theme:macro-fx:outcome)
  - , which we believe was primarily driven by reduced marketer spending as a result of a more challenging macroeconomic environment. In addition, because the targeting and measurement challenges associated with iOS changes had already begun in the third quarter of 2021, the impact of these challenges o
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-24-000128#part-i-item-2:theme:demand:outcome)
  - The increase in cost of revenues for the three months ended March 31, 2024 as compared to the three months ended March 31, 2023 is primarily due to a $211 million increase in content amortization relating to our existing and new content, partially offset by a $38 million decrease in other cost of re
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-25-000176#part-i-item-2:theme:demand:outcome)
  - increased $558 million as compared to the prior comparative period, primarily due to a $714 million increase in operating income, driven by a $1,172 million increase in revenues and partially offset by a $286 million increase in cost of revenues primarily due to the increase in content amortization.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-25-000323#part-i-item-2:theme:demand:outcome)
  - r the three months ended June 30, 2025 increased $978 million as compared to the prior comparative period, primarily due to a $1,172 million increase in operating income, driven by a $1,520 million increase in revenues and partially offset by a $151 million increase in cost of revenues primarily due
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-25-000406#part-i-item-2:theme:demand:outcome)
  - r the three months ended September 30, 2025 increased $183 million as compared to the prior comparative period, primarily due to a $339 million increase in operating income, driven by a $1,686 million increase in revenues and partially offset by a $1,044 million increase in cost of revenues primaril
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome)
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:demand:outcome)
  - During the quarter ended and subsequent to September 30, 2016, a handset Original Equipment Manufacturer ("OEM") announced recalls on certain of its smartphone devices. As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001283699/0001283699-16-000115#part-i-item-2:theme:customer-platform-dependency:outcome)
  - As a result, we recorded no revenue associated with the device sales to customers and impaired the devices to their net realizable value. The OEM has agreed to reimburse T-Mobile, as such, we have recorded an amount due from the OEM as an offset to the loss recorded in
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000732712/0000732712-20-000027#part-i-item-2:theme:demand:outcome)
  - In Verizon Media, we experienced a decline in advertising and search revenue as advertisers paused or canceled campaigns during this period, and users searched for fewer commercial terms, providing less opportunity for monetization.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001744489/0001744489-24-000152#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - In the prior-year period, the Company recorded charges of $221 million primarily for severance and costs related to exiting our businesses in Russia.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001744489/0001744489-24-000232#part-i-item-2:theme:demand:outcome)
  - Revenues for the quarter increased 4%, or $0.8 billion, to $23.2 billion; net income attributable to Disney increased to income of $2.6 billion in the current quarter compared to a loss of $0.5 billion in the prior-year quarter; and diluted earnings per share (EPS) attributable to Disney increased t
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001744489/0001744489-24-000232#part-i-item-2:theme:regulation-legal:outcome)
  - Other expense, net of $11 million reflecting a charge of $101 million related to a legal ruling, partially offset by a DraftKings Gain of $90 million
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001744489/0001744489-24-000232#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - In the prior-year period, the Company recorded $2,871 million of charges including the Content Impairment, severance and costs related to exiting our businesses in Russia.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001437107/0001437107-22-000031#item-7:theme:regulation-legal:outcome)
  - The pandemic did not have a significant impact on demand during fiscal year 2021. Many of our third-party production partners that were shut down during most of the second quarter of 2020 due to COVID-19 restrictions came back online in the third quarter of 2020 and, as a result, we have incurred ad
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001437107/0001437107-25-000096#part-i-item-2:theme:demand:outcome)
  - Costs of revenues decreased 15% for the three months ended March 31, 2025, primarily attributable to a 41% decrease in theatrical product content expense, as a result of lower film costs commensurate with lower theatrical product revenue and lower payments to partners and participants, and a 66% dec
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000104169/0000104169-17-000021#item-1a:theme:inventory-channel:outcome)
  - In light of the substantial premiums payable for insurance coverage for losses caused by certain natural disasters, such as hurricanes, cyclones, typhoons, tropical storms, earthquakes, floods and tsunamis, as well as the limitations on available coverage for such losses, we have chosen to be primar
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000021344/0000021344-22-000042#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - During the nine months ended September 30, 2022, the Company recorded an other-than-temporary impairment charge of $96 million related to an equity method investee in Russia. As of September 30, 2022, the remaining carrying value of the Company's assets related to Russia and Ukraine was less than 0.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000021344/0000021344-24-000009#item-1a:theme:demand:outcome)
  - Geopolitical instability may also lead to heightened security risk, impacting employee safety and/or damage to infrastructure or our assets. At times, we have faced product boycotts resulting from activism, which have reduced demand for our products. Restrictions on our ability to transfer earnings
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-18-000007#item-7:theme:supply-chain:outcome)
  - In connection with these elements of the Tax Cuts and Jobs Act, we recognized a provisional expense of $1.6 billion, which was included as a component of income tax expense as follows:
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-20-000062#part-i-item-2:theme:supply-chain:outcome)
  - r $0.04 per share impact on diluted EPS) during the nine months ended September 30, 2020, related to the organizational design optimization plan primarily in Switzerland. We recorded pre-tax asset impairment and exit costs of $65 million (or $0.03 per share impact on diluted EPS) during the nine mon
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-21-000091#part-i-item-2:theme:ai-rd-technology:outcome)
  - At the date of acquisition, we determined that the acquired IPR&D had no alternative future use. As a result, we recorded a pre-tax charge of $51 million (representing a $0.03 charge to diluted EPS) to research and development costs within marketing, administration and research costs in the condense
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-22-000072#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - We recorded charges related to the war in Ukraine of approximately $80 million in the second quarter of 2022 and approximately $122 million in the first half of 2022. This includes charges in Russia related to the cancellation of the planned launch of
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-22-000114#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - We recorded pre-tax charges related to the war in Ukraine of approximately $6 million in the third quarter of 2022 and approximately $128 million in the September year-to-date period. This includes charges in Russia related to the cancellation of the planned launch of
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-23-000025#item-7:theme:geopolitics-tariffs:outcome)
  - We recorded pre-tax charges related to the war in Ukraine of approximately $151 million in 2022 (including humanitarian efforts). This includes charges in Russia related to the cancellation of the planned launch of
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001413329/0001413329-24-000087#part-i-item-2:theme:geopolitics-tariffs:outcome)
  - – Following the termination of a distribution arrangement in the Middle East, we recorded a pre-tax charge of $80 million in the first quarter of 2023 (representing $70 million net of income tax and a diluted EPS charge of $0.04 per share). The pre-tax charge was recorded as a reduction of net reven
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000764180/0000764180-20-000106#part-i-item-2:theme:liquidity:outcome)
  - Altria considered the impact of COVID-19 on the business of JUUL Labs, Inc. ("JUUL"), including its sales, distribution, operations, supply chain and liquidity, in conducting its periodic impairment assessment. While the impact of COVID-19 was considered in our quantitative valuation that resulted i
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000764180/0000764180-22-000044#part-i-item-2:theme:supply-chain:outcome)
  - The economic and business repercussions of COVID-19 have been compounded by the Russian invasion of Ukraine. While our operating companies focus on the manufacture and sale of tobacco products in the United States and have little direct exposure to the impacted regions, we have experienced negative
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000764180/0000764180-25-000049#part-i-item-2:theme:liquidity:outcome)
  - became effective March 31, 2025. As a result, we performed an interim impairment assessment for the e-vapor reporting unit and recorded a non-cash impairment of our e-vapor reporting unit goodwill. For further discussion, see Note 4.

## Source Themes

- **AMD / AI, R&D, and technology**: first 2016-02-18, latest 2026-02-04, assumption asm-YZqMAAdx
- **AMD / Cloud and data center capacity**: first 2016-02-18, latest 2026-02-04, assumption asm-Vc3UnXrd
- **AMD / Competition**: first 2016-02-18, latest 2026-02-04, assumption asm-6USJ5rRZ
- **AMD / Customer and platform dependency**: first 2016-02-18, latest 2026-02-04, assumption asm-M8Xsoi1Q
- **AMD / Cybersecurity and privacy**: first 2016-02-18, latest 2026-02-04, assumption asm-ofZhZBPF
- **AMD / Demand**: first 2016-02-18, latest 2026-02-04, assumption asm-MM6Hc6gr
- **AMD / Geopolitics and tariffs**: first 2016-04-28, latest 2026-02-04, assumption asm-tFb8q31Y
- **AMD / Inventory and channel**: first 2016-02-18, latest 2026-02-04, assumption asm-cX6hzDj2
- **AMD / Liquidity**: first 2016-02-18, latest 2026-02-04, assumption asm-E1S8hNjw
- **AMD / Macro and foreign exchange**: first 2016-02-18, latest 2026-02-04, assumption asm-twCPY7xY
- **AMD / Regulation and legal**: first 2016-02-18, latest 2026-02-04, assumption asm-UMyfURLG
- **AMD / Supply chain**: first 2016-02-18, latest 2026-02-04, assumption asm-Eesv17uF
- **KO / AI, R&D, and technology**: first 2016-02-25, latest 2026-04-30, assumption asm-Eny9pPGh
- **KO / Cloud and data center capacity**: first 2016-02-25, latest 2026-02-20, assumption asm-wokVnw2K
- **KO / Competition**: first 2016-02-25, latest 2026-04-30, assumption asm-wLkWjgS4
- **KO / Customer and platform dependency**: first 2019-02-21, latest 2026-02-20, assumption asm-MDcuF25U
- **KO / Cybersecurity and privacy**: first 2018-02-23, latest 2026-02-20, assumption asm-5rDSDAjD
- **KO / Demand**: first 2016-02-25, latest 2026-04-30, assumption asm-5B3UtjSr
- **KO / Geopolitics and tariffs**: first 2016-10-27, latest 2026-02-20, assumption asm-mkYzo5Ud
- **KO / Inventory and channel**: first 2016-02-25, latest 2026-04-30, assumption asm-4o6cP28W
- **KO / Liquidity**: first 2016-02-25, latest 2026-04-30, assumption asm-VHwYXgcz
- **KO / Macro and foreign exchange**: first 2016-02-25, latest 2026-04-30, assumption asm-LUzMWzaf
- **KO / Regulation and legal**: first 2016-02-25, latest 2026-04-30, assumption asm-pzkApQ3D
- **KO / Supply chain**: first 2016-02-25, latest 2026-04-30, assumption asm-8PrAsUNA
- **INTC / AI, R&D, and technology**: first 2016-02-12, latest 2017-10-26, assumption asm-qGbyzbxQ
- **INTC / Cloud and data center capacity**: first 2016-02-12, latest 2017-10-26, assumption asm-tLcP6T72
- **INTC / Competition**: first 2016-02-12, latest 2017-02-17, assumption asm-ySL1kaFK
- **INTC / Customer and platform dependency**: first 2016-02-12, latest 2017-10-26, assumption asm-vzCKnHAd
- **INTC / Cybersecurity and privacy**: first 2016-02-12, latest 2026-01-23, assumption asm-WPzrLCVY
- **INTC / Demand**: first 2016-02-12, latest 2017-10-26, assumption asm-fZWuLM4W
- **INTC / Geopolitics and tariffs**: first 2016-02-12, latest 2017-04-27, assumption asm-7MkzdTD7
- **INTC / Inventory and channel**: first 2016-02-12, latest 2017-10-26, assumption asm-3tdVousy
- **INTC / Liquidity**: first 2016-02-12, latest 2026-04-24, assumption asm-TPsPEwFm
- **INTC / Macro and foreign exchange**: first 2016-02-12, latest 2017-10-26, assumption asm-n7mBdTkt
- **INTC / Regulation and legal**: first 2016-02-12, latest 2026-04-24, assumption asm-nWMnsLFe
- **INTC / Supply chain**: first 2016-02-12, latest 2017-10-26, assumption asm-9QhzcdTk
- **LOW / AI, R&D, and technology**: first 2016-03-29, latest 2026-03-23, assumption asm-NrMbszbS
- **LOW / Cloud and data center capacity**: first 2018-04-02, latest 2026-03-23, assumption asm-VNpBLQpV
- **LOW / Competition**: first 2016-03-29, latest 2026-03-23, assumption asm-Q3KwonZ9
- **LOW / Customer and platform dependency**: first 2017-04-04, latest 2026-03-23, assumption asm-UyZHjrB2
- **LOW / Cybersecurity and privacy**: first 2016-03-29, latest 2026-03-23, assumption asm-7AcscZFS
- **LOW / Demand**: first 2016-03-29, latest 2026-03-23, assumption asm-2bsXCx1z
- **LOW / Geopolitics and tariffs**: first 2016-03-29, latest 2026-03-23, assumption asm-SXfx7kfb
- **LOW / Inventory and channel**: first 2016-03-29, latest 2026-03-23, assumption asm-FZY4k5Kg
- **LOW / Liquidity**: first 2016-03-29, latest 2026-03-23, assumption asm-c1UaX4xS
- **LOW / Macro and foreign exchange**: first 2016-05-31, latest 2026-03-23, assumption asm-n1JkTZiU
- **LOW / Regulation and legal**: first 2016-03-29, latest 2026-03-23, assumption asm-RvnDU8Y8
- **LOW / Supply chain**: first 2016-03-29, latest 2026-03-23, assumption asm-2JkyVQb8
- **MCD / AI, R&D, and technology**: first 2016-02-25, latest 2025-11-05, assumption asm-yP8FEAiY
- **MCD / Cloud and data center capacity**: first 2016-02-25, latest 2022-05-02, assumption asm-Z263anUZ
- **MCD / Competition**: first 2016-02-25, latest 2025-11-05, assumption asm-TaAReeC4
- **MCD / Customer and platform dependency**: first 2016-05-06, latest 2025-11-05, assumption asm-ACwDN3nH
- **MCD / Cybersecurity and privacy**: first 2024-02-22, latest 2026-02-24, assumption asm-bom82iHX
- **MCD / Demand**: first 2016-02-25, latest 2025-11-05, assumption asm-n6h4Xk4Y
- **MCD / Geopolitics and tariffs**: first 2016-02-25, latest 2025-11-05, assumption asm-xpQWPuVt
- **MCD / Inventory and channel**: first 2016-02-25, latest 2019-11-04, assumption asm-4vBpF9Ju
- **MCD / Liquidity**: first 2016-02-25, latest 2025-11-05, assumption asm-sfuU8h2r
- **MCD / Macro and foreign exchange**: first 2016-02-25, latest 2025-11-05, assumption asm-yH5YJvzD
- **MCD / Regulation and legal**: first 2016-02-25, latest 2026-02-24, assumption asm-cdaZZ8c6
- **MCD / Supply chain**: first 2016-02-25, latest 2025-11-05, assumption asm-ZXtE58Qr
- **PEP / AI, R&D, and technology**: first 2016-02-11, latest 2026-02-03, assumption asm-SYbLMQjZ
- **PEP / Cloud and data center capacity**: first 2019-02-15, latest 2026-02-03, assumption asm-r6z3egkN
- **PEP / Competition**: first 2016-02-11, latest 2026-02-03, assumption asm-G7W6asH4
- **PEP / Customer and platform dependency**: first 2021-02-11, latest 2026-02-03, assumption asm-Nk8rs43r
- **PEP / Cybersecurity and privacy**: first 2016-02-11, latest 2026-04-16, assumption asm-VcMrtKBQ
- **PEP / Demand**: first 2016-02-11, latest 2026-04-16, assumption asm-EttqoebR
- **PEP / Geopolitics and tariffs**: first 2016-02-11, latest 2026-04-16, assumption asm-omkTzJvr
- **PEP / Inventory and channel**: first 2016-02-11, latest 2026-02-03, assumption asm-BxG39TaM
- **PEP / Liquidity**: first 2016-02-11, latest 2026-04-16, assumption asm-wLsugjzr
- **PEP / Macro and foreign exchange**: first 2016-02-11, latest 2026-04-16, assumption asm-aunCsZFj
- **PEP / Regulation and legal**: first 2016-02-11, latest 2026-04-16, assumption asm-uqZsL8Rj
- **PEP / Supply chain**: first 2016-02-11, latest 2026-04-16, assumption asm-2ZCThYZi
- **PG / AI, R&D, and technology**: first 2016-01-26, latest 2026-04-24, assumption asm-C8UQhXLB
- **PG / Competition**: first 2016-01-26, latest 2026-04-24, assumption asm-W9cZ2Hr6
- **PG / Customer and platform dependency**: first 2021-08-06, latest 2026-04-24, assumption asm-taxdB6zh
- **PG / Cybersecurity and privacy**: first 2016-01-26, latest 2026-04-24, assumption asm-JpxwW77p
- **PG / Demand**: first 2016-01-26, latest 2026-04-24, assumption asm-BgMcSnir
- **PG / Geopolitics and tariffs**: first 2016-08-09, latest 2026-04-24, assumption asm-842thQ7Z
- **PG / Inventory and channel**: first 2016-01-26, latest 2026-04-24, assumption asm-b8Th3fBK
- **PG / Liquidity**: first 2016-01-26, latest 2026-04-24, assumption asm-tuW4CzkJ
- **PG / Macro and foreign exchange**: first 2016-01-26, latest 2026-04-24, assumption asm-vhvWW7Y8
- **PG / Regulation and legal**: first 2016-01-26, latest 2026-04-24, assumption asm-x2zkgzBa
- **PG / Supply chain**: first 2016-01-26, latest 2026-04-24, assumption asm-f5Lj2fiq
- **WMT / AI, R&D, and technology**: first 2016-12-01, latest 2026-03-13, assumption asm-qmzrbdnQ
- **WMT / Cloud and data center capacity**: first 2016-06-03, latest 2026-03-13, assumption asm-svGGWLZW
- **WMT / Competition**: first 2016-03-30, latest 2026-03-13, assumption asm-tkJE9ARS
- **WMT / Customer and platform dependency**: first 2017-03-31, latest 2026-03-13, assumption asm-Wrv39kRv
- **WMT / Cybersecurity and privacy**: first 2016-06-03, latest 2026-03-13, assumption asm-tvywg35H
- **WMT / Demand**: first 2016-03-30, latest 2026-03-13, assumption asm-cvCS8mqh
- **WMT / Geopolitics and tariffs**: first 2016-06-03, latest 2026-03-13, assumption asm-XgTNDGLM
- **WMT / Inventory and channel**: first 2016-03-30, latest 2026-03-13, assumption asm-rLgC687v
- **WMT / Liquidity**: first 2016-03-30, latest 2026-03-13, assumption asm-TdCfCYWy
- **WMT / Macro and foreign exchange**: first 2016-03-30, latest 2026-03-13, assumption asm-CmkdeW2a
- **WMT / Regulation and legal**: first 2016-03-30, latest 2026-03-13, assumption asm-hFxnyU2j
- **WMT / Supply chain**: first 2016-03-30, latest 2026-03-13, assumption asm-RQqF2iAr
- **TJX / AI, R&D, and technology**: first 2025-04-02, latest 2026-03-31, assumption asm-NQCjxBRg
- **TJX / Cloud and data center capacity**: first 2016-03-29, latest 2023-03-29, assumption asm-V79zaAYn
- **TJX / Competition**: first 2016-03-29, latest 2026-03-31, assumption asm-cJV54dWm
- **TJX / Customer and platform dependency**: first 2019-04-03, latest 2026-03-31, assumption asm-eUammXGn
- **TJX / Demand**: first 2016-03-29, latest 2026-03-31, assumption asm-s1DMMs1D
- **TJX / Geopolitics and tariffs**: first 2019-12-03, latest 2026-03-31, assumption asm-GtYjUncm
- **TJX / Inventory and channel**: first 2016-03-29, latest 2026-03-31, assumption asm-Pw3aRPMq
- **TJX / Liquidity**: first 2016-03-29, latest 2026-03-31, assumption asm-YS9U4MTJ
- **TJX / Macro and foreign exchange**: first 2016-03-29, latest 2026-03-31, assumption asm-AaKimrur
- **TJX / Regulation and legal**: first 2016-03-29, latest 2026-03-31, assumption asm-EpxtKNbh
- **TJX / Supply chain**: first 2016-03-29, latest 2026-03-31, assumption asm-HjKpY9y2
- **AAPL / AI, R&D, and technology**: first 2016-01-27, latest 2026-05-01, assumption asm-K7yH9uXU
- **AAPL / Cloud and data center capacity**: first 2016-01-27, latest 2026-05-01, assumption asm-Dh2ntKH6
- **AAPL / Competition**: first 2016-01-27, latest 2026-05-01, assumption asm-NB2fr9pi
- **AAPL / Customer and platform dependency**: first 2016-01-27, latest 2026-05-01, assumption asm-hPkWQPGc
- **AAPL / Cybersecurity and privacy**: first 2021-10-29, latest 2026-05-01, assumption asm-sveCG9sr
- **AAPL / Demand**: first 2016-01-27, latest 2026-05-01, assumption asm-mB3Z4msd
- **AAPL / Geopolitics and tariffs**: first 2016-01-27, latest 2026-05-01, assumption asm-6eLPnrAX
- **AAPL / Inventory and channel**: first 2016-01-27, latest 2026-05-01, assumption asm-kAXYVk2E
- **AAPL / Liquidity**: first 2016-01-27, latest 2026-05-01, assumption asm-Ci3UyXkx
- **AAPL / Macro and foreign exchange**: first 2016-01-27, latest 2026-05-01, assumption asm-yxrE5cms
- **AAPL / Regulation and legal**: first 2016-01-27, latest 2026-05-01, assumption asm-ZbiY6z1v
- **AAPL / Supply chain**: first 2016-01-27, latest 2026-05-01, assumption asm-yY6f8ynA
- **HD / AI, R&D, and technology**: first 2016-05-24, latest 2026-03-18, assumption asm-fCxUqAW4
- **HD / Cloud and data center capacity**: first 2018-03-22, latest 2026-03-18, assumption asm-eyhLVatQ
- **HD / Competition**: first 2016-03-24, latest 2026-03-18, assumption asm-H4c83tdg
- **HD / Customer and platform dependency**: first 2016-05-24, latest 2026-03-18, assumption asm-sv84NitK
- **HD / Cybersecurity and privacy**: first 2016-03-24, latest 2026-03-18, assumption asm-tCv4Rh7b
- **HD / Demand**: first 2016-03-24, latest 2026-03-18, assumption asm-XBSku9xU
- **HD / Geopolitics and tariffs**: first 2019-08-27, latest 2026-03-18, assumption asm-KPCgwrwa
- **HD / Inventory and channel**: first 2016-03-24, latest 2026-03-18, assumption asm-RqRzVoBY
- **HD / Liquidity**: first 2016-03-24, latest 2026-03-18, assumption asm-TFmHzJEj
- **HD / Macro and foreign exchange**: first 2016-03-24, latest 2026-03-18, assumption asm-baDQqB4o
- **HD / Regulation and legal**: first 2016-03-24, latest 2026-03-18, assumption asm-e4CubdhJ
- **HD / Supply chain**: first 2016-03-24, latest 2026-03-18, assumption asm-fPQrCJDg
- **EA / AI, R&D, and technology**: first 2016-02-08, latest 2026-02-03, assumption asm-TjYtzgef
- **EA / Cloud and data center capacity**: first 2016-02-08, latest 2025-05-13, assumption asm-4QCNUcbf
- **EA / Competition**: first 2016-02-08, latest 2026-02-03, assumption asm-Mndus4RU
- **EA / Customer and platform dependency**: first 2016-02-08, latest 2026-02-03, assumption asm-r3FWa1c1
- **EA / Cybersecurity and privacy**: first 2016-05-27, latest 2020-08-07, assumption asm-pc5Fi7VY
- **EA / Demand**: first 2016-02-08, latest 2026-02-03, assumption asm-wFp7jc4R
- **EA / Geopolitics and tariffs**: first 2016-05-27, latest 2026-02-03, assumption asm-cCt3hEJ1
- **EA / Inventory and channel**: first 2016-02-08, latest 2025-05-13, assumption asm-V6Aun1FL
- **EA / Liquidity**: first 2016-02-08, latest 2026-02-03, assumption asm-Dn2rzHuU
- **EA / Macro and foreign exchange**: first 2016-02-08, latest 2026-02-03, assumption asm-7Tni2uL5
- **EA / Regulation and legal**: first 2016-02-08, latest 2026-02-03, assumption asm-MgGNzK6z
- **EA / Supply chain**: first 2016-02-08, latest 2026-02-03, assumption asm-dxrZndfW
- **MU / AI, R&D, and technology**: first 2016-01-08, latest 2026-03-19, assumption asm-o5RkVgmn
- **MU / Cloud and data center capacity**: first 2016-01-08, latest 2026-03-19, assumption asm-sjxR8DDD
- **MU / Competition**: first 2016-01-08, latest 2026-03-19, assumption asm-9u6GsKqY
- **MU / Customer and platform dependency**: first 2016-01-08, latest 2026-03-19, assumption asm-vwTFoV9x
- **MU / Cybersecurity and privacy**: first 2023-06-29, latest 2026-03-19, assumption asm-RP5bemQL
- **MU / Demand**: first 2016-01-08, latest 2026-03-19, assumption asm-PNGucCzS
- **MU / Geopolitics and tariffs**: first 2016-01-08, latest 2026-03-19, assumption asm-wqLG5C3V
- **MU / Inventory and channel**: first 2016-01-08, latest 2026-03-19, assumption asm-mohAyweE
- **MU / Liquidity**: first 2016-01-08, latest 2026-03-19, assumption asm-RFSk51ax
- **MU / Macro and foreign exchange**: first 2016-01-08, latest 2026-03-19, assumption asm-8WRWn5gd
- **MU / Regulation and legal**: first 2016-01-08, latest 2026-03-19, assumption asm-qUnSzML4
- **MU / Supply chain**: first 2016-01-08, latest 2026-03-19, assumption asm-TN54hhrX
- **VZ / AI, R&D, and technology**: first 2016-02-23, latest 2026-05-01, assumption asm-2aSFZpCC
- **VZ / Cloud and data center capacity**: first 2016-02-23, latest 2026-05-01, assumption asm-3bGK86qL
- **VZ / Competition**: first 2016-04-28, latest 2025-10-29, assumption asm-Bf4Gknt3
- **VZ / Customer and platform dependency**: first 2016-04-28, latest 2026-05-01, assumption asm-vNY9Aig5
- **VZ / Cybersecurity and privacy**: first 2017-02-21, latest 2026-02-17, assumption asm-GTDWQueH
- **VZ / Demand**: first 2016-02-23, latest 2026-05-01, assumption asm-ktbpwdZ5
- **VZ / Geopolitics and tariffs**: first 2020-04-27, latest 2025-10-29, assumption asm-6n2XEJtd
- **VZ / Inventory and channel**: first 2016-02-23, latest 2026-05-01, assumption asm-49HFWJ9G
- **VZ / Liquidity**: first 2016-02-23, latest 2026-05-01, assumption asm-grGzqr3M
- **VZ / Macro and foreign exchange**: first 2016-04-28, latest 2026-05-01, assumption asm-J2mS7Cp9
- **VZ / Regulation and legal**: first 2016-02-23, latest 2026-05-01, assumption asm-CuLwa4vn
- **VZ / Supply chain**: first 2016-02-23, latest 2026-05-01, assumption asm-jx9SfN5a
- **T / AI, R&D, and technology**: first 2016-02-18, latest 2026-02-09, assumption asm-E3F8LCpq
- **T / Cloud and data center capacity**: first 2016-02-18, latest 2026-04-27, assumption asm-EZUWzbiP
- **T / Competition**: first 2016-02-18, latest 2026-04-27, assumption asm-1RAXyoyS
- **T / Customer and platform dependency**: first 2019-05-06, latest 2026-02-09, assumption asm-jTXpY72r
- **T / Cybersecurity and privacy**: first 2017-02-17, latest 2026-02-09, assumption asm-LxVDGzUG
- **T / Demand**: first 2016-02-18, latest 2026-04-27, assumption asm-SuwGymEp
- **T / Geopolitics and tariffs**: first 2018-11-02, latest 2026-02-09, assumption asm-4Q8MNJ72
- **T / Inventory and channel**: first 2016-02-18, latest 2026-04-27, assumption asm-9mDrajo6
- **T / Liquidity**: first 2016-02-18, latest 2026-04-27, assumption asm-GJg2kRDx
- **T / Macro and foreign exchange**: first 2016-05-05, latest 2026-04-27, assumption asm-CKb9jFyj
- **T / Regulation and legal**: first 2016-02-18, latest 2026-04-27, assumption asm-Q4CGhim2
- **T / Supply chain**: first 2016-02-18, latest 2026-04-27, assumption asm-JQ83Qjny
- **MO / AI, R&D, and technology**: first 2016-02-25, latest 2026-04-30, assumption asm-zu3jRoXT
- **MO / Cloud and data center capacity**: first 2020-04-30, latest 2020-10-30, assumption asm-8ME5aGYo
- **MO / Competition**: first 2016-02-25, latest 2026-04-30, assumption asm-xBx1iatS
- **MO / Customer and platform dependency**: first 2017-02-27, latest 2026-02-25, assumption asm-orcXVfQJ
- **MO / Cybersecurity and privacy**: first 2022-04-28, latest 2022-10-27, assumption asm-gzfaCP72
- **MO / Demand**: first 2016-02-25, latest 2026-04-30, assumption asm-GzBCvRcp
- **MO / Geopolitics and tariffs**: first 2020-04-30, latest 2026-04-30, assumption asm-jyPd6Wjg
- **MO / Inventory and channel**: first 2016-02-25, latest 2026-04-30, assumption asm-7n3pdG2q
- **MO / Liquidity**: first 2016-02-25, latest 2026-04-30, assumption asm-kZQCFeFw
- **MO / Macro and foreign exchange**: first 2016-02-25, latest 2026-04-30, assumption asm-t8x5aPDE
- **MO / Regulation and legal**: first 2016-02-25, latest 2026-04-30, assumption asm-D2cw2U6U
- **MO / Supply chain**: first 2016-02-25, latest 2026-04-30, assumption asm-BmMCyKey
- **MSFT / AI, R&D, and technology**: first 2016-01-28, latest 2026-04-29, assumption asm-e7XCszRn
- **MSFT / Cloud and data center capacity**: first 2016-01-28, latest 2026-04-29, assumption asm-YKKrQv95
- **MSFT / Competition**: first 2016-01-28, latest 2026-01-28, assumption asm-23TDWuqU
- **MSFT / Customer and platform dependency**: first 2016-01-28, latest 2026-04-29, assumption asm-pY64YDwZ
- **MSFT / Cybersecurity and privacy**: first 2016-01-28, latest 2026-04-29, assumption asm-9nqTHiPs
- **MSFT / Demand**: first 2016-01-28, latest 2026-04-29, assumption asm-GpdfFh1C
- **MSFT / Geopolitics and tariffs**: first 2016-01-28, latest 2026-04-29, assumption asm-peCEQKfD
- **MSFT / Inventory and channel**: first 2016-01-28, latest 2026-04-29, assumption asm-YaqREyt7
- **MSFT / Liquidity**: first 2016-01-28, latest 2026-04-29, assumption asm-pvTxdvNS
- **MSFT / Macro and foreign exchange**: first 2016-01-28, latest 2026-04-29, assumption asm-jVgFUFR3
- **MSFT / Regulation and legal**: first 2016-01-28, latest 2026-04-29, assumption asm-EqZEvCR8
- **MSFT / Supply chain**: first 2016-01-28, latest 2026-04-29, assumption asm-rVK5kqKU
- **SBUX / AI, R&D, and technology**: first 2016-01-26, latest 2026-04-28, assumption asm-katVwK23
- **SBUX / Cloud and data center capacity**: first 2016-04-26, latest 2023-05-02, assumption asm-m2Ps5Ny3
- **SBUX / Competition**: first 2016-01-26, latest 2026-04-28, assumption asm-bZ4tohxb
- **SBUX / Customer and platform dependency**: first 2016-01-26, latest 2026-04-28, assumption asm-7N66rALg
- **SBUX / Cybersecurity and privacy**: first 2016-11-18, latest 2026-04-28, assumption asm-ejktNT8o
- **SBUX / Demand**: first 2016-01-26, latest 2026-04-28, assumption asm-b5wJFCYT
- **SBUX / Geopolitics and tariffs**: first 2016-01-26, latest 2026-04-28, assumption asm-dM8YjiES
- **SBUX / Inventory and channel**: first 2016-01-26, latest 2022-11-18, assumption asm-HmKU6471
- **SBUX / Liquidity**: first 2016-01-26, latest 2026-04-28, assumption asm-BcRAAh3G
- **SBUX / Macro and foreign exchange**: first 2016-01-26, latest 2026-04-28, assumption asm-W3JSzH6m
- **SBUX / Regulation and legal**: first 2016-01-26, latest 2026-04-28, assumption asm-agHQPazh
- **SBUX / Supply chain**: first 2016-11-18, latest 2026-04-28, assumption asm-JaYwNZmb
- **CSCO / AI, R&D, and technology**: first 2016-02-18, latest 2026-02-17, assumption asm-n7FhB48i
- **CSCO / Cloud and data center capacity**: first 2016-02-18, latest 2026-02-17, assumption asm-2uJDeUV2
- **CSCO / Competition**: first 2016-02-18, latest 2026-02-17, assumption asm-x5MTksh5
- **CSCO / Customer and platform dependency**: first 2016-02-18, latest 2026-02-17, assumption asm-G8uoQwJk
- **CSCO / Cybersecurity and privacy**: first 2016-09-08, latest 2025-09-03, assumption asm-1bwGPi2x
- **CSCO / Demand**: first 2016-02-18, latest 2026-02-17, assumption asm-apaexpGF
- **CSCO / Geopolitics and tariffs**: first 2016-02-18, latest 2026-02-17, assumption asm-sXr7pBZe
- **CSCO / Inventory and channel**: first 2016-02-18, latest 2026-02-17, assumption asm-pvxXPpig
- **CSCO / Liquidity**: first 2016-02-18, latest 2026-02-17, assumption asm-UsPRNsQW
- **CSCO / Macro and foreign exchange**: first 2016-02-18, latest 2026-02-17, assumption asm-sEBXyjEz
- **CSCO / Regulation and legal**: first 2016-02-18, latest 2026-02-17, assumption asm-g69CFqyf
- **CSCO / Supply chain**: first 2016-02-18, latest 2026-02-17, assumption asm-SrGYCsLi
- **COST / AI, R&D, and technology**: first 2018-10-26, latest 2025-10-08, assumption asm-hWoPfB7D
- **COST / Cloud and data center capacity**: first 2016-10-12, latest 2025-10-08, assumption asm-BHAhm423
- **COST / Competition**: first 2016-10-12, latest 2026-03-11, assumption asm-dGpsJ26w
- **COST / Cybersecurity and privacy**: first 2016-10-12, latest 2026-03-11, assumption asm-qmWoETbH
- **COST / Demand**: first 2016-03-09, latest 2026-03-11, assumption asm-BSzuTp35
- **COST / Geopolitics and tariffs**: first 2016-03-09, latest 2026-03-11, assumption asm-SXrXBNsj
- **COST / Inventory and channel**: first 2016-03-09, latest 2026-03-11, assumption asm-2qgZNfRr
- **COST / Liquidity**: first 2016-03-09, latest 2026-03-11, assumption asm-P5mRwhf3
- **COST / Macro and foreign exchange**: first 2016-03-09, latest 2026-03-11, assumption asm-mzoh69FJ
- **COST / Regulation and legal**: first 2016-03-09, latest 2026-03-11, assumption asm-H2Mr6T9T
- **COST / Supply chain**: first 2016-03-09, latest 2026-03-11, assumption asm-bgprY9KW
- **AMZN / AI, R&D, and technology**: first 2016-01-29, latest 2026-04-30, assumption asm-KLqb7Bh1
- **AMZN / Cloud and data center capacity**: first 2016-01-29, latest 2026-04-30, assumption asm-WG1dCesU
- **AMZN / Competition**: first 2016-01-29, latest 2026-04-30, assumption asm-vKZCmN6S
- **AMZN / Customer and platform dependency**: first 2016-01-29, latest 2016-01-29, assumption asm-gHpqF4w1
- **AMZN / Cybersecurity and privacy**: first 2016-01-29, latest 2026-04-30, assumption asm-TE4Rk4vE
- **AMZN / Demand**: first 2016-01-29, latest 2026-04-30, assumption asm-vyQBE4kp
- **AMZN / Geopolitics and tariffs**: first 2016-01-29, latest 2026-04-30, assumption asm-rH6FpZuW
- **AMZN / Inventory and channel**: first 2016-01-29, latest 2026-04-30, assumption asm-YKKxzUbi
- **AMZN / Liquidity**: first 2016-01-29, latest 2026-04-30, assumption asm-LPvDrzY9
- **AMZN / Macro and foreign exchange**: first 2016-01-29, latest 2026-04-30, assumption asm-B5T3mVMZ
- **AMZN / Regulation and legal**: first 2016-01-29, latest 2026-04-30, assumption asm-KNZTaZZZ
- **AMZN / Supply chain**: first 2016-01-29, latest 2026-04-30, assumption asm-p9bqfJFt
- **NVDA / AI, R&D, and technology**: first 2016-03-17, latest 2026-02-25, assumption asm-GDaMBKx5
- **NVDA / Cloud and data center capacity**: first 2016-03-17, latest 2026-02-25, assumption asm-z6FaBvWf
- **NVDA / Competition**: first 2016-03-17, latest 2026-02-25, assumption asm-SLGXP9yJ
- **NVDA / Customer and platform dependency**: first 2016-03-17, latest 2026-02-25, assumption asm-tF3gKQpt
- **NVDA / Cybersecurity and privacy**: first 2016-03-17, latest 2026-02-25, assumption asm-mFYToqD4
- **NVDA / Demand**: first 2016-03-17, latest 2026-02-25, assumption asm-QncdPdYh
- **NVDA / Geopolitics and tariffs**: first 2016-03-17, latest 2026-02-25, assumption asm-uWLMiPhM
- **NVDA / Inventory and channel**: first 2016-03-17, latest 2026-02-25, assumption asm-XtUoWXU4
- **NVDA / Liquidity**: first 2016-03-17, latest 2026-02-25, assumption asm-z8gxKvQh
- **NVDA / Macro and foreign exchange**: first 2019-02-21, latest 2026-02-25, assumption asm-Tdjd6MxB
- **NVDA / Regulation and legal**: first 2016-03-17, latest 2026-02-25, assumption asm-Nj15znFh
- **NVDA / Supply chain**: first 2016-03-17, latest 2026-02-25, assumption asm-iGQnHDHS
- **MAR / AI, R&D, and technology**: first 2026-02-10, latest 2026-02-10, assumption asm-sQvoJ6sB
- **MAR / Cloud and data center capacity**: first 2016-04-28, latest 2026-02-10, assumption asm-yqSMShvF
- **MAR / Competition**: first 2016-02-18, latest 2026-02-10, assumption asm-aBCwqGss
- **MAR / Customer and platform dependency**: first 2016-02-18, latest 2026-02-10, assumption asm-fNeht86T
- **MAR / Cybersecurity and privacy**: first 2018-02-15, latest 2026-02-10, assumption asm-GuBtWuig
- **MAR / Demand**: first 2016-02-18, latest 2026-02-10, assumption asm-KPbuoyUk
- **MAR / Geopolitics and tariffs**: first 2016-02-18, latest 2026-02-10, assumption asm-LLbu9L8w
- **MAR / Inventory and channel**: first 2018-05-10, latest 2018-11-06, assumption asm-pCBgyxc5
- **MAR / Liquidity**: first 2016-02-18, latest 2026-02-10, assumption asm-D1qsFGdq
- **MAR / Macro and foreign exchange**: first 2016-02-18, latest 2026-02-10, assumption asm-FyFu6xz7
- **MAR / Regulation and legal**: first 2016-02-18, latest 2026-02-10, assumption asm-gdMeBrzP
- **MAR / Supply chain**: first 2016-02-18, latest 2026-02-10, assumption asm-jsir8Jct
- **NFLX / AI, R&D, and technology**: first 2016-07-19, latest 2026-01-23, assumption asm-8jQCriV2
- **NFLX / Cloud and data center capacity**: first 2016-04-20, latest 2026-04-17, assumption asm-BQ8JmuMR
- **NFLX / Competition**: first 2016-01-28, latest 2026-04-17, assumption asm-Wr9VyC81
- **NFLX / Customer and platform dependency**: first 2016-01-28, latest 2026-01-23, assumption asm-ZwKLuuEy
- **NFLX / Cybersecurity and privacy**: first 2017-01-27, latest 2026-04-17, assumption asm-MVPnFQ4C
- **NFLX / Demand**: first 2016-01-28, latest 2026-04-17, assumption asm-bmBJ3gyo
- **NFLX / Geopolitics and tariffs**: first 2016-01-28, latest 2026-04-17, assumption asm-G1d7TLaB
- **NFLX / Inventory and channel**: first 2016-01-28, latest 2026-01-23, assumption asm-QqDi6DKc
- **NFLX / Liquidity**: first 2016-01-28, latest 2026-04-17, assumption asm-gZAoZePf
- **NFLX / Macro and foreign exchange**: first 2016-04-20, latest 2026-04-17, assumption asm-HPJvWDyx
- **NFLX / Regulation and legal**: first 2016-01-28, latest 2026-04-17, assumption asm-G6NBoRBf
- **NFLX / Supply chain**: first 2017-01-27, latest 2026-04-17, assumption asm-aZnYXCED
- **BKNG / AI, R&D, and technology**: first 2016-02-17, latest 2026-04-28, assumption asm-59eEs37Z
- **BKNG / Cloud and data center capacity**: first 2020-08-06, latest 2026-02-18, assumption asm-sq4xqgRv
- **BKNG / Competition**: first 2016-02-17, latest 2026-02-18, assumption asm-j65FarTK
- **BKNG / Customer and platform dependency**: first 2016-02-17, latest 2026-04-28, assumption asm-hBkiCTUB
- **BKNG / Cybersecurity and privacy**: first 2020-08-06, latest 2025-02-20, assumption asm-dhqmndVV
- **BKNG / Demand**: first 2016-02-17, latest 2026-04-28, assumption asm-SzfgJvKs
- **BKNG / Geopolitics and tariffs**: first 2016-02-17, latest 2026-04-28, assumption asm-jXNpwW3C
- **BKNG / Inventory and channel**: first 2022-02-23, latest 2025-02-20, assumption asm-CaGUb1jN
- **BKNG / Liquidity**: first 2016-02-17, latest 2026-04-28, assumption asm-r3YunLyG
- **BKNG / Macro and foreign exchange**: first 2016-02-17, latest 2026-04-28, assumption asm-SZ1og8By
- **BKNG / Regulation and legal**: first 2016-02-17, latest 2026-04-28, assumption asm-rMjZC6aj
- **BKNG / Supply chain**: first 2016-02-17, latest 2026-04-28, assumption asm-PNX3KyR7
- **CMCSA / AI, R&D, and technology**: first 2016-02-05, latest 2026-02-03, assumption asm-fYBPNist
- **CMCSA / Cloud and data center capacity**: first 2016-02-05, latest 2026-02-03, assumption asm-DuGpHhgo
- **CMCSA / Competition**: first 2016-02-05, latest 2026-04-23, assumption asm-rPQ3gUSs
- **CMCSA / Customer and platform dependency**: first 2016-02-05, latest 2026-02-03, assumption asm-AJnfVh8h
- **CMCSA / Cybersecurity and privacy**: first 2016-04-27, latest 2026-04-23, assumption asm-QBKTT7E8
- **CMCSA / Demand**: first 2016-02-05, latest 2026-04-23, assumption asm-hNS1BXy4
- **CMCSA / Geopolitics and tariffs**: first 2016-02-05, latest 2025-10-30, assumption asm-gqa5apEW
- **CMCSA / Inventory and channel**: first 2016-10-26, latest 2023-02-03, assumption asm-vYbHygtB
- **CMCSA / Liquidity**: first 2016-04-27, latest 2026-04-23, assumption asm-bZEYteB4
- **CMCSA / Macro and foreign exchange**: first 2016-04-27, latest 2026-04-23, assumption asm-Qw2RNyYr
- **CMCSA / Regulation and legal**: first 2016-02-05, latest 2026-04-23, assumption asm-Vq1KB2xB
- **CMCSA / Supply chain**: first 2016-10-26, latest 2026-02-03, assumption asm-2TP2aYET
- **TMUS / AI, R&D, and technology**: first 2016-02-17, latest 2026-02-11, assumption asm-yMnh6vjV
- **TMUS / Cloud and data center capacity**: first 2016-02-17, latest 2026-02-11, assumption asm-QNh6Ssf8
- **TMUS / Competition**: first 2016-02-17, latest 2026-02-11, assumption asm-z5GANxbE
- **TMUS / Customer and platform dependency**: first 2016-02-17, latest 2026-02-11, assumption asm-k3Dfjwuj
- **TMUS / Cybersecurity and privacy**: first 2016-02-17, latest 2026-02-11, assumption asm-9zvzkp5p
- **TMUS / Demand**: first 2016-02-17, latest 2026-04-28, assumption asm-NyHDPWBk
- **TMUS / Geopolitics and tariffs**: first 2016-02-17, latest 2026-02-11, assumption asm-8ff2B7dq
- **TMUS / Inventory and channel**: first 2016-02-17, latest 2026-04-28, assumption asm-1voyARfr
- **TMUS / Liquidity**: first 2016-02-17, latest 2026-04-28, assumption asm-CJ5Kd9BY
- **TMUS / Macro and foreign exchange**: first 2016-02-17, latest 2026-02-11, assumption asm-ji8XFodt
- **TMUS / Regulation and legal**: first 2016-02-17, latest 2026-04-28, assumption asm-bebTqrbN
- **TMUS / Supply chain**: first 2016-02-17, latest 2026-02-11, assumption asm-uDnUFn7W
- **TSLA / AI, R&D, and technology**: first 2016-02-24, latest 2026-04-23, assumption asm-mvpfdpYB
- **TSLA / Cloud and data center capacity**: first 2016-02-24, latest 2026-04-23, assumption asm-xMkZ5VjM
- **TSLA / Competition**: first 2016-02-24, latest 2026-04-23, assumption asm-FAwMrAbv
- **TSLA / Customer and platform dependency**: first 2019-07-29, latest 2026-01-29, assumption asm-jf7ekqir
- **TSLA / Cybersecurity and privacy**: first 2020-02-13, latest 2026-01-29, assumption asm-VDbBNM3Y
- **TSLA / Demand**: first 2016-02-24, latest 2026-04-23, assumption asm-jRQLiAWW
- **TSLA / Geopolitics and tariffs**: first 2019-02-19, latest 2026-01-29, assumption asm-JkLRt8Hv
- **TSLA / Inventory and channel**: first 2016-05-10, latest 2026-04-23, assumption asm-MXng6fyh
- **TSLA / Liquidity**: first 2016-05-10, latest 2026-04-23, assumption asm-1XjmnzvT
- **TSLA / Macro and foreign exchange**: first 2016-05-10, latest 2026-04-23, assumption asm-UGMSaHwm
- **TSLA / Regulation and legal**: first 2016-02-24, latest 2026-04-23, assumption asm-DgAURpbD
- **TSLA / Supply chain**: first 2016-02-24, latest 2026-04-23, assumption asm-zXRB5TcJ
- **PLTR / AI, R&D, and technology**: first 2020-11-13, latest 2026-02-17, assumption asm-CFdDZ1Qg
- **PLTR / Cloud and data center capacity**: first 2020-11-13, latest 2026-02-17, assumption asm-puiyGvAQ
- **PLTR / Competition**: first 2020-11-13, latest 2026-02-17, assumption asm-aw5W6Z2w
- **PLTR / Customer and platform dependency**: first 2020-11-13, latest 2026-02-17, assumption asm-zT554GZv
- **PLTR / Cybersecurity and privacy**: first 2020-11-13, latest 2026-02-17, assumption asm-fY2NfyEU
- **PLTR / Demand**: first 2020-11-13, latest 2026-02-17, assumption asm-RYdmdFym
- **PLTR / Geopolitics and tariffs**: first 2022-05-09, latest 2026-02-17, assumption asm-AL6vYaHo
- **PLTR / Liquidity**: first 2020-11-13, latest 2026-02-17, assumption asm-EA7XXQ4c
- **PLTR / Macro and foreign exchange**: first 2020-11-13, latest 2026-02-17, assumption asm-7QoEGjkb
- **PLTR / Regulation and legal**: first 2020-11-13, latest 2026-02-17, assumption asm-oridaenZ
- **PLTR / Supply chain**: first 2021-02-26, latest 2026-02-17, assumption asm-XwQsz1nL
- **META / AI, R&D, and technology**: first 2016-01-28, latest 2026-04-30, assumption asm-62M2pid4
- **META / Cloud and data center capacity**: first 2016-01-28, latest 2026-04-30, assumption asm-DwyATMoV
- **META / Competition**: first 2016-01-28, latest 2026-04-30, assumption asm-rj6pPT8r
- **META / Customer and platform dependency**: first 2016-01-28, latest 2026-04-30, assumption asm-Dv846kMU
- **META / Cybersecurity and privacy**: first 2016-01-28, latest 2026-04-30, assumption asm-BqHCtE9n
- **META / Demand**: first 2016-01-28, latest 2026-04-30, assumption asm-s331HAs6
- **META / Geopolitics and tariffs**: first 2016-11-03, latest 2026-04-30, assumption asm-ysQyika4
- **META / Inventory and channel**: first 2016-01-28, latest 2020-10-30, assumption asm-CiUhZakG
- **META / Liquidity**: first 2016-04-28, latest 2026-04-30, assumption asm-sXqeQRA1
- **META / Macro and foreign exchange**: first 2016-01-28, latest 2026-04-30, assumption asm-H79M9Vrk
- **META / Regulation and legal**: first 2016-01-28, latest 2026-04-30, assumption asm-Jxt8cx8d
- **META / Supply chain**: first 2016-01-28, latest 2020-10-30, assumption asm-NzRG4s4i
- **ORCL / AI, R&D, and technology**: first 2016-03-18, latest 2026-03-11, assumption asm-iR8p4eRQ
- **ORCL / Cloud and data center capacity**: first 2016-03-18, latest 2026-03-11, assumption asm-kd1wg1i3
- **ORCL / Competition**: first 2016-03-18, latest 2026-03-11, assumption asm-nwLYDwmb
- **ORCL / Customer and platform dependency**: first 2016-03-18, latest 2025-06-18, assumption asm-uXtpdB2q
- **ORCL / Cybersecurity and privacy**: first 2018-06-22, latest 2025-06-18, assumption asm-pXfig7sy
- **ORCL / Demand**: first 2016-03-18, latest 2026-03-11, assumption asm-w2KZCbog
- **ORCL / Geopolitics and tariffs**: first 2022-03-11, latest 2026-03-11, assumption asm-mGdNgQTi
- **ORCL / Inventory and channel**: first 2017-06-27, latest 2026-03-11, assumption asm-DzDxa64w
- **ORCL / Liquidity**: first 2016-03-18, latest 2026-03-11, assumption asm-3sW43ezk
- **ORCL / Macro and foreign exchange**: first 2016-03-18, latest 2026-03-11, assumption asm-BgEPBKBS
- **ORCL / Regulation and legal**: first 2016-03-18, latest 2026-03-11, assumption asm-Zu1asXEe
- **ORCL / Supply chain**: first 2016-06-22, latest 2026-03-11, assumption asm-DQfv3QHr
- **PM / AI, R&D, and technology**: first 2017-02-14, latest 2026-04-24, assumption asm-rBkykPVM
- **PM / Cloud and data center capacity**: first 2017-02-14, latest 2026-04-24, assumption asm-rxDY3Cif
- **PM / Competition**: first 2016-02-17, latest 2026-04-24, assumption asm-QC4w7zdT
- **PM / Customer and platform dependency**: first 2019-02-07, latest 2024-04-26, assumption asm-3NumxF4J
- **PM / Demand**: first 2016-02-17, latest 2026-04-24, assumption asm-ENkEBfSg
- **PM / Geopolitics and tariffs**: first 2016-02-17, latest 2026-04-24, assumption asm-qsuv2tV3
- **PM / Inventory and channel**: first 2016-02-17, latest 2024-02-08, assumption asm-3mQ3s1U8
- **PM / Liquidity**: first 2016-02-17, latest 2026-04-24, assumption asm-dGcwZvEF
- **PM / Macro and foreign exchange**: first 2016-02-17, latest 2026-04-24, assumption asm-EcMoPfNa
- **PM / Regulation and legal**: first 2016-02-17, latest 2026-04-24, assumption asm-fmUJaJ5m
- **PM / Supply chain**: first 2016-02-17, latest 2026-04-24, assumption asm-qcAhVDVt
- **WBD / AI, R&D, and technology**: first 2016-02-18, latest 2026-02-27, assumption asm-2YNaVgGD
- **WBD / Cloud and data center capacity**: first 2016-05-05, latest 2026-02-27, assumption asm-NnjWs25h
- **WBD / Competition**: first 2016-02-18, latest 2026-02-27, assumption asm-eXpHRrQr
- **WBD / Customer and platform dependency**: first 2016-02-18, latest 2026-02-27, assumption asm-pyWSE6fE
- **WBD / Cybersecurity and privacy**: first 2016-02-18, latest 2026-02-27, assumption asm-1GKsohJM
- **WBD / Demand**: first 2016-02-18, latest 2026-02-27, assumption asm-GY8sY5ge
- **WBD / Geopolitics and tariffs**: first 2017-02-14, latest 2026-02-27, assumption asm-DY7jBomR
- **WBD / Inventory and channel**: first 2016-02-18, latest 2026-02-27, assumption asm-VmrZrPYS
- **WBD / Liquidity**: first 2016-02-18, latest 2026-02-27, assumption asm-CKkzkocd
- **WBD / Macro and foreign exchange**: first 2016-02-18, latest 2026-02-27, assumption asm-4a8c9YYa
- **WBD / Regulation and legal**: first 2016-02-18, latest 2026-02-27, assumption asm-iVeAyyNH
- **WBD / Supply chain**: first 2016-02-18, latest 2026-02-27, assumption asm-KQQCeduW
- **ABNB / AI, R&D, and technology**: first 2021-02-26, latest 2026-02-12, assumption asm-mGN6yyLX
- **ABNB / Cloud and data center capacity**: first 2021-02-26, latest 2026-02-12, assumption asm-eEpjuoTm
- **ABNB / Competition**: first 2021-02-26, latest 2026-02-12, assumption asm-sDdgHQR7
- **ABNB / Customer and platform dependency**: first 2021-02-26, latest 2026-02-12, assumption asm-VaQDKpNC
- **ABNB / Cybersecurity and privacy**: first 2021-02-26, latest 2026-02-12, assumption asm-gxv4rfwc
- **ABNB / Demand**: first 2021-02-26, latest 2026-02-12, assumption asm-k1uM3Zeu
- **ABNB / Geopolitics and tariffs**: first 2021-02-26, latest 2026-02-12, assumption asm-3euGTgYT
- **ABNB / Inventory and channel**: first 2022-02-25, latest 2024-02-16, assumption asm-Dxy91tHL
- **ABNB / Liquidity**: first 2021-02-26, latest 2026-02-12, assumption asm-no4PdwkJ
- **ABNB / Macro and foreign exchange**: first 2021-02-26, latest 2026-02-12, assumption asm-fKKxSKHu
- **ABNB / Regulation and legal**: first 2021-02-26, latest 2026-02-12, assumption asm-cscDFapF
- **ABNB / Supply chain**: first 2022-02-25, latest 2026-02-12, assumption asm-9K1NGbA8
- **GOOGL / AI, R&D, and technology**: first 2016-02-11, latest 2026-04-30, assumption asm-aWH7uZAE
- **GOOGL / Cloud and data center capacity**: first 2016-02-11, latest 2026-04-30, assumption asm-ofhsdo1p
- **GOOGL / Competition**: first 2016-02-11, latest 2026-04-30, assumption asm-NcDdzVnR
- **GOOGL / Customer and platform dependency**: first 2016-02-11, latest 2026-04-30, assumption asm-hLGWTEqF
- **GOOGL / Cybersecurity and privacy**: first 2016-02-11, latest 2026-04-30, assumption asm-yiuubydu
- **GOOGL / Demand**: first 2016-02-11, latest 2026-04-30, assumption asm-ZdUnXqPQ
- **GOOGL / Geopolitics and tariffs**: first 2016-02-11, latest 2026-04-30, assumption asm-FJFCga4W
- **GOOGL / Inventory and channel**: first 2016-02-11, latest 2026-04-30, assumption asm-VLBeYHJ8
- **GOOGL / Liquidity**: first 2016-02-11, latest 2026-04-30, assumption asm-fiiTg9bN
- **GOOGL / Macro and foreign exchange**: first 2016-02-11, latest 2026-04-30, assumption asm-cgiKEvcN
- **GOOGL / Regulation and legal**: first 2016-02-11, latest 2026-04-30, assumption asm-jVUMVYoy
- **GOOGL / Supply chain**: first 2016-02-11, latest 2026-04-30, assumption asm-SLkr3Gy6
- **AVGO / AI, R&D, and technology**: first 2018-06-14, latest 2026-03-11, assumption asm-MCUcyamw
- **AVGO / Cloud and data center capacity**: first 2018-06-14, latest 2026-03-11, assumption asm-b1fJ1AUN
- **AVGO / Competition**: first 2018-06-14, latest 2026-03-11, assumption asm-n7kHAJUR
- **AVGO / Customer and platform dependency**: first 2018-06-14, latest 2026-03-11, assumption asm-DoMCjScg
- **AVGO / Cybersecurity and privacy**: first 2019-12-20, latest 2026-03-11, assumption asm-zavkw7i7
- **AVGO / Demand**: first 2018-06-14, latest 2026-03-11, assumption asm-GcYWRhWg
- **AVGO / Geopolitics and tariffs**: first 2018-06-14, latest 2026-03-11, assumption asm-38B2FnwF
- **AVGO / Inventory and channel**: first 2018-06-14, latest 2026-03-11, assumption asm-1ntwTeQv
- **AVGO / Liquidity**: first 2018-06-14, latest 2026-03-11, assumption asm-LXzDpZwY
- **AVGO / Macro and foreign exchange**: first 2018-12-21, latest 2026-03-11, assumption asm-v2qMGCiq
- **AVGO / Regulation and legal**: first 2018-06-14, latest 2026-03-11, assumption asm-Yv1uKg9n
- **AVGO / Supply chain**: first 2018-06-14, latest 2026-03-11, assumption asm-wuVGw4ij
- **DIS / AI, R&D, and technology**: first 2019-05-08, latest 2025-08-06, assumption asm-C8y7Vzh5
- **DIS / Cloud and data center capacity**: first 2019-05-08, latest 2022-11-29, assumption asm-WJHKZcgU
- **DIS / Competition**: first 2019-05-08, latest 2026-02-02, assumption asm-tZA5hLSt
- **DIS / Customer and platform dependency**: first 2019-11-20, latest 2025-11-13, assumption asm-QdwmG32L
- **DIS / Cybersecurity and privacy**: first 2019-11-20, latest 2025-11-13, assumption asm-H1VSXnSa
- **DIS / Demand**: first 2019-05-08, latest 2026-02-02, assumption asm-6o8MAEsY
- **DIS / Geopolitics and tariffs**: first 2022-05-11, latest 2026-02-02, assumption asm-xakuDdYD
- **DIS / Inventory and channel**: first 2019-11-20, latest 2025-11-13, assumption asm-1YAhejwu
- **DIS / Liquidity**: first 2019-05-08, latest 2026-02-02, assumption asm-cAuLNidr
- **DIS / Macro and foreign exchange**: first 2019-05-08, latest 2026-02-02, assumption asm-13tyLWKi
- **DIS / Regulation and legal**: first 2019-05-08, latest 2026-02-02, assumption asm-K8rwQyCS
- **DIS / Supply chain**: first 2019-11-20, latest 2025-08-06, assumption asm-aQPAtK7X

## Flywheel Audit

```flywheel-audit-json
{
  "schema": "sec-company-ledger-markdown-v1",
  "run_id": "sec-10y-100-company",
  "entity_id": "company-run-sec-10y-100-company-tracker",
  "entity_type": "company_sector_bundle_tracker",
  "path": "reports/company-runs/sec-10y-100-company/tracker.md"
}
```
