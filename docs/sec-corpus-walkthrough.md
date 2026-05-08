# SEC Corpus Walkthrough

This is the shortest path through the checked-in SEC proof corpus. It is written for a skeptical reader asking: "Is this more than filing search plus summaries?"

The honest answer: partly, and now visibly. The SEC data is not novel. Finding a sentence in a filing is not novel. The useful part is the lifecycle the tool preserves around that sentence:

```text
old assumption -> dated evidence -> staged failure -> human verdict -> refuted assumption -> lesson -> remaining bets to review
```

Start at [`Company Sector Run`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/index.md).

## Current Corpus State

- `1,468` SEC filings scanned.
- `361` current company/theme bets still open.
- `486` shadow LLM evaluations preserved as audit evidence.
- `55` accepted failures after human adjudication.
- `55` lesson memos.
- `253` rejected candidate outcomes.
- `24` remaining human review events.

The corpus is committed as Markdown only. SQLite, SEC caches, JSON, JSONL, WAL/SHM, and raw operational state are intentionally excluded.

## What To Inspect First

- [`thesis.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/thesis.md): executive view of open bets, accepted failures, and what still needs review.
- [`dashboard.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/dashboard.md): one-page dashboard of failures, lessons, open bets, and remaining review work.
- [`tracker.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/tracker.md): lower-level audit view showing accepted verdicts against assumptions.
- [`accepted-lessons.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/accepted-lessons.md): reusable lessons extracted from accepted failures.
- [`review-queue.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/review-queue.md): remaining work that has not been accepted as truth.

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

The novel value is not spotting "NVIDIA had a charge." The value is that a 2016-era inventory/channel assumption remains connected to a 2026 filing outcome, a human verdict, and a reusable lesson.

## Killer Feature 2: One Event Can Cut Across Themes

AMD shows why this should not be a simple keyword dashboard.

The accepted evidence appears in [`out-BqJTAbxZ`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-BqJTAbxZ.md) and [`out-dkrWjofL`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-dkrWjofL.md): AMD recorded about `$800M` of inventory and related charges on MI308 products due to U.S. export restrictions.

The lesson is cross-theme:

```text
Export controls can turn a high-growth AI hardware bet into an inventory impairment risk; the ledger should connect geopolitics, capacity, and channel assumptions instead of reviewing them separately.
```

That is the product shape: decisions fail through mechanisms, not isolated tags. The tool is starting to preserve those mechanisms as lessons.

## Killer Feature 3: It Separates Accepted Failures From Candidate Noise

Home Depot is a strong accepted failure. [`out-btdioMuB`](../evidence/sec-company-ledgers/sec-10y-100-company/outcomes/filing-language-states-this-risk-had-an-actual-effect-on-ope-btdioMuB.md) records stolen payment-card/customer-email data, `$161M` of pretax breach expenses, and litigation exposure.

The linked assumption [`asm-tCv4Rh7b`](../evidence/sec-company-ledgers/sec-10y-100-company/assumptions/hd-can-manage-cybersecurity-and-privacy-risk-without-materia-610165.md) is now `refuted`, and the tracker keeps the verdict:

```text
FAIL HD / Cybersecurity and privacy: asm-tCv4Rh7b via out-btdioMuB
Lesson: Cybersecurity risk becomes decision-grade when breach disclosure connects unauthorized access to quantified costs, customer data exposure, and follow-on litigation.
```

Contrast that with [`review-queue.md`](../evidence/sec-company-ledgers/sec-10y-100-company/reports/company-runs/sec-10y-100-company/review-queue.md). The remaining events are not claimed as truth. They remain review work. This matters because the system previously surfaced duplicate and weak positive signals; the current queue is now explicitly a human judgment surface, not an automated verdict engine.

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

## What Is Not Novel Yet

- The SEC data source itself.
- Basic extraction of risk-factor or MD&A language.
- Simple filing search.
- Generic summarization.
- Fully automated investment conclusions.

The tool should not claim to pick stocks. Its current useful role is closer to an analyst memory system: it preserves what a thesis depended on, when reality contradicted it, which contradictions were accepted, and what that should change next time.

## Remaining Product Work

- Improve candidate quality so positive-result snippets and incomplete excerpts are less likely to enter the queue.
- Build a sharper thesis dashboard over accepted failures, open bets, lessons, and remaining review events.
- Add richer cross-company mechanism pages so repeated patterns are easier to compare across sectors.
- Make dependent-idea review more visible in the SEC corpus once real user-authored theses depend on these assumptions.
