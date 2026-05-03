---
id: company-run-real-sec-e2e-2026-05-03t14-04-54-838z-tracker
type: report
report_kind: company_sector_bundle_tracker
run_id: real-sec-e2e-2026-05-03t14-04-54-838z
source: flywheel-ideas
date: '2026-05-03'
created: '2026-05-03T14:26:59.215Z'
---
# Company Tracker real-sec-e2e-2026-05-03t14-04-54-838z

- Companies: ["AAPL","MSFT","NVDA","AMZN","TSLA","HD","GOOGL","META","NFLX","LLY","JNJ","MRK","XOM","CVX","COP"]
- Years: 3
- Forms: ["10-K","10-Q"]
- Filings scanned: 30
- Themes tracked: 170
- Staged outcomes: 11
- Applied outcomes: 1

## SEC Company Lifecycle Report

This report tracks the loop: current bets -> evidence over time -> review queue -> accepted outcomes -> lessons.

## Lifecycle Snapshot

- Corpus: AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM across 30 filing(s), 170 tracked assumption(s), and 524 dated observation(s).
- Current bets: 169 open company/theme assumption(s) still being carried.
- Review queue: 8 event(s), 11 staged candidate(s) awaiting human judgment.
- Accepted outcomes: 1 failure(s), 0 validation(s).
- Lessons: 1 recorded memo(s), 0 missing memo(s).
- Triage completion: 1/12 candidate(s) applied (8%).

## Operator Next Step

Review the highest-pressure event and apply only if the evidence really refutes the bet: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-1KC2EGLt","cout-iEbFA9td"], confirm: true })`

## Lifecycle Status

1 accepted verdict(s) are in the ledger, and all accepted failures have durable lesson memos.

## Lessons Captured

- **A company thesis becomes more valuable when recurring disclosed risks are connected to accepted outcomes and downstream review.**
  - Evidence: 1 accepted failure verdict(s) across NVDA / Demand
  - Representative context: Filing language states this risk had an actual effect on operations, results, costs, or supply.
  - Outcomes: out-pWRUPmW6

## Current Bets

Open company/theme assumptions. Staged evidence raises review pressure; it does not count as failure.

- **MSFT / AI, R&D, and technology** — fresh, 4 observation(s), review pressure 2, latest 2026-04-29
  - Assumption: asm-GPdNP7yd
- **MSFT / Cloud and data center capacity** — fresh, 4 observation(s), review pressure 2, latest 2026-04-29
  - Assumption: asm-iS9WFPyL
- **NVDA / Inventory and channel** — fresh, 4 observation(s), review pressure 2, latest 2026-02-25
  - Assumption: asm-McDqnPXB
- **META / Geopolitics and tariffs** — fresh, 4 observation(s), review pressure 1, latest 2026-04-30
  - Assumption: asm-yot7L65L
- **TSLA / Demand** — fresh, 4 observation(s), review pressure 1, latest 2026-04-23
  - Assumption: asm-d64bQ4Up
- **TSLA / Supply chain** — fresh, 4 observation(s), review pressure 1, latest 2026-04-23
  - Assumption: asm-qFzNqki9
- **NFLX / Demand** — fresh, 4 observation(s), review pressure 1, latest 2026-04-17
  - Assumption: asm-BE4ofwHA
- **AAPL / Demand** — fresh, 4 observation(s), review pressure 0, latest 2026-05-01
  - Assumption: asm-bZMiog1R
- **AAPL / Geopolitics and tariffs** — fresh, 4 observation(s), review pressure 0, latest 2026-05-01
  - Assumption: asm-fGLeK2CB
- **AAPL / AI, R&D, and technology** — fresh, 3 observation(s), review pressure 0, latest 2026-05-01
  - Assumption: asm-GfmjNzyR
- **AAPL / Cloud and data center capacity** — fresh, 3 observation(s), review pressure 0, latest 2026-05-01
  - Assumption: asm-DGwaJLnR
- **AAPL / Customer and platform dependency** — fresh, 3 observation(s), review pressure 0, latest 2026-05-01
  - Assumption: asm-e56MdArq

## Outcome Review Queue

- **MSFT** 2026-01-28: 2 candidate(s), AI, R&D, and technology, Cloud and data center capacity
  - Candidate IDs: cout-1KC2EGLt, cout-iEbFA9td
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-1KC2EGLt","cout-iEbFA9td"], confirm: true })`
  - Source: sec-company://0000789019/0001193125-26-027207#part-i-item-2:theme:ai-rd-technology:outcome
  - Operating expenses increased $236 million or 6% driven by impairment charges in our Gaming business and research and development investments in compute capacity and AI talent.
- **MSFT** 2026-04-29: 2 candidate(s), AI, R&D, and technology, Cloud and data center capacity
  - Candidate IDs: cout-X4ua1bAb, cout-ewhLhPHk
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-X4ua1bAb","cout-ewhLhPHk"], confirm: true })`
  - Source: sec-company://0000789019/0001193125-26-191507#part-i-item-2:theme:ai-rd-technology:outcome
  - Operating expenses increased $628 million or 6% driven by impairment and other related expenses in our Gaming business and continued investments in research and development compute capacity, AI talent, and data to support product development that benefits the entire portfolio.
- **NVDA** 2026-02-25: 2 candidate(s), Demand, Inventory and channel
  - Candidate IDs: cout-kXoBT5HF, cout-ogV4H2p7
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-kXoBT5HF","cout-ogV4H2p7"], confirm: true })`
  - Source: sec-company://0001045810/0001045810-26-000021#item-7:theme:demand:outcome
  - In April 2025, the USG informed us that a license is required for exports of our H20 product into the China market. As a result of these requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purchase obligations, as the 
- **META** 2026-04-30: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-Ht9MFXWY
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-Ht9MFXWY"], confirm: true })`
  - Source: sec-company://0001326801/0001628280-26-028526#part-ii-item-1a:theme:geopolitics-tariffs:outcome
  - User growth and engagement are also impacted by a number of other factors, including competitive products and services, such as TikTok, that have reduced some users' engagement with our products and services, as well as global and regional business, macroeconomic, and geopolitical conditions. For ex
- **NFLX** 2026-04-17: 1 candidate(s), Demand
  - Candidate IDs: cout-4xp45AFo
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-4xp45AFo"], confirm: true })`
  - Source: sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil
- **NVDA** 2025-11-19: 1 candidate(s), Inventory and channel
  - Candidate IDs: cout-9vSCaRcJ
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-9vSCaRcJ"], confirm: true })`
  - Source: sec-company://0001045810/0001045810-25-000230#part-i-item-2:theme:inventory-channel:outcome
  - In April 2025, the U.S. government, or USG, informed us that a license is required for exports of our H20 product into the China market. As a result of these new requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purc
- **TSLA** 2026-01-29: 1 candidate(s), Supply chain
  - Candidate IDs: cout-wimxiZSE
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-wimxiZSE"], confirm: true })`
  - Source: sec-company://0001318605/0001628280-26-003952#item-1a:theme:supply-chain:outcome
  - We will also need to hire, train and compensate skilled employees to operate these facilities. Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing proce
- **TSLA** 2026-01-29: 1 candidate(s), Demand
  - Candidate IDs: cout-byFW2ZJs
  - Apply after review: `company.apply_outcomes({ run_id: "real-sec-e2e-2026-05-03t14-04-54-838z", outcome_candidate_ids: ["cout-byFW2ZJs"], confirm: true })`
  - Source: sec-company://0001318605/0001628280-26-003952#item-7:theme:demand:outcome
  - In 2025, we recognized total revenues of $94.83 billion, representing a decrease of $2.86 billion compared to the prior year. In 2025, our net income attributable to common stockholders was $3.79 billion, representing a decrease of $3.30 billion compared to the prior year.

## Accepted Pass/Fail Verdicts

- **FAIL** NVDA / Demand: asm-WhezHdP9 via out-pWRUPmW6
  - In the context of **NVDA disclosed demand risk in 10-Q 2025-11-19.**, facing **In April 2025, the U.S. government, or USG, informed us that a license is required for exports of our H20 product into the China market. As a result of these new requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purchase obligations, as the demand for H20 diminished. In August 2025, the USG granted licenses that would allow us to ship certain H20 products to certain China-based customers, but to date, we have generated approximately $50 million in H20 revenue under those licenses.**, we assume **NVDA can manage demand risk without material disruption.**, accepting **The filing language is company-authored risk disclosure, not an independent forecast.**.

  - Lesson: A company thesis becomes more valuable when recurring disclosed risks are connected to accepted outcomes and downstream review.

## Dependent Ideas Needing Review

- **Dependent portfolio thesis for SEC E2E** (explored) — idea-D3RSAjX5, ideas/idea-d3rsajx5.md

## Lifecycle Summary

- Corpus: 30 SEC filing(s) scanned.
- Observation ledger: 524 dated observation(s) grouped into 170 tracked assumption theme(s).
- Cross-company comparison: 12 theme(s) appeared in more than one company.
- Realized outcome candidates: 11 staged, 1 applied.
- Value signal: recurring issuer-authored evidence is organized for review; outcomes are not applied until explicitly accepted.

## Company Summaries

### XOM

- Filings scanned: 2
- Window: 2025-11-03 to 2026-02-18
- Themes tracked: 10
- Observations: 24
- Staged outcomes: 0

- **Demand**: 3 observation(s), latest 2026-02-18, assumption asm-95Mu2jmR
- **Geopolitics and tariffs**: 3 observation(s), latest 2026-02-18, assumption asm-pqM8Z7ti
- **Liquidity**: 3 observation(s), latest 2026-02-18, assumption asm-ZLuzbVSm
- **Macro and foreign exchange**: 3 observation(s), latest 2026-02-18, assumption asm-7SQu4X65
- **Supply chain**: 3 observation(s), latest 2026-02-18, assumption asm-7qZgVGjH
- **Cloud and data center capacity**: 2 observation(s), latest 2026-02-18, assumption asm-Qw88LWZ8
- **Competition**: 2 observation(s), latest 2026-02-18, assumption asm-5Eunm29d
- **Inventory and channel**: 2 observation(s), latest 2026-02-18, assumption asm-wKSFmyVi

### LLY

- Filings scanned: 2
- Window: 2026-02-12 to 2026-04-30
- Themes tracked: 11
- Observations: 35
- Staged outcomes: 0

- **AI, R&D, and technology**: 4 observation(s), latest 2026-04-30, assumption asm-69jtMP1B
- **Competition**: 4 observation(s), latest 2026-04-30, assumption asm-wwrjFeBT
- **Demand**: 4 observation(s), latest 2026-04-30, assumption asm-29kbMSBz
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-04-30, assumption asm-XjeXuqdS
- **Liquidity**: 4 observation(s), latest 2026-04-30, assumption asm-DzsorZN1
- **Regulation and legal**: 4 observation(s), latest 2026-04-30, assumption asm-VFoQikod
- **Supply chain**: 4 observation(s), latest 2026-04-30, assumption asm-Yat6WVD3
- **Macro and foreign exchange**: 3 observation(s), latest 2026-04-30, assumption asm-derUbUFf

### CVX

- Filings scanned: 2
- Window: 2025-11-06 to 2026-02-24
- Themes tracked: 12
- Observations: 36
- Staged outcomes: 0

- **Demand**: 4 observation(s), latest 2026-02-24, assumption asm-byZ4orH6
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-02-24, assumption asm-odV8PJUu
- **Liquidity**: 4 observation(s), latest 2026-02-24, assumption asm-5he1jyBB
- **Macro and foreign exchange**: 4 observation(s), latest 2026-02-24, assumption asm-A6GfvtrT
- **Regulation and legal**: 4 observation(s), latest 2026-02-24, assumption asm-LidC1ga9
- **Supply chain**: 4 observation(s), latest 2026-02-24, assumption asm-DbV1sbEF
- **Competition**: 3 observation(s), latest 2026-02-24, assumption asm-NRVecFwa
- **Cybersecurity and privacy**: 3 observation(s), latest 2026-02-24, assumption asm-LVdaWhP8

### JNJ

- Filings scanned: 2
- Window: 2026-02-11 to 2026-04-22
- Themes tracked: 11
- Observations: 26
- Staged outcomes: 0

- **AI, R&D, and technology**: 3 observation(s), latest 2026-04-22, assumption asm-hRSm45i8
- **Competition**: 3 observation(s), latest 2026-04-22, assumption asm-AxC8rZQY
- **Demand**: 3 observation(s), latest 2026-04-22, assumption asm-CKihdmSD
- **Inventory and channel**: 3 observation(s), latest 2026-04-22, assumption asm-zmNuKYC7
- **Regulation and legal**: 3 observation(s), latest 2026-04-22, assumption asm-7ikEapJ9
- **Supply chain**: 3 observation(s), latest 2026-04-22, assumption asm-dNq8J6Vp
- **Cloud and data center capacity**: 2 observation(s), latest 2026-02-11, assumption asm-kwu8591Z
- **Geopolitics and tariffs**: 2 observation(s), latest 2026-04-22, assumption asm-ByVJrbiD

### MRK

- Filings scanned: 2
- Window: 2025-11-05 to 2026-02-24
- Themes tracked: 12
- Observations: 22
- Staged outcomes: 0

- **Supply chain**: 3 observation(s), latest 2026-02-24, assumption asm-TQYN98UA
- **AI, R&D, and technology**: 2 observation(s), latest 2026-02-24, assumption asm-wBcvhCMy
- **Cloud and data center capacity**: 2 observation(s), latest 2026-02-24, assumption asm-juZNihiF
- **Competition**: 2 observation(s), latest 2026-02-24, assumption asm-2E9HuqMi
- **Customer and platform dependency**: 2 observation(s), latest 2026-02-24, assumption asm-f8zcqTYW
- **Demand**: 2 observation(s), latest 2026-02-24, assumption asm-96zG2mzo
- **Geopolitics and tariffs**: 2 observation(s), latest 2026-02-24, assumption asm-nZLNiqsb
- **Macro and foreign exchange**: 2 observation(s), latest 2026-02-24, assumption asm-AovWRn1g

### AAPL

- Filings scanned: 2
- Window: 2026-01-30 to 2026-05-01
- Themes tracked: 12
- Observations: 34
- Staged outcomes: 0

- **Demand**: 4 observation(s), latest 2026-05-01, assumption asm-bZMiog1R
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-05-01, assumption asm-fGLeK2CB
- **AI, R&D, and technology**: 3 observation(s), latest 2026-05-01, assumption asm-GfmjNzyR
- **Cloud and data center capacity**: 3 observation(s), latest 2026-05-01, assumption asm-DGwaJLnR
- **Customer and platform dependency**: 3 observation(s), latest 2026-05-01, assumption asm-e56MdArq
- **Inventory and channel**: 3 observation(s), latest 2026-05-01, assumption asm-TPpVPXUW
- **Liquidity**: 3 observation(s), latest 2026-05-01, assumption asm-7k9coxno
- **Macro and foreign exchange**: 3 observation(s), latest 2026-05-01, assumption asm-8cv24FkW

### HD

- Filings scanned: 2
- Window: 2025-11-25 to 2026-03-18
- Themes tracked: 12
- Observations: 45
- Staged outcomes: 0

- **AI, R&D, and technology**: 4 observation(s), latest 2026-03-18, assumption asm-RuHYu9Zi
- **Competition**: 4 observation(s), latest 2026-03-18, assumption asm-zQBY1qyn
- **Cybersecurity and privacy**: 4 observation(s), latest 2026-03-18, assumption asm-TntsTpsy
- **Demand**: 4 observation(s), latest 2026-03-18, assumption asm-mHcifgga
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-03-18, assumption asm-R4gDrQuf
- **Inventory and channel**: 4 observation(s), latest 2026-03-18, assumption asm-Lx9xebXY
- **Liquidity**: 4 observation(s), latest 2026-03-18, assumption asm-v4Pxrpe5
- **Macro and foreign exchange**: 4 observation(s), latest 2026-03-18, assumption asm-oKP9rAjK

### MSFT

- Filings scanned: 2
- Window: 2026-01-28 to 2026-04-29
- Themes tracked: 12
- Observations: 41
- Staged outcomes: 4

- **AI, R&D, and technology**: 4 observation(s), latest 2026-04-29, assumption asm-GPdNP7yd
- **Cloud and data center capacity**: 4 observation(s), latest 2026-04-29, assumption asm-iS9WFPyL
- **Customer and platform dependency**: 4 observation(s), latest 2026-04-29, assumption asm-nDm6sdHQ
- **Demand**: 4 observation(s), latest 2026-04-29, assumption asm-dXEwthLZ
- **Inventory and channel**: 4 observation(s), latest 2026-04-29, assumption asm-tMchKBY9
- **Liquidity**: 4 observation(s), latest 2026-04-29, assumption asm-uS6AYm78
- **Macro and foreign exchange**: 4 observation(s), latest 2026-04-29, assumption asm-yyHd4h7k
- **Regulation and legal**: 4 observation(s), latest 2026-04-29, assumption asm-wYKdaUEh

### AMZN

- Filings scanned: 2
- Window: 2026-02-06 to 2026-04-30
- Themes tracked: 11
- Observations: 41
- Staged outcomes: 0

- **Cloud and data center capacity**: 4 observation(s), latest 2026-04-30, assumption asm-gmyqhGKK
- **Competition**: 4 observation(s), latest 2026-04-30, assumption asm-sNf7JTNq
- **Demand**: 4 observation(s), latest 2026-04-30, assumption asm-h7WFrddz
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-04-30, assumption asm-8NG69jM2
- **Inventory and channel**: 4 observation(s), latest 2026-04-30, assumption asm-1RW49Krm
- **Liquidity**: 4 observation(s), latest 2026-04-30, assumption asm-5HMLeioN
- **Macro and foreign exchange**: 4 observation(s), latest 2026-04-30, assumption asm-ZnvKhXnN
- **Regulation and legal**: 4 observation(s), latest 2026-04-30, assumption asm-y7oo8243

### NVDA

- Filings scanned: 2
- Window: 2025-11-19 to 2026-02-25
- Themes tracked: 12
- Observations: 44
- Staged outcomes: 3

- **AI, R&D, and technology**: 4 observation(s), latest 2026-02-25, assumption asm-M9BqnqJU
- **Cloud and data center capacity**: 4 observation(s), latest 2026-02-25, assumption asm-brNvVSUn
- **Competition**: 4 observation(s), latest 2026-02-25, assumption asm-m5uwsntD
- **Customer and platform dependency**: 4 observation(s), latest 2026-02-25, assumption asm-L5HKPogZ
- **Demand**: 4 observation(s), latest 2026-02-25, assumption asm-WhezHdP9
- **Inventory and channel**: 4 observation(s), latest 2026-02-25, assumption asm-McDqnPXB
- **Liquidity**: 4 observation(s), latest 2026-02-25, assumption asm-8rmpaVJX
- **Macro and foreign exchange**: 4 observation(s), latest 2026-02-25, assumption asm-WHQXkXza

### NFLX

- Filings scanned: 2
- Window: 2026-01-23 to 2026-04-17
- Themes tracked: 12
- Observations: 31
- Staged outcomes: 1

- **Demand**: 4 observation(s), latest 2026-04-17, assumption asm-BE4ofwHA
- **Liquidity**: 4 observation(s), latest 2026-04-17, assumption asm-GV2BtzMT
- **Competition**: 3 observation(s), latest 2026-04-17, assumption asm-FQchxbyr
- **Macro and foreign exchange**: 3 observation(s), latest 2026-04-17, assumption asm-1fj8mSeN
- **Regulation and legal**: 3 observation(s), latest 2026-04-17, assumption asm-n1vWsVVR
- **Supply chain**: 3 observation(s), latest 2026-04-17, assumption asm-H5dqJ1PW
- **AI, R&D, and technology**: 2 observation(s), latest 2026-01-23, assumption asm-zaPTFdxC
- **Cloud and data center capacity**: 2 observation(s), latest 2026-04-17, assumption asm-cWWLp4N5

### COP

- Filings scanned: 2
- Window: 2026-02-17 to 2026-04-30
- Themes tracked: 9
- Observations: 31
- Staged outcomes: 0

- **Demand**: 4 observation(s), latest 2026-04-30, assumption asm-qrdkAb5G
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-04-30, assumption asm-MUZiab1j
- **Liquidity**: 4 observation(s), latest 2026-04-30, assumption asm-KiiU87xT
- **Macro and foreign exchange**: 4 observation(s), latest 2026-04-30, assumption asm-d5ERdzDj
- **Regulation and legal**: 4 observation(s), latest 2026-04-30, assumption asm-tirpifGy
- **Cloud and data center capacity**: 3 observation(s), latest 2026-04-30, assumption asm-5eLWKNi6
- **Competition**: 3 observation(s), latest 2026-04-30, assumption asm-zBMnrdpG
- **Supply chain**: 3 observation(s), latest 2026-04-30, assumption asm-KzXFCoPY

### TSLA

- Filings scanned: 2
- Window: 2026-01-29 to 2026-04-23
- Themes tracked: 12
- Observations: 39
- Staged outcomes: 2

- **AI, R&D, and technology**: 4 observation(s), latest 2026-04-23, assumption asm-6hkP4A2y
- **Cloud and data center capacity**: 4 observation(s), latest 2026-04-23, assumption asm-ow6RyeQP
- **Demand**: 4 observation(s), latest 2026-04-23, assumption asm-d64bQ4Up
- **Liquidity**: 4 observation(s), latest 2026-04-23, assumption asm-gZhkp4ux
- **Macro and foreign exchange**: 4 observation(s), latest 2026-04-23, assumption asm-CVaT3FJn
- **Regulation and legal**: 4 observation(s), latest 2026-04-23, assumption asm-2NxoiyQj
- **Supply chain**: 4 observation(s), latest 2026-04-23, assumption asm-qFzNqki9
- **Competition**: 3 observation(s), latest 2026-04-23, assumption asm-tY6BbkGH

### META

- Filings scanned: 2
- Window: 2026-01-29 to 2026-04-30
- Themes tracked: 10
- Observations: 40
- Staged outcomes: 1

- **AI, R&D, and technology**: 4 observation(s), latest 2026-04-30, assumption asm-X9MwxdeC
- **Cloud and data center capacity**: 4 observation(s), latest 2026-04-30, assumption asm-68eG1Yp3
- **Competition**: 4 observation(s), latest 2026-04-30, assumption asm-vmogEUG9
- **Customer and platform dependency**: 4 observation(s), latest 2026-04-30, assumption asm-VnPHVXpM
- **Cybersecurity and privacy**: 4 observation(s), latest 2026-04-30, assumption asm-KdqVugiw
- **Demand**: 4 observation(s), latest 2026-04-30, assumption asm-vfyxVhjv
- **Geopolitics and tariffs**: 4 observation(s), latest 2026-04-30, assumption asm-yot7L65L
- **Liquidity**: 4 observation(s), latest 2026-04-30, assumption asm-L1facWwu

### GOOGL

- Filings scanned: 2
- Window: 2026-02-05 to 2026-04-30
- Themes tracked: 12
- Observations: 35
- Staged outcomes: 0

- **AI, R&D, and technology**: 4 observation(s), latest 2026-04-30, assumption asm-hgXczyrR
- **Cloud and data center capacity**: 4 observation(s), latest 2026-04-30, assumption asm-HwoHakqe
- **Customer and platform dependency**: 4 observation(s), latest 2026-04-30, assumption asm-UnoJ8zXs
- **Demand**: 4 observation(s), latest 2026-04-30, assumption asm-433vtUgS
- **Macro and foreign exchange**: 4 observation(s), latest 2026-04-30, assumption asm-15WEgG2f
- **Regulation and legal**: 4 observation(s), latest 2026-04-30, assumption asm-NyaXZnEk
- **Competition**: 3 observation(s), latest 2026-04-30, assumption asm-k464Quak
- **Cybersecurity and privacy**: 2 observation(s), latest 2026-04-30, assumption asm-7XV9QgNR

## Cross-Company Theme Matrix

| Theme | Companies | Observations | Latest Seen |
|---|---:|---:|---|
| Demand | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 56 | 2026-05-01 |
| Regulation and legal | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 53 | 2026-05-01 |
| Liquidity | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 51 | 2026-05-01 |
| Macro and foreign exchange | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 51 | 2026-05-01 |
| Geopolitics and tariffs | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 46 | 2026-05-01 |
| Cloud and data center capacity | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 44 | 2026-05-01 |
| Competition | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 44 | 2026-05-01 |
| Supply chain | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 47 | 2026-05-01 |
| AI, R&D, and technology | AAPL, AMZN, CVX, GOOGL, HD, JNJ, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 44 | 2026-05-01 |
| Inventory and channel | AAPL, AMZN, COP, CVX, GOOGL, HD, JNJ, LLY, MRK, MSFT, NFLX, NVDA, TSLA, XOM | 34 | 2026-05-01 |
| Cybersecurity and privacy | AAPL, AMZN, CVX, GOOGL, HD, LLY, META, MRK, MSFT, NFLX, NVDA, TSLA | 26 | 2026-05-01 |
| Customer and platform dependency | AAPL, CVX, GOOGL, HD, JNJ, META, MRK, MSFT, NFLX, NVDA, TSLA | 28 | 2026-05-01 |

## Sector Assumption Matrix

| Sector | Companies | Themes | Observations | Staged Outcomes | Top Shared Themes |
|---|---:|---:|---:|---:|---|
| Communication Services | 3 | 12 | 106 | 2 | Demand, Macro and foreign exchange, Regulation and legal, AI, R&D, and technology, Cloud and data center capacity |
| Consumer Discretionary | 3 | 12 | 125 | 2 | Demand, Liquidity, Macro and foreign exchange, Regulation and legal, Supply chain |
| Energy | 3 | 12 | 91 | 0 | Demand, Geopolitics and tariffs, Liquidity, Macro and foreign exchange, Regulation and legal |
| Health Care | 3 | 12 | 83 | 0 | Supply chain, AI, R&D, and technology, Competition, Demand, Regulation and legal |
| Information Technology | 3 | 12 | 119 | 7 | Demand, AI, R&D, and technology, Cloud and data center capacity, Customer and platform dependency, Inventory and channel |

## Cross-Sector Mechanism Patterns

- **Cloud and data center capacity / Capacity investment and operating expense drag**: 3 sector(s), 4 company(ies), 14 observation(s), 2 realized candidate(s).
  - Sectors: Consumer Discretionary, Energy, Information Technology
- **Inventory and channel / Geographic concentration or local disruption**: 3 sector(s), 3 company(ies), 9 observation(s), 2 realized candidate(s).
  - Sectors: Consumer Discretionary, Energy, Information Technology
- **Demand / Geographic concentration or local disruption**: 2 sector(s), 2 company(ies), 8 observation(s), 2 realized candidate(s).
  - Sectors: Consumer Discretionary, Information Technology
- **Geopolitics and tariffs / Geographic concentration or local disruption**: 3 sector(s), 5 company(ies), 15 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Health Care, Information Technology
- **Demand / Interest, credit, or liquidity stress**: 2 sector(s), 2 company(ies), 8 observation(s), 1 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary
- **Liquidity / Interest, credit, or liquidity stress**: 4 sector(s), 8 company(ies), 27 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Health Care, Information Technology
- **Customer and platform dependency / Platform or customer concentration**: 4 sector(s), 8 company(ies), 25 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Health Care, Information Technology
- **Macro and foreign exchange / Geographic concentration or local disruption**: 4 sector(s), 4 company(ies), 15 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Health Care, Information Technology
- **Regulation and legal / Capacity investment and operating expense drag**: 4 sector(s), 4 company(ies), 14 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Energy, Information Technology
- **Liquidity / Capacity investment and operating expense drag**: 3 sector(s), 3 company(ies), 11 observation(s), 0 realized candidate(s).
  - Sectors: Consumer Discretionary, Energy, Information Technology
- **Macro and foreign exchange / Interest, credit, or liquidity stress**: 3 sector(s), 3 company(ies), 11 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Information Technology
- **Regulation and legal / Regulatory investigation or litigation**: 3 sector(s), 3 company(ies), 11 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary, Information Technology
- **Macro and foreign exchange / Commodity or input cost pressure**: 2 sector(s), 2 company(ies), 8 observation(s), 0 realized candidate(s).
  - Sectors: Consumer Discretionary, Energy
- **Competition / Platform or customer concentration**: 2 sector(s), 2 company(ies), 7 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Information Technology
- **Supply chain / Interest, credit, or liquidity stress**: 2 sector(s), 2 company(ies), 7 observation(s), 0 realized candidate(s).
  - Sectors: Consumer Discretionary, Information Technology
- **Cybersecurity and privacy / Interest, credit, or liquidity stress**: 2 sector(s), 2 company(ies), 6 observation(s), 0 realized candidate(s).
  - Sectors: Communication Services, Consumer Discretionary
- **Cloud and data center capacity / Commodity or input cost pressure**: 2 sector(s), 2 company(ies), 5 observation(s), 0 realized candidate(s).
  - Sectors: Energy, Health Care
- **Cybersecurity and privacy / Data breach, outage, or service disruption**: 2 sector(s), 3 company(ies), 5 observation(s), 0 realized candidate(s).
  - Sectors: Health Care, Information Technology
- **Inventory and channel / Commodity or input cost pressure**: 2 sector(s), 2 company(ies), 5 observation(s), 0 realized candidate(s).
  - Sectors: Energy, Health Care

## Observation Evidence Examples

- **LLY / AI, R&D, and technology** (2026-02-12, item-1a)
  - Source: sec-company://0000059478/0000059478-26-000013#item-1a:theme:ai-rd-technology:assumption
  - Pharmaceutical research and development is very costly and highly uncertain; we may not succeed in developing, licensing, or acquiring commercially successful products sufficient in number or value to replace revenues of products that have lost or will lose intellectual property protection or are di
- **HD / AI, R&D, and technology** (2025-11-25, part-i-item-2)
  - Source: sec-company://0000354950/0001628280-25-053868#part-i-item-2:theme:ai-rd-technology:assumption
  - Forward-looking statements may relate to, among other things, the demand for our products and services, including as a result of macroeconomic conditions and changing customer preferences and expectations; net sales growth; comparable sales; the effects of competition; our brand and reputation; impl
- **MSFT / AI, R&D, and technology** (2026-01-28, part-i-item-2)
  - Source: sec-company://0000789019/0001193125-26-027207#part-i-item-2:theme:ai-rd-technology:assumption
  - Operating expenses increased $236 million or 6% driven by impairment charges in our Gaming business and research and development investments in compute capacity and AI talent.
- **NVDA / AI, R&D, and technology** (2025-11-19, part-i-item-2)
  - Source: sec-company://0001045810/0001045810-25-000230#part-i-item-2:theme:ai-rd-technology:assumption
  - Since our original focus on PC graphics, we have expanded to several other large and important computationally intensive fields. Fueled by the sustained demand for exceptional 3D graphics and the scale of the gaming market, NVIDIA has leveraged its GPU architecture to create platforms for scientific
- **TSLA / AI, R&D, and technology** (2026-01-29, item-1a)
  - Source: sec-company://0001318605/0001628280-26-003952#item-1a:theme:ai-rd-technology:assumption
  - In particular, our future business depends on development of our driver assistance systems and autonomous driving solutions and increasing the production of mass-market vehicles, including Cybercab, our purpose-built Robotaxi product. In order to be successful, we will need to further advance our ca
- **META / AI, R&D, and technology** (2026-01-29, item-1a)
  - Source: sec-company://0001326801/0001628280-26-003942#item-1a:theme:ai-rd-technology:assumption
  - our ability to build, maintain, and scale our technical infrastructure, and risks associated with disruptions in our service, catastrophic events, and crises;

## Realized Outcome Review Events

11 staged candidate(s) grouped into 8 review event(s). Apply still operates on candidate IDs; groups are for review only.

- **MSFT** 2026-01-28: 2 candidate(s), AI, R&D, and technology, Cloud and data center capacity
  - Candidate IDs: cout-1KC2EGLt, cout-iEbFA9td
  - Representative source: sec-company://0000789019/0001193125-26-027207#part-i-item-2:theme:cloud-data-center-capacity:outcome
  - Operating expenses increased $236 million or 6% driven by impairment charges in our Gaming business and research and development investments in compute capacity and AI talent.
- **MSFT** 2026-04-29: 2 candidate(s), AI, R&D, and technology, Cloud and data center capacity
  - Candidate IDs: cout-X4ua1bAb, cout-ewhLhPHk
  - Representative source: sec-company://0000789019/0001193125-26-191507#part-i-item-2:theme:cloud-data-center-capacity:outcome
  - Operating expenses increased $628 million or 6% driven by impairment and other related expenses in our Gaming business and continued investments in research and development compute capacity, AI talent, and data to support product development that benefits the entire portfolio.
- **NVDA** 2026-02-25: 2 candidate(s), Demand, Inventory and channel
  - Candidate IDs: cout-kXoBT5HF, cout-ogV4H2p7
  - Representative source: sec-company://0001045810/0001045810-26-000021#item-7:theme:demand:outcome
  - In April 2025, the USG informed us that a license is required for exports of our H20 product into the China market. As a result of these requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purchase obligations, as the 
- **META** 2026-04-30: 1 candidate(s), Geopolitics and tariffs
  - Candidate IDs: cout-Ht9MFXWY
  - Representative source: sec-company://0001326801/0001628280-26-028526#part-ii-item-1a:theme:geopolitics-tariffs:outcome
  - User growth and engagement are also impacted by a number of other factors, including competitive products and services, such as TikTok, that have reduced some users' engagement with our products and services, as well as global and regional business, macroeconomic, and geopolitical conditions. For ex
- **NFLX** 2026-04-17: 1 candidate(s), Demand
  - Candidate IDs: cout-4xp45AFo
  - Representative source: sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil
- **NVDA** 2025-11-19: 1 candidate(s), Inventory and channel
  - Candidate IDs: cout-9vSCaRcJ
  - Representative source: sec-company://0001045810/0001045810-25-000230#part-i-item-2:theme:inventory-channel:outcome
  - In April 2025, the U.S. government, or USG, informed us that a license is required for exports of our H20 product into the China market. As a result of these new requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purc
- **TSLA** 2026-01-29: 1 candidate(s), Supply chain
  - Candidate IDs: cout-wimxiZSE
  - Representative source: sec-company://0001318605/0001628280-26-003952#item-1a:theme:supply-chain:outcome
  - We will also need to hire, train and compensate skilled employees to operate these facilities. Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing proce
- **TSLA** 2026-01-29: 1 candidate(s), Demand
  - Candidate IDs: cout-byFW2ZJs
  - Representative source: sec-company://0001318605/0001628280-26-003952#item-7:theme:demand:outcome
  - In 2025, we recognized total revenues of $94.83 billion, representing a decrease of $2.86 billion compared to the prior year. In 2025, our net income attributable to common stockholders was $3.79 billion, representing a decrease of $3.30 billion compared to the prior year.

## Realized Outcome Candidates

These candidates are staged for human review. Applying them requires company.apply_outcomes.

- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001193125-26-027207#part-i-item-2:theme:cloud-data-center-capacity:outcome)
  - Operating expenses increased $236 million or 6% driven by impairment charges in our Gaming business and research and development investments in compute capacity and AI talent.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001193125-26-027207#part-i-item-2:theme:ai-rd-technology:outcome)
  - Operating expenses increased $236 million or 6% driven by impairment charges in our Gaming business and research and development investments in compute capacity and AI talent.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001193125-26-191507#part-i-item-2:theme:cloud-data-center-capacity:outcome)
  - Operating expenses increased $628 million or 6% driven by impairment and other related expenses in our Gaming business and continued investments in research and development compute capacity, AI talent, and data to support product development that benefits the entire portfolio.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0000789019/0001193125-26-191507#part-i-item-2:theme:ai-rd-technology:outcome)
  - Operating expenses increased $628 million or 6% driven by impairment and other related expenses in our Gaming business and continued investments in research and development compute capacity, AI talent, and data to support product development that benefits the entire portfolio.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001045810/0001045810-25-000230#part-i-item-2:theme:inventory-channel:outcome)
  - In April 2025, the U.S. government, or USG, informed us that a license is required for exports of our H20 product into the China market. As a result of these new requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purc
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001045810/0001045810-26-000021#item-7:theme:demand:outcome)
  - In April 2025, the USG informed us that a license is required for exports of our H20 product into the China market. As a result of these requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purchase obligations, as the 
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001045810/0001045810-26-000021#item-7:theme:inventory-channel:outcome)
  - In April 2025, the USG informed us that a license is required for exports of our H20 product into the China market. As a result of these requirements, we incurred a $4.5 billion charge in the first quarter of fiscal year 2026 associated with H20 for excess inventory and purchase obligations, as the 
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001628280-26-003952#item-1a:theme:supply-chain:outcome)
  - We will also need to hire, train and compensate skilled employees to operate these facilities. Bottlenecks and other unexpected challenges such as those we experienced in the past may arise during our production ramps, and we must address them promptly while continuing to improve manufacturing proce
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001318605/0001628280-26-003952#item-7:theme:demand:outcome)
  - In 2025, we recognized total revenues of $94.83 billion, representing a decrease of $2.86 billion compared to the prior year. In 2025, our net income attributable to common stockholders was $3.79 billion, representing a decrease of $3.30 billion compared to the prior year.
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001326801/0001628280-26-028526#part-ii-item-1a:theme:geopolitics-tariffs:outcome)
  - User growth and engagement are also impacted by a number of other factors, including competitive products and services, such as TikTok, that have reduced some users' engagement with our products and services, as well as global and regional business, macroeconomic, and geopolitical conditions. For ex
- **0.92** Filing language states this risk had an actual effect on operations, results, costs, or supply. (sec-company://0001065280/0001065280-26-000138#part-i-item-2:theme:demand:outcome)
  - Discovery, Inc. ("WBD") to acquire WBD's streaming and studios businesses, including its film and television studios, HBO Max and HBO (such transaction, the "WBD transaction"). The increase in net income was additionally impacted by a $610 million increase in operating income, driven by a $1,707 mil

## Source Themes

- **XOM / AI, R&D, and technology**: first 2026-02-18, latest 2026-02-18, assumption asm-z81LUfvt
- **XOM / Cloud and data center capacity**: first 2026-02-18, latest 2026-02-18, assumption asm-Qw88LWZ8
- **XOM / Competition**: first 2026-02-18, latest 2026-02-18, assumption asm-5Eunm29d
- **XOM / Demand**: first 2025-11-03, latest 2026-02-18, assumption asm-95Mu2jmR
- **XOM / Geopolitics and tariffs**: first 2025-11-03, latest 2026-02-18, assumption asm-pqM8Z7ti
- **XOM / Inventory and channel**: first 2025-11-03, latest 2026-02-18, assumption asm-wKSFmyVi
- **XOM / Liquidity**: first 2025-11-03, latest 2026-02-18, assumption asm-ZLuzbVSm
- **XOM / Macro and foreign exchange**: first 2025-11-03, latest 2026-02-18, assumption asm-7SQu4X65
- **XOM / Regulation and legal**: first 2026-02-18, latest 2026-02-18, assumption asm-Rmn6qnow
- **XOM / Supply chain**: first 2025-11-03, latest 2026-02-18, assumption asm-7qZgVGjH
- **LLY / AI, R&D, and technology**: first 2026-02-12, latest 2026-04-30, assumption asm-69jtMP1B
- **LLY / Cloud and data center capacity**: first 2026-02-12, latest 2026-02-12, assumption asm-vFx2JWYH
- **LLY / Competition**: first 2026-02-12, latest 2026-04-30, assumption asm-wwrjFeBT
- **LLY / Cybersecurity and privacy**: first 2026-04-30, latest 2026-04-30, assumption asm-GkdkCDoq
- **LLY / Demand**: first 2026-02-12, latest 2026-04-30, assumption asm-29kbMSBz
- **LLY / Geopolitics and tariffs**: first 2026-02-12, latest 2026-04-30, assumption asm-XjeXuqdS
- **LLY / Inventory and channel**: first 2026-02-12, latest 2026-02-12, assumption asm-kr3kAjuR
- **LLY / Liquidity**: first 2026-02-12, latest 2026-04-30, assumption asm-DzsorZN1
- **LLY / Macro and foreign exchange**: first 2026-02-12, latest 2026-04-30, assumption asm-derUbUFf
- **LLY / Regulation and legal**: first 2026-02-12, latest 2026-04-30, assumption asm-VFoQikod
- **LLY / Supply chain**: first 2026-02-12, latest 2026-04-30, assumption asm-Yat6WVD3
- **CVX / AI, R&D, and technology**: first 2026-02-24, latest 2026-02-24, assumption asm-ZSJopWuv
- **CVX / Cloud and data center capacity**: first 2026-02-24, latest 2026-02-24, assumption asm-CrQ9sp2d
- **CVX / Competition**: first 2025-11-06, latest 2026-02-24, assumption asm-NRVecFwa
- **CVX / Customer and platform dependency**: first 2026-02-24, latest 2026-02-24, assumption asm-7nH5hRnj
- **CVX / Cybersecurity and privacy**: first 2025-11-06, latest 2026-02-24, assumption asm-LVdaWhP8
- **CVX / Demand**: first 2025-11-06, latest 2026-02-24, assumption asm-byZ4orH6
- **CVX / Geopolitics and tariffs**: first 2025-11-06, latest 2026-02-24, assumption asm-odV8PJUu
- **CVX / Inventory and channel**: first 2026-02-24, latest 2026-02-24, assumption asm-UavM8bzd
- **CVX / Liquidity**: first 2025-11-06, latest 2026-02-24, assumption asm-5he1jyBB
- **CVX / Macro and foreign exchange**: first 2025-11-06, latest 2026-02-24, assumption asm-A6GfvtrT
- **CVX / Regulation and legal**: first 2025-11-06, latest 2026-02-24, assumption asm-LidC1ga9
- **CVX / Supply chain**: first 2025-11-06, latest 2026-02-24, assumption asm-DbV1sbEF
- **JNJ / AI, R&D, and technology**: first 2026-02-11, latest 2026-04-22, assumption asm-hRSm45i8
- **JNJ / Cloud and data center capacity**: first 2026-02-11, latest 2026-02-11, assumption asm-kwu8591Z
- **JNJ / Competition**: first 2026-02-11, latest 2026-04-22, assumption asm-AxC8rZQY
- **JNJ / Customer and platform dependency**: first 2026-04-22, latest 2026-04-22, assumption asm-aRpVrXKX
- **JNJ / Demand**: first 2026-02-11, latest 2026-04-22, assumption asm-CKihdmSD
- **JNJ / Geopolitics and tariffs**: first 2026-02-11, latest 2026-04-22, assumption asm-ByVJrbiD
- **JNJ / Inventory and channel**: first 2026-02-11, latest 2026-04-22, assumption asm-zmNuKYC7
- **JNJ / Liquidity**: first 2026-02-11, latest 2026-02-11, assumption asm-BRPT8hzw
- **JNJ / Macro and foreign exchange**: first 2026-02-11, latest 2026-02-11, assumption asm-wewjF5g5
- **JNJ / Regulation and legal**: first 2026-02-11, latest 2026-04-22, assumption asm-7ikEapJ9
- **JNJ / Supply chain**: first 2026-02-11, latest 2026-04-22, assumption asm-dNq8J6Vp
- **MRK / AI, R&D, and technology**: first 2025-11-05, latest 2026-02-24, assumption asm-wBcvhCMy
- **MRK / Cloud and data center capacity**: first 2026-02-24, latest 2026-02-24, assumption asm-juZNihiF
- **MRK / Competition**: first 2025-11-05, latest 2026-02-24, assumption asm-2E9HuqMi
- **MRK / Customer and platform dependency**: first 2026-02-24, latest 2026-02-24, assumption asm-f8zcqTYW
- **MRK / Cybersecurity and privacy**: first 2026-02-24, latest 2026-02-24, assumption asm-bojVjQ7w
- **MRK / Demand**: first 2025-11-05, latest 2026-02-24, assumption asm-96zG2mzo
- **MRK / Geopolitics and tariffs**: first 2025-11-05, latest 2026-02-24, assumption asm-nZLNiqsb
- **MRK / Inventory and channel**: first 2026-02-24, latest 2026-02-24, assumption asm-RHPUNY5X
- **MRK / Liquidity**: first 2026-02-24, latest 2026-02-24, assumption asm-gEXikJUV
- **MRK / Macro and foreign exchange**: first 2025-11-05, latest 2026-02-24, assumption asm-AovWRn1g
- **MRK / Regulation and legal**: first 2025-11-05, latest 2026-02-24, assumption asm-ak64bURW
- **MRK / Supply chain**: first 2025-11-05, latest 2026-02-24, assumption asm-TQYN98UA
- **AAPL / AI, R&D, and technology**: first 2026-01-30, latest 2026-05-01, assumption asm-GfmjNzyR
- **AAPL / Cloud and data center capacity**: first 2026-01-30, latest 2026-05-01, assumption asm-DGwaJLnR
- **AAPL / Competition**: first 2026-05-01, latest 2026-05-01, assumption asm-4PhFSN51
- **AAPL / Customer and platform dependency**: first 2026-01-30, latest 2026-05-01, assumption asm-e56MdArq
- **AAPL / Cybersecurity and privacy**: first 2026-05-01, latest 2026-05-01, assumption asm-bk44RwyX
- **AAPL / Demand**: first 2026-01-30, latest 2026-05-01, assumption asm-bZMiog1R
- **AAPL / Geopolitics and tariffs**: first 2026-01-30, latest 2026-05-01, assumption asm-fGLeK2CB
- **AAPL / Inventory and channel**: first 2026-01-30, latest 2026-05-01, assumption asm-TPpVPXUW
- **AAPL / Liquidity**: first 2026-01-30, latest 2026-05-01, assumption asm-7k9coxno
- **AAPL / Macro and foreign exchange**: first 2026-01-30, latest 2026-05-01, assumption asm-8cv24FkW
- **AAPL / Regulation and legal**: first 2026-01-30, latest 2026-05-01, assumption asm-1YX8XTZ3
- **AAPL / Supply chain**: first 2026-01-30, latest 2026-05-01, assumption asm-qifpmvK3
- **HD / AI, R&D, and technology**: first 2025-11-25, latest 2026-03-18, assumption asm-RuHYu9Zi
- **HD / Cloud and data center capacity**: first 2025-11-25, latest 2026-03-18, assumption asm-NjNY7RKy
- **HD / Competition**: first 2025-11-25, latest 2026-03-18, assumption asm-zQBY1qyn
- **HD / Customer and platform dependency**: first 2026-03-18, latest 2026-03-18, assumption asm-Gq2ssZPJ
- **HD / Cybersecurity and privacy**: first 2025-11-25, latest 2026-03-18, assumption asm-TntsTpsy
- **HD / Demand**: first 2025-11-25, latest 2026-03-18, assumption asm-mHcifgga
- **HD / Geopolitics and tariffs**: first 2025-11-25, latest 2026-03-18, assumption asm-R4gDrQuf
- **HD / Inventory and channel**: first 2025-11-25, latest 2026-03-18, assumption asm-Lx9xebXY
- **HD / Liquidity**: first 2025-11-25, latest 2026-03-18, assumption asm-v4Pxrpe5
- **HD / Macro and foreign exchange**: first 2025-11-25, latest 2026-03-18, assumption asm-oKP9rAjK
- **HD / Regulation and legal**: first 2025-11-25, latest 2026-03-18, assumption asm-WEbJ5uAo
- **HD / Supply chain**: first 2025-11-25, latest 2026-03-18, assumption asm-PJXhv8kH
- **MSFT / AI, R&D, and technology**: first 2026-01-28, latest 2026-04-29, assumption asm-GPdNP7yd
- **MSFT / Cloud and data center capacity**: first 2026-01-28, latest 2026-04-29, assumption asm-iS9WFPyL
- **MSFT / Competition**: first 2026-01-28, latest 2026-01-28, assumption asm-Vwn3Lanp
- **MSFT / Customer and platform dependency**: first 2026-01-28, latest 2026-04-29, assumption asm-nDm6sdHQ
- **MSFT / Cybersecurity and privacy**: first 2026-01-28, latest 2026-04-29, assumption asm-Xr1fk4kq
- **MSFT / Demand**: first 2026-01-28, latest 2026-04-29, assumption asm-dXEwthLZ
- **MSFT / Geopolitics and tariffs**: first 2026-01-28, latest 2026-04-29, assumption asm-oBupZvnm
- **MSFT / Inventory and channel**: first 2026-01-28, latest 2026-04-29, assumption asm-tMchKBY9
- **MSFT / Liquidity**: first 2026-01-28, latest 2026-04-29, assumption asm-uS6AYm78
- **MSFT / Macro and foreign exchange**: first 2026-01-28, latest 2026-04-29, assumption asm-yyHd4h7k
- **MSFT / Regulation and legal**: first 2026-01-28, latest 2026-04-29, assumption asm-wYKdaUEh
- **MSFT / Supply chain**: first 2026-01-28, latest 2026-04-29, assumption asm-ivPdQJPh
- **AMZN / AI, R&D, and technology**: first 2026-02-06, latest 2026-04-30, assumption asm-5Vv2K8mG
- **AMZN / Cloud and data center capacity**: first 2026-02-06, latest 2026-04-30, assumption asm-gmyqhGKK
- **AMZN / Competition**: first 2026-02-06, latest 2026-04-30, assumption asm-sNf7JTNq
- **AMZN / Cybersecurity and privacy**: first 2026-02-06, latest 2026-04-30, assumption asm-14hTdTLG
- **AMZN / Demand**: first 2026-02-06, latest 2026-04-30, assumption asm-h7WFrddz
- **AMZN / Geopolitics and tariffs**: first 2026-02-06, latest 2026-04-30, assumption asm-8NG69jM2
- **AMZN / Inventory and channel**: first 2026-02-06, latest 2026-04-30, assumption asm-1RW49Krm
- **AMZN / Liquidity**: first 2026-02-06, latest 2026-04-30, assumption asm-5HMLeioN
- **AMZN / Macro and foreign exchange**: first 2026-02-06, latest 2026-04-30, assumption asm-ZnvKhXnN
- **AMZN / Regulation and legal**: first 2026-02-06, latest 2026-04-30, assumption asm-y7oo8243
- **AMZN / Supply chain**: first 2026-02-06, latest 2026-04-30, assumption asm-vcz3bsRZ
- **NVDA / AI, R&D, and technology**: first 2025-11-19, latest 2026-02-25, assumption asm-M9BqnqJU
- **NVDA / Cloud and data center capacity**: first 2025-11-19, latest 2026-02-25, assumption asm-brNvVSUn
- **NVDA / Competition**: first 2025-11-19, latest 2026-02-25, assumption asm-m5uwsntD
- **NVDA / Customer and platform dependency**: first 2025-11-19, latest 2026-02-25, assumption asm-L5HKPogZ
- **NVDA / Cybersecurity and privacy**: first 2026-02-25, latest 2026-02-25, assumption asm-KxE2wPUR
- **NVDA / Demand**: first 2025-11-19, latest 2026-02-25, assumption asm-WhezHdP9
- **NVDA / Geopolitics and tariffs**: first 2025-11-19, latest 2026-02-25, assumption asm-cL9LrxMC
- **NVDA / Inventory and channel**: first 2025-11-19, latest 2026-02-25, assumption asm-McDqnPXB
- **NVDA / Liquidity**: first 2025-11-19, latest 2026-02-25, assumption asm-8rmpaVJX
- **NVDA / Macro and foreign exchange**: first 2025-11-19, latest 2026-02-25, assumption asm-WHQXkXza
- **NVDA / Regulation and legal**: first 2025-11-19, latest 2026-02-25, assumption asm-A9J3bWCx
- **NVDA / Supply chain**: first 2025-11-19, latest 2026-02-25, assumption asm-WMLcREWb
- **NFLX / AI, R&D, and technology**: first 2026-01-23, latest 2026-01-23, assumption asm-zaPTFdxC
- **NFLX / Cloud and data center capacity**: first 2026-01-23, latest 2026-04-17, assumption asm-cWWLp4N5
- **NFLX / Competition**: first 2026-01-23, latest 2026-04-17, assumption asm-FQchxbyr
- **NFLX / Customer and platform dependency**: first 2026-01-23, latest 2026-01-23, assumption asm-fyQ9Hqao
- **NFLX / Cybersecurity and privacy**: first 2026-01-23, latest 2026-04-17, assumption asm-cLvPJgRE
- **NFLX / Demand**: first 2026-01-23, latest 2026-04-17, assumption asm-BE4ofwHA
- **NFLX / Geopolitics and tariffs**: first 2026-01-23, latest 2026-04-17, assumption asm-XYcKhS8T
- **NFLX / Inventory and channel**: first 2026-01-23, latest 2026-01-23, assumption asm-wstBSpiL
- **NFLX / Liquidity**: first 2026-01-23, latest 2026-04-17, assumption asm-GV2BtzMT
- **NFLX / Macro and foreign exchange**: first 2026-01-23, latest 2026-04-17, assumption asm-1fj8mSeN
- **NFLX / Regulation and legal**: first 2026-01-23, latest 2026-04-17, assumption asm-n1vWsVVR
- **NFLX / Supply chain**: first 2026-01-23, latest 2026-04-17, assumption asm-H5dqJ1PW
- **COP / Cloud and data center capacity**: first 2026-02-17, latest 2026-04-30, assumption asm-5eLWKNi6
- **COP / Competition**: first 2026-02-17, latest 2026-04-30, assumption asm-zBMnrdpG
- **COP / Demand**: first 2026-02-17, latest 2026-04-30, assumption asm-qrdkAb5G
- **COP / Geopolitics and tariffs**: first 2026-02-17, latest 2026-04-30, assumption asm-MUZiab1j
- **COP / Inventory and channel**: first 2026-02-17, latest 2026-04-30, assumption asm-32rEMt7d
- **COP / Liquidity**: first 2026-02-17, latest 2026-04-30, assumption asm-KiiU87xT
- **COP / Macro and foreign exchange**: first 2026-02-17, latest 2026-04-30, assumption asm-d5ERdzDj
- **COP / Regulation and legal**: first 2026-02-17, latest 2026-04-30, assumption asm-tirpifGy
- **COP / Supply chain**: first 2026-02-17, latest 2026-04-30, assumption asm-KzXFCoPY
- **TSLA / AI, R&D, and technology**: first 2026-01-29, latest 2026-04-23, assumption asm-6hkP4A2y
- **TSLA / Cloud and data center capacity**: first 2026-01-29, latest 2026-04-23, assumption asm-ow6RyeQP
- **TSLA / Competition**: first 2026-01-29, latest 2026-04-23, assumption asm-tY6BbkGH
- **TSLA / Customer and platform dependency**: first 2026-01-29, latest 2026-01-29, assumption asm-QGBDB2Xb
- **TSLA / Cybersecurity and privacy**: first 2026-01-29, latest 2026-01-29, assumption asm-6tXTLoeQ
- **TSLA / Demand**: first 2026-01-29, latest 2026-04-23, assumption asm-d64bQ4Up
- **TSLA / Geopolitics and tariffs**: first 2026-01-29, latest 2026-01-29, assumption asm-iGeNiuks
- **TSLA / Inventory and channel**: first 2026-01-29, latest 2026-04-23, assumption asm-f113sY2h
- **TSLA / Liquidity**: first 2026-01-29, latest 2026-04-23, assumption asm-gZhkp4ux
- **TSLA / Macro and foreign exchange**: first 2026-01-29, latest 2026-04-23, assumption asm-CVaT3FJn
- **TSLA / Regulation and legal**: first 2026-01-29, latest 2026-04-23, assumption asm-2NxoiyQj
- **TSLA / Supply chain**: first 2026-01-29, latest 2026-04-23, assumption asm-qFzNqki9
- **META / AI, R&D, and technology**: first 2026-01-29, latest 2026-04-30, assumption asm-X9MwxdeC
- **META / Cloud and data center capacity**: first 2026-01-29, latest 2026-04-30, assumption asm-68eG1Yp3
- **META / Competition**: first 2026-01-29, latest 2026-04-30, assumption asm-vmogEUG9
- **META / Customer and platform dependency**: first 2026-01-29, latest 2026-04-30, assumption asm-VnPHVXpM
- **META / Cybersecurity and privacy**: first 2026-01-29, latest 2026-04-30, assumption asm-KdqVugiw
- **META / Demand**: first 2026-01-29, latest 2026-04-30, assumption asm-vfyxVhjv
- **META / Geopolitics and tariffs**: first 2026-01-29, latest 2026-04-30, assumption asm-yot7L65L
- **META / Liquidity**: first 2026-01-29, latest 2026-04-30, assumption asm-L1facWwu
- **META / Macro and foreign exchange**: first 2026-01-29, latest 2026-04-30, assumption asm-L17E1Jrs
- **META / Regulation and legal**: first 2026-01-29, latest 2026-04-30, assumption asm-ts2AsHFj
- **GOOGL / AI, R&D, and technology**: first 2026-02-05, latest 2026-04-30, assumption asm-hgXczyrR
- **GOOGL / Cloud and data center capacity**: first 2026-02-05, latest 2026-04-30, assumption asm-HwoHakqe
- **GOOGL / Competition**: first 2026-02-05, latest 2026-04-30, assumption asm-k464Quak
- **GOOGL / Customer and platform dependency**: first 2026-02-05, latest 2026-04-30, assumption asm-UnoJ8zXs
- **GOOGL / Cybersecurity and privacy**: first 2026-02-05, latest 2026-04-30, assumption asm-7XV9QgNR
- **GOOGL / Demand**: first 2026-02-05, latest 2026-04-30, assumption asm-433vtUgS
- **GOOGL / Geopolitics and tariffs**: first 2026-02-05, latest 2026-04-30, assumption asm-fxPwZwrs
- **GOOGL / Inventory and channel**: first 2026-04-30, latest 2026-04-30, assumption asm-6rQm8NTF
- **GOOGL / Liquidity**: first 2026-02-05, latest 2026-04-30, assumption asm-htqD6gRi
- **GOOGL / Macro and foreign exchange**: first 2026-02-05, latest 2026-04-30, assumption asm-15WEgG2f
- **GOOGL / Regulation and legal**: first 2026-02-05, latest 2026-04-30, assumption asm-NyaXZnEk
- **GOOGL / Supply chain**: first 2026-04-30, latest 2026-04-30, assumption asm-MxWBYtT2
