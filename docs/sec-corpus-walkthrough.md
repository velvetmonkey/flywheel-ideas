# SEC Corpus Walkthrough

This is the shortest path through the checked-in SEC proof corpus. It is written for a skeptical reader asking: "Is this more than filing search plus summaries?"

The honest answer: the SEC data is not novel, and finding a sentence in a filing is not novel. The useful part is the lifecycle the tool preserves around that sentence:

```text
old assumption -> dated evidence -> staged failure -> human verdict -> refuted assumption -> lesson -> remaining bets to review
```

Start at the generated [`proof path`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/proof-path.md), then use the [`dashboard`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md) and [`Company Sector Run`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/index.md) as the full table of contents.

## The Claim

`flywheel-ideas` is not a stock picker and not an automated verdict engine. It is an analyst memory system. It records what a thesis depended on, watches later evidence accumulate, stages possible failures, requires a human verdict, and keeps the resulting lesson linked to the original assumption.

The proof corpus matters because SEC filings are a hard input: repeated boilerplate, dated disclosures, noisy candidates, and later realized-risk language. If the tool only summarized filings, this corpus would not be interesting. It becomes useful when an old assumption remains linked to a later accepted outcome and a lesson that can change future review.

## Current Corpus State

- `1,468` SEC filings scanned.
- `349` current company/theme bets still open.
- `486` shadow LLM evaluations preserved as audit evidence.
- `70` accepted failures after human adjudication.
- `70` lesson memos.
- `262` rejected candidate outcomes.
- `0` remaining visible human review events.
- `31` suppressed staged candidates tied to already-refuted assumptions.

The corpus is committed as Markdown only. SQLite, SEC caches, JSON, JSONL, WAL/SHM, and raw operational state are intentionally excluded.

## What To Inspect First

- [`thesis.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/thesis.md): executive view of open bets, accepted failures, and what still needs review.
- [`dashboard.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md): one-page dashboard of failures, lessons, open bets, and remaining review work.
- [`proof-path.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/proof-path.md): generated path through accepted failure chains, live bets under pressure, and candidate noise kept out of truth.
- [`tracker.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/tracker.md): lower-level audit view showing accepted verdicts against assumptions.
- [`accepted-lessons.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/accepted-lessons.md): reusable lessons extracted from accepted failures.
- [`review-queue.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/review-queue.md): the active judgment queue; it is currently clear.
- [`candidate-noise.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/candidate-noise.md): staged candidates kept out of the active queue because they are duplicate pressure on already-refuted assumptions.

## Killer Feature 1: The Filing Sentence Refutes A Prior Bet

NVIDIA is the cleanest example.

The old assumption is committed as [`asm-XtUoWXU4`](../evidence/sec-company-ledgers/sec-10y-100-company/assumptions/nvda-can-manage-inventory-and-channel-risk-without-material-583526.md):

```text
NVDA can manage inventory and channel risk without material disruption.
```

The later accepted outcome is committed as [`out-VxXuqAUS`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-VxXuqAUS.md): NVIDIA disclosed a `$4.5B` H20 excess-inventory and purchase-obligation charge after new China export-license requirements diminished demand.

The tracker then records the verdict and lesson:

```text
FAIL NVDA / Inventory and channel: asm-XtUoWXU4 via out-VxXuqAUS
Lesson: AI accelerator inventory assumptions should treat export-control shocks as channel-risk events because regulatory access can instantly impair demand and purchase commitments.
```

The novel value is not spotting "NVIDIA had a charge." The value is that an old inventory/channel assumption remains connected to a later filing outcome, a human verdict, and a reusable lesson.

## Killer Feature 2: One Event Can Cut Across Themes

AMD shows why this should not be a simple keyword dashboard.

The accepted evidence appears in [`out-BqJTAbxZ`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-BqJTAbxZ.md) and [`out-dkrWjofL`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-dkrWjofL.md): AMD recorded about `$800M` of inventory and related charges on MI308 products due to U.S. export restrictions.

The lesson is cross-theme:

```text
Export controls can turn a high-growth AI hardware bet into an inventory impairment risk; the ledger should connect geopolitics, capacity, and channel assumptions instead of reviewing them separately.
```

That is the product shape: decisions fail through mechanisms, not isolated tags. The tool preserves those mechanisms as lessons that can be reused when similar live assumptions show pressure.

## Killer Feature 3: It Separates Accepted Failures From Candidate Noise

Home Depot is a strong accepted failure. [`out-btdioMuB`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-btdioMuB.md) records stolen payment-card/customer-email data, `$161M` of pretax breach expenses, and litigation exposure.

The linked assumption [`asm-tCv4Rh7b`](../evidence/sec-company-ledgers/sec-10y-100-company/assumptions/hd-can-manage-cybersecurity-and-privacy-risk-without-materia-610165.md) is now `refuted`, and the tracker keeps the verdict:

```text
FAIL HD / Cybersecurity and privacy: asm-tCv4Rh7b via out-btdioMuB
Lesson: Cybersecurity risk becomes decision-grade when breach disclosure connects unauthorized access to quantified costs, customer data exposure, and follow-on litigation.
```

Contrast that with [`review-queue.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/review-queue.md) and [`candidate-noise.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/candidate-noise.md). The visible queue is now clear, while 31 staged candidates remain documented as duplicate pressure on assumptions that are already refuted. This matters because the system does not hide noise, but it also does not ask a human to re-adjudicate the same failed assumption.

## Killer Feature 4: The Dashboard Shows What To Review Next

The [`dashboard`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md) is the current product surface. It separates four things that are usually mixed together in notes or filing summaries:

- Accepted failures: where a human has already agreed that later evidence refuted an assumption.
- Lessons: what should change in future review.
- Open bets with pressure: assumptions that still exist but have staged evidence nearby.
- Review queue: candidate events that are not yet truth.
- Candidate noise: staged candidates intentionally kept out of active review because they are duplicate or closed-assumption pressure.

That separation is the safety rail. It lets the tool be useful without pretending that every detected sentence is a real business failure.

## More Examples Worth Reading

- Meta: access restrictions in Iran and Russia were tied to a measured decline in Family daily active people: [`out-aWE2ftCq`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-aWE2ftCq.md).
- Lowe's: Australia market exit produced a `$530M` impairment: [`out-nzwXFuEc`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-nzwXFuEc.md).
- Altria: ABI fair-value decline became a `$2.5B` other-than-temporary impairment: [`out-V13Rkdgz`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-V13Rkdgz.md).
- TJX: early extinguishment of `$2B` of debt created a `$242M` pre-tax loss: [`out-51DsRhsa`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-51DsRhsa.md).
- Booking: travel marketplace demand collapsed when the underlying activity was externally restricted: [`accepted-lessons.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/accepted-lessons.md).

## What Is Novel Today

- Persistent assumption memory: the system does not just summarize a filing; it keeps a stable bet alive across time.
- Outcome adjudication: possible failures are staged first, then accepted or rejected by a human.
- Refutation propagation: accepted outcomes change assumption state and can flag dependent ideas for review.
- Lesson capture: each accepted failure records a reusable judgment rule.
- Auditability: the committed Markdown lets a reader inspect the assumption, outcome, lesson, review queue, and report without trusting a hidden database.
- Visibility: the dashboard separates accepted truth, active judgment, suppressed noise, open bets, and lessons instead of collapsing them into one summary.

## What Is Not Novel Yet

- The SEC data source itself.
- Basic extraction of risk-factor or MD&A language.
- Simple filing search.
- Generic summarization.
- Fully automated investment conclusions.
- Proof that the lessons produce better investment returns.

The tool should not claim to pick stocks. Its current useful role is closer to an analyst memory system: it preserves what a thesis depended on, when reality contradicted it, which contradictions were accepted, and what that should change next time.

## Remaining Product Work

- Improve candidate quality so positive-result snippets and incomplete excerpts are less likely to enter staging.
- Make suppressed candidate noise more actionable: distinguish duplicate pressure, stale candidates, and true new review work.
- Add richer cross-company mechanism pages so repeated patterns are easier to compare across sectors.
- Make dependent-idea review more visible in the SEC corpus once real user-authored theses depend on these assumptions.
