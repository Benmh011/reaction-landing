// Seed knowledge base for Phase 1.
// FRS 102 sections are plain-English summaries (NOT the verbatim standard) so there is
// nothing to license at this stage. Swap in the licensed full text later, under an FRC
// permission, chunking it more finely. Firm docs are illustrative placeholders — replace
// with the firm's real templates.

export type FrsSection = {
  id: string;
  group: string;
  title: string;
  summary: string;
  flag?: boolean; // revised in 2024 edition, effective for periods beginning on/after 1 Jan 2026
};

export type FirmDoc = {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: string;
};

export const FRS_SECTIONS: FrsSection[] = [
  { id: "1", group: "Framework & presentation", title: "Scope", summary: "Who FRS 102 applies to and the public benefit entity prefix. The starting point for deciding whether an entity reports under FRS 102, Section 1A, or FRS 105." },
  { id: "1A", group: "Framework & presentation", title: "Small Entities", summary: "The reduced presentation and disclosure regime for entities that qualify as small under company law. Sets out the minimum a small company can present, plus encouraged disclosures." },
  { id: "2", group: "Framework & presentation", title: "Concepts and Pervasive Principles", summary: "The conceptual foundations: the objective of financial statements, qualitative characteristics, definitions of assets, liabilities, income and expenses, recognition and the accruals basis." },
  { id: "2A", group: "Framework & presentation", title: "Fair Value Measurement", summary: "How to measure fair value where another section requires or permits it, including the fair value hierarchy of inputs." },
  { id: "3", group: "Framework & presentation", title: "Financial Statement Presentation", summary: "Fair presentation, the requirement to comply with FRS 102, going concern assessment, comparatives and the complete set of statements." },
  { id: "4", group: "Framework & presentation", title: "Statement of Financial Position", summary: "What the balance sheet must show, current/non-current distinction and the statutory formats." },
  { id: "5", group: "Framework & presentation", title: "Comprehensive Income & Income Statement", summary: "Presentation of profit or loss and other comprehensive income; analysis of expenses by nature or function; discontinued operations." },
  { id: "6", group: "Framework & presentation", title: "Changes in Equity / Income & Retained Earnings", summary: "Statement of changes in equity, or the combined statement of income and retained earnings where permitted." },
  { id: "7", group: "Framework & presentation", title: "Statement of Cash Flows", summary: "Operating, investing and financing activities; the indirect/direct method; cash and cash equivalents. Small entities are usually exempt." },
  { id: "8", group: "Framework & presentation", title: "Notes to the Financial Statements", summary: "Structure of the notes, accounting policies, judgements and sources of estimation uncertainty." },
  { id: "9", group: "Groups & investments", title: "Consolidated & Separate Financial Statements", summary: "When consolidation is required, exemptions (including small groups), the mechanics of consolidation and accounting in separate (individual) statements." },
  { id: "10", group: "Framework & presentation", title: "Accounting Policies, Estimates & Errors", summary: "Selecting and changing accounting policies, applying changes retrospectively, distinguishing estimates from policies, and correcting prior period errors." },
  { id: "11", group: "Financial instruments", title: "Basic Financial Instruments", summary: "Recognition and measurement of basic instruments — trade debtors/creditors, loans and simple investments — usually at amortised cost. Conditions for what counts as 'basic'." },
  { id: "12", group: "Financial instruments", title: "Other Financial Instruments Issues", summary: "More complex instruments measured at fair value through profit or loss, plus the optional hedge accounting model." },
  { id: "13", group: "Assets", title: "Inventories", summary: "Measuring stock at the lower of cost and estimated selling price less costs to complete and sell; cost formulas (FIFO/weighted average); write-downs." },
  { id: "14", group: "Groups & investments", title: "Investments in Associates", summary: "Significant influence and the equity method (or cost/fair value in individual accounts)." },
  { id: "15", group: "Groups & investments", title: "Investments in Joint Ventures", summary: "Jointly controlled entities, operations and assets, and how each is accounted for." },
  { id: "16", group: "Assets", title: "Investment Property", summary: "Property held to earn rentals or for capital appreciation; measured at fair value through profit or loss where it can be measured reliably without undue cost or effort." },
  { id: "17", group: "Assets", title: "Property, Plant and Equipment", summary: "Recognition and measurement of tangible fixed assets; cost vs revaluation model; depreciation over useful life; componentisation; derecognition." },
  { id: "18", group: "Assets", title: "Intangible Assets other than Goodwill", summary: "Recognition criteria for intangibles, capitalising development costs, and amortisation over a finite useful life (a default cap applies where life cannot be estimated reliably)." },
  { id: "19", group: "Groups & investments", title: "Business Combinations and Goodwill", summary: "The purchase method, identifying the acquirer, measuring consideration and net assets, and recognising and amortising goodwill over its useful life." },
  { id: "20", group: "Liabilities", title: "Leases", summary: "Revised in the 2024 edition: lessees bring most leases onto the balance sheet as a right-of-use asset and lease liability (aligned with IFRS 16), with limited exemptions for short-term and low-value leases. Lessor accounting retains the finance/operating split.", flag: true },
  { id: "21", group: "Liabilities", title: "Provisions and Contingencies", summary: "Recognising a provision only where there is a present obligation, probable outflow and a reliable estimate; contingent liabilities and assets; onerous contracts." },
  { id: "22", group: "Liabilities", title: "Liabilities and Equity", summary: "Classifying instruments as liability or equity, accounting for compound instruments (e.g. convertible debt), and treasury shares." },
  { id: "23", group: "Income", title: "Revenue from Contracts with Customers", summary: "Revised in the 2024 edition: a five-step model (identify the contract, the performance obligations, the transaction price, allocate it, recognise as obligations are satisfied), aligned with IFRS 15.", flag: true },
  { id: "24", group: "Income", title: "Government Grants", summary: "The performance and accrual models for recognising grants in income." },
  { id: "25", group: "Liabilities", title: "Borrowing Costs", summary: "Either expense all borrowing costs or, as a policy choice, capitalise those directly attributable to qualifying assets." },
  { id: "26", group: "Other topics", title: "Share-based Payment", summary: "Equity- and cash-settled share-based payments, including measurement and the spreading of the charge over the vesting period." },
  { id: "27", group: "Assets", title: "Impairment of Assets", summary: "Testing assets and goodwill for impairment, recoverable amount (higher of value in use and fair value less costs to sell), cash-generating units and reversals." },
  { id: "28", group: "Liabilities", title: "Employee Benefits", summary: "Short-term benefits including holiday pay accruals, and defined contribution vs defined benefit pension accounting." },
  { id: "29", group: "Liabilities", title: "Income Tax", summary: "Current and deferred tax, the timing-difference-plus approach, and the recognition of deferred tax assets." },
  { id: "30", group: "Other topics", title: "Foreign Currency Translation", summary: "Functional vs presentation currency, translating transactions and balances, and translating a foreign operation." },
  { id: "31", group: "Other topics", title: "Hyperinflation", summary: "Restating the financial statements of an entity whose functional currency is hyperinflationary." },
  { id: "32", group: "Other topics", title: "Events after the End of the Reporting Period", summary: "Adjusting vs non-adjusting events between the period end and the date the accounts are authorised for issue." },
  { id: "33", group: "Other topics", title: "Related Party Disclosures", summary: "Identifying related parties and the transactions and balances that must be disclosed, including key management personnel." },
  { id: "34", group: "Other topics", title: "Specialised Activities", summary: "Tailored requirements for agriculture, extractive activities, service concessions, financial institutions, retirement benefit plans, heritage assets and public benefit entities." },
  { id: "35", group: "Framework & presentation", title: "Transition to this FRS", summary: "First-time adoption: the date of transition, the opening statement of financial position and the available exemptions." },
];

export const FIRM_DOCS: FirmDoc[] = [
  {
    id: "wp-structure",
    category: "Working papers",
    title: "Working paper file structure & lead schedules",
    summary: "How we index and reference a file, and what each lead schedule should contain.",
    body: "Our file is indexed by section letters that follow the balance sheet, then P&L: A — completion and review notes; B — tangible fixed assets (PPE); C — intangibles and goodwill; D — investments; E — stock and WIP; F — debtors and prepayments; G — cash and bank; H — creditors, accruals and provisions; J — taxation (current and deferred); K — share capital and reserves; P — profit and loss / revenue. Each lead schedule shows opening balance, movement, closing balance, the agreed figure to the trial balance, a reference to the supporting work, and initials/date of preparer and reviewer. Every figure must be cross-referenced to its support. Unresolved points go to the A-section review notes for the manager.",
  },
  {
    id: "wp-ppe",
    category: "Working papers",
    title: "Fixed-asset lead schedule (B-section)",
    summary: "What to put on the PPE lead schedule and the tests behind it.",
    body: "The B lead schedule reconciles the fixed asset register to the nominal ledger and shows, by category: cost b/f, additions, disposals, cost c/f, depreciation b/f, charge, eliminated on disposal, depreciation c/f, and net book value. Supporting work: agree additions to invoices and check the capitalisation policy is met; confirm depreciation rates and useful lives are reasonable and consistently applied (FRS 102 §17); recalculate the charge; confirm disposals are removed and the profit/loss on disposal is correct; and consider any indicators of impairment (FRS 102 §27). Confirm whether the revaluation or cost model is used.",
  },
  {
    id: "wp-disclosure",
    category: "Working papers",
    title: "Accounts disclosure checklist (FRS 102 1A)",
    summary: "The small-company disclosure checklist we run before a file goes to manager review.",
    body: "Run the disclosure checklist appropriate to the entity's regime (full FRS 102, Section 1A small, or FRS 105 micro). For a small company under Section 1A, confirm the required minimum disclosures are present and consider the encouraged ones needed for a true and fair view (accounting policies, related party transactions, dividends, average employee numbers, off-balance-sheet arrangements). Tick each item to its location in the draft accounts, and note any deliberately omitted as not applicable. The completed checklist is filed at A and signed off by the reviewer.",
  },
  {
    id: "aml-takeon",
    category: "AML & compliance",
    title: "Client take-on AML / KYC checklist",
    summary: "Customer due diligence steps to complete before we start any work.",
    body: "Customer due diligence must be completed and approved before work begins: 1) identify the client and verify identity using reliable, independent evidence (photo ID plus proof of address; for companies, incorporation details and the register); 2) identify and verify beneficial owners holding more than 25% and understand the ownership/control structure; 3) understand the purpose and intended nature of the engagement; 4) screen the client, directors and beneficial owners for sanctions and PEP status; 5) complete a written client risk assessment (low / standard / high) — high risk requires enhanced due diligence and partner approval; 6) obtain professional clearance from the outgoing accountant where applicable; 7) record the conclusion, evidence and approver on the take-on form. CDD is refreshed periodically and on trigger events. If you cannot complete CDD, do not proceed — escalate to your manager and the MLRO.",
  },
  {
    id: "aml-sar",
    category: "AML & compliance",
    title: "Reporting a concern to the MLRO (internal SAR)",
    summary: "What to do if something doesn't add up — escalation, not investigation.",
    body: "If you know, suspect, or have reasonable grounds to suspect money laundering, make an internal report to the firm's Money Laundering Reporting Officer (MLRO) as soon as practicable. Do not investigate it yourself and do not confront the client. Do not tell the client or anyone outside the reporting line that a report has been or may be made — that risks the criminal offence of tipping off. Submit the internal report through the firm's reporting form with the facts and your grounds for suspicion. The MLRO decides whether to make an external report (a SAR) to the NCA and whether consent (a DAML) is needed before acting. When in doubt, report it.",
  },
  {
    id: "comp-ethics",
    category: "AML & compliance",
    title: "Ethics & independence basics",
    summary: "The five fundamental principles and spotting threats early.",
    body: "We follow the professional code's five fundamental principles: integrity, objectivity, professional competence and due care, confidentiality, and professional behaviour. Be alert to threats — self-interest, self-review, advocacy, familiarity and intimidation — and raise anything that might compromise objectivity (for example, a personal relationship with the client, or preparing figures you would then audit). Independence is especially critical on audit work. If you spot a possible threat, discuss it with your manager so a safeguard can be applied or the matter declined.",
  },
  {
    id: "onb-setup",
    category: "Client set-up",
    title: "New client set-up procedure",
    summary: "The administrative steps once take-on is approved.",
    body: "Once AML take-on is approved and the engagement letter is signed: 1) create the client record on the practice system with the correct entity type, year end, and responsible partner/manager; 2) set the statutory deadlines (accounts filing, confirmation statement, corporation tax, VAT, payroll) and add them to the deadline monitor; 3) obtain authorisation as agent with HMRC and Companies House where relevant; 4) set up the secure document area and add the engagement to time/billing; 5) confirm the client's preferred contact and how records will be exchanged (always via the secure portal — no client data by ordinary email); 6) schedule the opening meeting / records request. Check each item against the new-client checklist before the file is opened for work.",
  },
  {
    id: "onb-engagement",
    category: "Client set-up",
    title: "Engagement letter & scope",
    summary: "Getting the terms agreed and the scope clear before work starts.",
    body: "No chargeable work starts until a current engagement letter is signed. The letter sets out the scope of the work (e.g. accounts preparation, audit, tax, payroll), the respective responsibilities of the client and the firm, fees and basis of billing, limitation of liability, and our standard terms of business. If the scope changes materially, issue a revised or supplementary letter. For audit engagements the scope and independence considerations are more extensive — flag these to your manager. File the signed letter at the front of the permanent file.",
  },
];
