"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SITES = [
  { value: "KINGSBRIDGE", label: "Kingsbridge" },
  { value: "DARTINGTON", label: "Dartington" },
  { value: "IVYBRIDGE", label: "Ivybridge" },
];

const TOOL_LABELS: Record<string, string> = {
  search_clinical: "clinical",
  search_medications: "medications",
  search_legislation: "legislation",
  search_practice_records: "practice records",
};

const STATUS_LABELS: Record<string, string> = {
  search_clinical: "Searching clinical notes…",
  search_medications: "Searching the medicines database…",
  search_legislation: "Searching the regulations…",
  search_practice_records: "Searching practice records…",
  fetch_spc: "Reading the product SPC…",
};

type Appt = {
  time: string;
  owner: string;
  animal: string;
  species: string;
  reason: string;
  firstDiagnosed: string;
  lastAppointment: string;
  currentMeds: string;
  history: string[];
  flags: string[];
  // handover layer (populated for cover cases) — what lives in the absent vet's head
  plan?: string;
  outstanding?: string[];
  watch?: string;
  handling?: string;
};

// The signed-in vet's own day (simulated; stands in for the live diary/files).
const DEMO_DAY: Appt[] = [
  {
    time: "08:30",
    owner: "Brookfield Farm",
    animal: "Dairy herd — block calving",
    species: "Cattle",
    reason: "Herd visit; 2 fresh cows with suspected environmental mastitis",
    firstDiagnosed: "21 May 2026 — bulk-milk SCC flagged as rising on routine recording",
    lastAppointment: "7 May 2026 — fertility visit; SCC noted creeping up, no individual treatment",
    currentMeds: "No herd treatment in progress; cows 4471 & 4490 untreated pending today",
    history: [
      "~180 Holstein-Friesians, autumn block.",
      "Flagged: tag 4471 (LH quarter, clots) and 4490 (acute, off feed, 40.2°C).",
      "Bulk-milk SCC trending up over 3 weeks.",
      "All milk currently going in the tank.",
    ],
    flags: ["Food-producing — withdrawals apply"],
  },
  {
    time: "09:30",
    owner: "J. Aldridge",
    animal: "“Bryn” — Border Collie, MN, 7y",
    species: "Canine",
    reason: "Lameness recheck",
    firstDiagnosed: "12 Mar 2025 — left-hind osteoarthritis, confirmed on radiographs",
    lastAppointment: "1 May 2026 — comfortable on NSAID; mobility improved; renal/hepatic bloods normal",
    currentMeds: "Meloxicam oral suspension, once daily with food (on it 6 weeks)",
    history: [
      "Stiffness improved but slows on long walks.",
      "Weight on the higher side; weight-management discussed.",
      "No GI signs reported on current NSAID.",
    ],
    flags: [],
  },
  {
    time: "10:15",
    owner: "M. Holloway",
    animal: "“Maple” — DSH cat, FN, 13y",
    species: "Feline",
    reason: "Hyperthyroid recheck",
    firstDiagnosed: "14 Apr 2026 — hyperthyroidism (elevated total T4)",
    lastAppointment: "14 Apr 2026 — started thiamazole 2.5 mg BID; no azotaemia at baseline",
    currentMeds: "Thiamazole 2.5 mg, twice daily",
    history: [
      "Weight stable since starting treatment; appetite normal.",
      "Recheck T4 + renal values due today.",
      "Owner finding twice-daily tablets manageable.",
    ],
    flags: ["T4 + renal recheck outstanding"],
  },
  {
    time: "11:00",
    owner: "Hillcrest Farm",
    animal: "Weaned calves — group of 24",
    species: "Cattle",
    reason: "Respiratory outbreak (BRD)",
    firstDiagnosed: "Today — first presentation of respiratory signs in this group",
    lastAppointment: "Group bought in & housed 31 May 2026; no prior vet visit",
    currentMeds: "None",
    history: [
      "6/24 coughing; two pyrexic (40.5°C), tachypnoeic.",
      "Housed and mixed from two sources 10 days ago.",
      "Bought-in group — no vaccination history.",
    ],
    flags: ["Food-producing — withdrawals apply", "Antimicrobial stewardship applies"],
  },
  {
    time: "14:00",
    owner: "S. Pickering",
    animal: "“Tarka” — Connemara gelding, 11y",
    species: "Equine",
    reason: "Sarcoid assessment",
    firstDiagnosed: "3 Feb 2026 — two girth sarcoids (fibroblastic), clinical diagnosis",
    lastAppointment: "3 Feb 2026 — monitoring advised; owner now reports slow enlargement",
    currentMeds: "None",
    history: [
      "Two fibroblastic sarcoids at the girth, slowly enlarging.",
      "Not in a competition yard.",
      "Owner asking about treatment options.",
    ],
    flags: ["Equine — check medicines record / passport"],
  },
  {
    time: "15:30",
    owner: "Greenacre Farm",
    animal: "Ewe flock — pre-lambing",
    species: "Ovine",
    reason: "Flock health: clostridial/pasteurella cover & colostrum plan",
    firstDiagnosed: "Flock plan review — watery-mouth lambs an issue last season (spring 2025)",
    lastAppointment: "Autumn 2025 — scanning visit; body condition variable across the flock",
    currentMeds: "None current; reviewing clostridial booster timing",
    history: [
      "~300 ewes; lambing in 4 weeks.",
      "Several watery-mouth lambs last season.",
      "Reviewing booster timing, nutrition and colostrum plan.",
    ],
    flags: ["Food-producing — withdrawals apply"],
  },
];

type CoverMeta = { vet: string; reason: string; since: string };
const COVER_META: CoverMeta = {
  vet: "Dr. Helen Cartwright",
  reason: "an emergency calving out at Longfield Farm",
  since: "11:40",
};

// The colleague's remaining list — full handover layer included.
const COVER_CASES: Appt[] = [
  {
    time: "13:30",
    owner: "L. Marsden",
    animal: "“Pip” — Cocker Spaniel, FN, 2y",
    species: "Canine",
    reason: "Post-op recheck (spay 3 days ago) + lump histology pending",
    firstDiagnosed: "5 Jun 2026 — routine spay; small skin lump excised at the same time",
    lastAppointment: "5 Jun 2026 — uncomplicated surgery; recovered well, sent home same day",
    currentMeds: "Meloxicam, finished; no antibiotics dispensed",
    history: [
      "First-time owner, anxious about recovery.",
      "Buster collar on; owner reports licking at incision.",
      "Eating and toileting normally.",
    ],
    flags: [],
    plan: "Planned to check the incision and, if healing well, remove the buster collar.",
    outstanding: ["Excised-lump histology sent — result expected tomorrow; owner to be called with it"],
    watch: "Reported licking at the incision; risk of seroma or wound breakdown.",
    handling: "First-time owner; recorded as anxious about recovery at the discharge visit.",
  },
  {
    time: "14:15",
    owner: "R. Ashworth",
    animal: "“Hengist” — Warmblood gelding, 9y",
    species: "Equine",
    reason: "Colic follow-up (mild spasmodic colic yesterday)",
    firstDiagnosed: "9 Jun 2026 — mild spasmodic colic; responded to treatment on the yard",
    lastAppointment: "9 Jun 2026 — treated, settled within the hour; gut sounds returning when Dr. Cartwright left",
    currentMeds: "Flunixin given yesterday (single dose); hyoscine (Buscopan) on the day",
    history: [
      "No prior colic episodes recorded.",
      "On box rest overnight; passed droppings this morning per owner.",
      "Owner keen to know about turnout.",
    ],
    flags: ["Equine — check passport / medicines record"],
    plan: "Planned to recheck gut sounds and pain and, if comfortable and eating, reintroduce forage and review turnout.",
    outstanding: ["Owner expects a call this afternoon about turnout timing"],
    watch: "First recorded colic episode; passed droppings this morning, on box rest overnight.",
    handling: "Settled and quiet to handle; on box rest overnight.",
  },
  {
    time: "15:00",
    owner: "Meadowside Smallholding",
    animal: "Weaner pigs — group of 8",
    species: "Porcine",
    reason: "Lameness in 2 pigs; query erysipelas",
    firstDiagnosed: "9 Jun 2026 — 2 pigs acutely lame, one with raised skin lesions; erysipelas suspected",
    lastAppointment: "9 Jun 2026 — 2 affected pigs started on penicillin; group review planned",
    currentMeds: "2 affected pigs on procaine penicillin (started yesterday)",
    history: [
      "8 weaners, recently bought in.",
      "Two lame; one with characteristic diamond skin lesions.",
      "Smallholder, not assured — no vaccination programme.",
    ],
    flags: ["Food-producing — withdrawals apply", "Stewardship — penicillin first-line, appropriate"],
    plan: "Planned to review the whole group, check the response in the 2 treated pigs, and raise erysipelas vaccination.",
    outstanding: ["No samples taken yet; withdrawal-period information for the smallholder still outstanding"],
    watch: "Two of the eight affected so far; the rest of the group not yet showing signs.",
    handling: "Smallholder not assured; bought-in group with no vaccination history.",
  },
];

type Task = { id: string; text: string; patient?: string; urgent?: boolean; done: boolean };
const SEED_TASKS: Task[] = [
  { id: "t1", text: "Chase Maple's T4 + renal result (10:15)", done: false },
  { id: "t2", text: "Call J. Aldridge — outcome of Bryn's NSAID review", done: false },
  { id: "t3", text: "Notify Brookfield Farm when milk withdrawal ends", done: false },
  { id: "t4", text: "Tarka — arrange sarcoid treatment-options discussion", done: false },
];
const COVER_TASKS: Task[] = [
  { id: "cov-pip", text: "Pip (covering Dr. Cartwright) — call owner with histology tomorrow", done: false },
  { id: "cov-hengist", text: "Hengist (covering Dr. Cartwright) — owner expects a turnout call this afternoon", urgent: true, done: false },
];

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  kind?: "briefing" | "casefile" | "handover";
  day?: Appt[];
  appt?: Appt;
  cover?: { meta: CoverMeta; cases: Appt[] };
  streaming?: boolean;
  status?: string;
  logId?: string | null;
};

// Short label for the now/next marker (e.g. "Tarka", "Dairy herd").
function shortAnimal(a: string): string {
  return a.split(" — ")[0].replace(/[\u201c\u201d"]/g, "").trim();
}

// Descriptor after the em dash, e.g. "Border Collie, MN, 7y" or "group of 24".
function caseDescriptor(a: string): string {
  const parts = a.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : "";
}

// Case-specific, self-contained prompts the agent can answer from the grounded KB.
function casePrompts(a: Appt): { label: string; query: string }[] {
  const plural: Record<string, string> = { Cattle: "cattle", Canine: "dogs", Feline: "cats", Equine: "horses", Ovine: "sheep" };
  const sp = plural[a.species] ?? a.species.toLowerCase();
  const out: { label: string; query: string }[] = [];
  out.push({ label: "Treatment options", query: `What are the recognised treatment and management options for ${a.reason} in ${sp}? Note any licensed products and the cascade where relevant.` });
  if (a.flags.some((f) => /food-producing|withdrawal/i.test(f))) {
    out.push({ label: "Withdrawals & records", query: `What withdrawal periods and record-keeping requirements apply if I treat this case — ${a.reason} in ${sp}?` });
  }
  if (a.flags.some((f) => /stewardship|antimicrobial/i.test(f))) {
    out.push({ label: "Responsible antimicrobial use", query: `What does responsible-use guidance say about first-line antimicrobial choice for ${a.reason} in ${sp}?` });
  }
  out.push({ label: "Owner-friendly summary", query: `Give a plain-English summary of the options for the owner of this case — ${a.reason} in ${sp}.` });
  return out.slice(0, 4);
}

// Render markdown links the agent emits as sleek inline source icons.
function SourceLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  const label = typeof children === "string" ? children : "source";
  if (!href) return <span>{children}</span>;
  return (
    <a className="sm-cite" href={href} target="_blank" rel="noopener noreferrer" title={`Source: ${label}`} aria-label={`Open source: ${label}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

function RatingBar({ logId }: { logId?: string | null }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  if (!logId) return null;
  if (done) return <div className="sm-rate-done">Thanks — feedback recorded.</div>;

  async function submit(s: number, c?: string) {
    try {
      await fetch("/api/vet/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, rating: s, comment: c ?? null }),
      });
    } catch {
      /* best-effort */
    }
    setDone(true);
  }

  return (
    <div className="sm-rate">
      <span className="sm-rate-label">How useful was this answer?</span>
      <div className="sm-rate-scale">
        {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
          <button
            key={n}
            className={"sm-rate-num" + (score === n ? " on" : "")}
            onClick={() => {
              setScore(n);
              if (n === 10) submit(10);
            }}
            aria-label={`Rate ${n} out of 10`}
          >
            {n}
          </button>
        ))}
      </div>
      {score !== null && score < 10 && (
        <div className="sm-rate-fb">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What would have made it a 10?" rows={2} />
          <button className="sm-rate-submit" onClick={() => submit(score, comment)}>Send feedback</button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [site, setSite] = useState("KINGSBRIDGE");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [newTask, setNewTask] = useState("");
  const [covering, setCovering] = useState<CoverMeta | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function grow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  function closeOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 901) setSidebarOpen(false);
  }

  async function ask(query?: string, display?: string) {
    const q = (query ?? question).trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", content: display ?? q }]);
    if (query === undefined) {
      setQuestion("");
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.style.height = "auto";
      });
    }
    setError("");
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", content: "", tools: [], streaming: true, status: "" }]);

    const update = (patch: Partial<Msg>) =>
      setMessages((m) => {
        const copy = m.slice();
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "assistant" && copy[i].streaming) {
            copy[i] = { ...copy[i], ...patch };
            break;
          }
        }
        return copy;
      });

    try {
      const res = await fetch("/api/vet/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, site }),
      });
      if (!res.ok || !res.body) throw new Error("stream-unavailable");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      let tools: string[] = [];
      let logId: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          let ev: any;
          try {
            ev = JSON.parse(t);
          } catch {
            continue;
          }
          if (ev.type === "delta") {
            acc += ev.text;
            update({ content: acc, status: "" });
          } else if (ev.type === "reset") {
            acc = "";
            update({ content: "" });
          } else if (ev.type === "status") {
            update({ status: STATUS_LABELS[ev.tool] ?? "Working…" });
          } else if (ev.type === "done") {
            tools = (ev.toolCalls ?? []).map((tc: { name: string }) => tc.name);
            logId = ev.logId ?? null;
          } else if (ev.type === "error") {
            throw new Error(ev.message || "Something went wrong.");
          }
        }
      }
      update({ content: acc, tools: [...new Set(tools)], streaming: false, status: "", logId });
    } catch (e) {
      try {
        const res = await fetch("/api/vet/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, site }),
        });
        if (!res.ok) throw new Error(`The request failed (status ${res.status}).`);
        const data = await res.json();
        update({
          content: data.answer ?? "",
          tools: [...new Set((data.toolCalls ?? []).map((tc: { name: string }) => tc.name))] as string[],
          streaming: false,
          status: "",
          logId: data.logId ?? null,
        });
      } catch (e2) {
        setMessages((m) => m.filter((x) => !(x.role === "assistant" && x.streaming)));
        setError(e2 instanceof Error ? e2.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  function simulateDay() {
    if (loading) return;
    const label = SITES.find((s) => s.value === site)?.label ?? "the practice";
    setError("");
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        kind: "briefing",
        day: DEMO_DAY,
        content:
          `Good morning. Here's your day at ${label} — ${DEMO_DAY.length} appointments across the mixed caseload. ` +
          `Below is each patient with the notes that matter; open any case to work it through with me.`,
      },
    ]);
    closeOnMobile();
  }

  function openCase(a: Appt) {
    setError("");
    setActiveId(a.time + a.animal);
    setMessages((m) => [...m, { role: "assistant", kind: "casefile", appt: a, content: "" }]);
    closeOnMobile();
  }

  function coverColleague() {
    if (covering) return;
    setCovering(COVER_META);
    setTasks((t) => [...COVER_TASKS.filter((c) => !t.some((x) => x.id === c.id)), ...t]);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        kind: "handover",
        cover: { meta: COVER_META, cases: COVER_CASES },
        content:
          `You're now covering for ${COVER_META.vet}, who was called to ${COVER_META.reason} at ${COVER_META.since}. ` +
          `Here's the handover on the ${COVER_CASES.length} cases left on their list — the situation, the background, where each one is up to, and what's still outstanding. Open any file or ask me anything about them.`,
      },
    ]);
    closeOnMobile();
  }

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    setTasks((t) => [...t, { id: "u" + Date.now(), text, done: false }]);
    setNewTask("");
  }
  function toggleTask(id: string) {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  const empty = messages.length === 0 && !loading && !error;

  const timeStr = now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  const dateStr = now ? now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const schedule = (covering ? [...DEMO_DAY, ...COVER_CASES] : DEMO_DAY)
    .slice()
    .sort((a, b) => toMin(a.time) - toMin(b.time));
  let current: Appt | null = null;
  let nextUp: Appt | null = null;
  if (nowMin != null) {
    for (const a of schedule) {
      if (toMin(a.time) <= nowMin) current = a;
      else { nextUp = a; break; }
    }
    if (current && nowMin - toMin(current.time) > 90) current = null;
  }
  const upcoming = nextUp ?? (!current && schedule.length ? schedule[0] : null);
  const marker = current
    ? { label: "Now", appt: current, rel: null as number | null }
    : upcoming
      ? { label: "Up next", appt: upcoming, rel: nowMin != null ? toMin(upcoming.time) - nowMin : null }
      : null;

  const activeCase = activeId
    ? [...DEMO_DAY, ...COVER_CASES].find((a) => a.time + a.animal === activeId) ?? null
    : null;

  const caseTasks = activeCase
    ? tasks.filter((t) => !t.done && (t.text.includes(shortAnimal(activeCase.animal)) || t.text.includes(activeCase.owner)))
    : [];

  const diaryItem = (a: Appt) => (
    <button
      key={a.time + a.animal}
      className={"sm-diary-item" + (activeId === a.time + a.animal ? " active" : "")}
      onClick={() => openCase(a)}
    >
      <div className="sm-diary-top">
        <span className="sm-diary-time">{a.time}</span>
        <span className="sm-diary-species">{a.species}</span>
      </div>
      <div className="sm-diary-animal">{a.animal}</div>
      <div className="sm-diary-reason">{a.reason}</div>
    </button>
  );

  return (
    <div className={"sm-shell" + (sidebarOpen ? "" : " closed")} data-site={site}>
      <aside className="sm-sidebar">
        <div className="sm-side-head">
          <span className="sm-side-title">Daily workflow</span>
          <button className="sm-side-close" onClick={() => setSidebarOpen(false)} aria-label="Close panel">×</button>
        </div>
        <div className="sm-side-body">
          <div className="sm-side-actions">
            <button className="sm-side-btn" onClick={simulateDay}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              Simulate working day
            </button>
            {covering ? (
              <button className="sm-side-btn secondary" onClick={() => setCovering(null)}>Stop covering</button>
            ) : (
              <button className="sm-side-btn secondary" onClick={coverColleague}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Cover a colleague
              </button>
            )}
          </div>

          {covering && (
            <div className="sm-cover-banner">
              Covering <strong>{covering.vet}</strong> — called to {covering.reason} at {covering.since}.
            </div>
          )}

          <div className="sm-side-section-title">Today · {SITES.find((s) => s.value === site)?.label}</div>
          <div className="sm-diary">{DEMO_DAY.map(diaryItem)}</div>

          {covering && (
            <>
              <div className="sm-side-section-title">Covering · {covering.vet}</div>
              <div className="sm-diary">{COVER_CASES.map(diaryItem)}</div>
            </>
          )}

          <div className="sm-side-section-title">Follow-ups</div>
          <div className="sm-tasks">
            {tasks.map((t) => (
              <div key={t.id} className={"sm-task" + (t.done ? " done" : "")}>
                <button className="sm-task-check" onClick={() => toggleTask(t.id)} aria-label={t.done ? "Mark not done" : "Mark done"}>
                  {t.done && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </button>
                <span className="sm-task-text">
                  {t.text}
                  {t.urgent && !t.done && <span className="sm-task-urgent">urgent</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="sm-task-add">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              placeholder="Add a follow-up…"
            />
            <button onClick={addTask} aria-label="Add follow-up">+</button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sm-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="sm">
        <header className="sm-top">
          <div className="sm-top-left">
            <button className="sm-menu" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle workflow panel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <div className="sm-brand">
              <svg className="sm-leaf" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 2v2" />
                <path d="M5 2v2" />
                <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                <path d="M8 15a6 6 0 0 0 12 0v-3" />
                <circle cx="20" cy="10" r="2" />
              </svg>
              Clinic Assistant
            </div>
          </div>
          <div className="sm-headcenter">
            <div className="sm-clock" aria-hidden={!now}>
              <span className="sm-clock-time">{timeStr}</span>
              <span className="sm-clock-date">{dateStr}</span>
            </div>
            {marker && (
              <button className="sm-now" onClick={() => openCase(marker.appt)} aria-label={`Open ${marker.appt.animal}`}>
                <span className={"sm-now-dot" + (marker.label === "Now" ? " live" : "")} />
                <span className="sm-now-label">{marker.label === "Now" ? "In now" : "Up next"}</span>
                <span className="sm-now-text">{shortAnimal(marker.appt.animal)}</span>
                <span className="sm-now-when">
                  {marker.label === "Now"
                    ? `since ${marker.appt.time}`
                    : marker.rel != null && marker.rel > 0 && marker.rel <= 180
                      ? `in ${marker.rel} min`
                      : `at ${marker.appt.time}`}
                </span>
                <svg className="sm-now-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
          </div>
          <div className="sm-top-right">
            <button className="sm-simulate-mini" onClick={simulateDay}>Simulate day</button>
            <select className="sm-site" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Practice site">
              {SITES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className="sm-logout" onClick={async () => { await fetch("/api/vet/logout", { method: "POST" }); window.location.href = "/demo"; }}>
              Log out
            </button>
          </div>
        </header>

        <main className="sm-main">
          <div className="sm-col">
            {empty && (
              <div className="sm-empty">
                <h1 className="sm-hello">How can I help today?</h1>
                <p className="sm-hello-sub">Ask about symptoms, a medicine, the regulations, or a client&rsquo;s records.</p>
                <button className="sm-simulate" onClick={simulateDay}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  Simulate working day
                </button>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="sm-user">
                  <div className="sm-user-bubble">{m.content}</div>
                </div>
              ) : m.kind === "briefing" ? (
                <div key={i} className="sm-assistant">
                  <div className="sm-md"><p>{m.content}</p></div>
                  <div className="sm-daynote">Simulated diary &amp; client notes — demo data</div>
                  <div className="sm-day">
                    {m.day!.map((a) => (
                      <div className="sm-appt" key={a.time}>
                        <div className="sm-appt-head">
                          <span className="sm-appt-time">{a.time}</span>
                          <span className="sm-appt-species">{a.species}</span>
                        </div>
                        <div className="sm-appt-animal">{a.animal}</div>
                        <div className="sm-appt-owner">{a.owner}</div>
                        <div className="sm-appt-reason">{a.reason}</div>
                        <ul className="sm-appt-notes">{a.history.map((n, j) => <li key={j}>{n}</li>)}</ul>
                        {a.flags.length > 0 && (
                          <div className="sm-appt-flags">{a.flags.map((f) => <span key={f} className="sm-flag">{f}</span>)}</div>
                        )}
                        <button className="sm-appt-btn" onClick={() => openCase(a)} disabled={loading}>Open case file →</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : m.kind === "handover" ? (
                <div key={i} className="sm-assistant">
                  <div className="sm-md"><p>{m.content}</p></div>
                  <div className="sm-daynote">Simulated handover — demo data</div>
                  <div className="sm-handover-cards">
                    {m.cover!.cases.map((a) => (
                      <div className="sm-ho" key={a.time}>
                        <div className="sm-ho-head">
                          <span className="sm-ho-time">{a.time}</span>
                          <span className="sm-appt-species">{a.species}</span>
                        </div>
                        <div className="sm-ho-animal">{a.animal}</div>
                        <div className="sm-diary-reason">{a.owner}</div>
                        <dl className="sm-ho-rows">
                          <div><dt>Situation</dt><dd>{a.reason}</dd></div>
                          <div><dt>Background</dt><dd>{a.firstDiagnosed}. {a.lastAppointment}.</dd></div>
                          <div><dt>Now on</dt><dd>{a.currentMeds}</dd></div>
                          {a.plan && <div><dt>Plan</dt><dd>{a.plan}</dd></div>}
                          {a.outstanding && a.outstanding.length > 0 && <div><dt>Outstanding</dt><dd>{a.outstanding.join("; ")}</dd></div>}
                          {a.watch && <div><dt>Watch for</dt><dd>{a.watch}</dd></div>}
                          {a.handling && <div><dt>Handling</dt><dd>{a.handling}</dd></div>}
                        </dl>
                        <button className="sm-ho-open" onClick={() => openCase(a)} disabled={loading}>Open full file →</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : m.kind === "casefile" ? (
                <div key={i} className="sm-assistant">
                  <div className="sm-file">
                    <div className="sm-file-head">
                      <div className="sm-file-animal">{m.appt!.animal}</div>
                      <div className="sm-file-meta">{m.appt!.species} &middot; {m.appt!.owner} &middot; {m.appt!.time}</div>
                    </div>
                    <dl className="sm-file-rows">
                      <div><dt>Today</dt><dd>{m.appt!.reason}</dd></div>
                      <div><dt>First diagnosed</dt><dd>{m.appt!.firstDiagnosed}</dd></div>
                      <div><dt>Last appointment</dt><dd>{m.appt!.lastAppointment}</dd></div>
                      <div><dt>Current medication</dt><dd>{m.appt!.currentMeds}</dd></div>
                      {m.appt!.plan && <div><dt>Colleague&rsquo;s plan</dt><dd>{m.appt!.plan}</dd></div>}
                      {m.appt!.outstanding && m.appt!.outstanding.length > 0 && (
                        <div><dt>Outstanding</dt><dd><ul className="sm-file-notes">{m.appt!.outstanding.map((n, j) => <li key={j}>{n}</li>)}</ul></dd></div>
                      )}
                      {m.appt!.watch && <div><dt>Watch for</dt><dd>{m.appt!.watch}</dd></div>}
                      {m.appt!.handling && <div><dt>Handling</dt><dd>{m.appt!.handling}</dd></div>}
                      <div><dt>History</dt><dd><ul className="sm-file-notes">{m.appt!.history.map((n, j) => <li key={j}>{n}</li>)}</ul></dd></div>
                      {m.appt!.flags.length > 0 && (
                        <div><dt>Alerts</dt><dd><div className="sm-appt-flags">{m.appt!.flags.map((f) => <span key={f} className="sm-flag">{f}</span>)}</div></dd></div>
                      )}
                    </dl>
                    <p className="sm-file-hint">This is the patient&rsquo;s record. Ask me anything about the case &mdash; I&rsquo;ll only suggest a course of action if you ask.</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="sm-assistant">
                  {m.streaming && !m.content && (
                    <div className="sm-thinking-row">
                      <span className="sm-thinking" aria-label="Working"><span className="sm-dot" /><span className="sm-dot" /><span className="sm-dot" /></span>
                      {m.status && <span className="sm-status">{m.status}</span>}
                    </div>
                  )}
                  {m.tools && m.tools.length > 0 && (
                    <div className="sm-chips">
                      <span className="sm-chips-label">Searched</span>
                      {[...new Set(m.tools)].map((t) => (
                        <span key={t} className="sm-chip">{TOOL_LABELS[t] ?? t}</span>
                      ))}
                    </div>
                  )}
                  {m.content && (
                    <div className={"sm-md" + (m.streaming ? " sm-streaming" : "")}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: SourceLink as any }}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  {!m.streaming && m.content && <RatingBar logId={m.logId} />}
                </div>
              ),
            )}

            {error && <div className="sm-err">{error}</div>}
            <div ref={endRef} />
          </div>
        </main>

        <div className="sm-dock">
          <div className="sm-col">
            <div className="sm-composer">
              <textarea
                ref={taRef}
                value={question}
                onChange={(e) => { setQuestion(e.target.value); grow(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                placeholder="Message the assistant…"
                rows={1}
              />
              <button className="sm-send" onClick={() => ask()} disabled={loading || !question.trim()} aria-label="Send">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6" /><path d="M6 12l6-6 6 6" /></svg>
              </button>
            </div>
            <p className="sm-disclaim">
              Decision support only — the attending veterinary surgeon holds clinical and legal responsibility. Verify doses and withdrawal periods against the VMD Product Information Database before prescribing.
            </p>
          </div>
        </div>
      </div>

      <aside className="sm-rail" aria-label="Patient context">
        {activeCase ? (
          <div className="sm-rail-body">
            <div className="sm-rail-head">
              <span className="sm-rail-kicker">Patient · {activeCase.time}</span>
              <div className="sm-rail-name">{shortAnimal(activeCase.animal)}</div>
              {caseDescriptor(activeCase.animal) && (
                <div className="sm-rail-sig">{caseDescriptor(activeCase.animal)}</div>
              )}
              <div className="sm-rail-meta">
                <span>{activeCase.owner}</span>
                <span className="sm-rail-species">{activeCase.species}</span>
              </div>
              {activeCase.flags.some((f) => /food-producing|withdrawal/i.test(f)) && (
                <div className="sm-rail-pin">Food-producing — withdrawals apply</div>
              )}
            </div>

            <div className="sm-rail-sec">
              <span className="sm-rail-label">Ask the agent about this case</span>
              <div className="sm-rail-prompts">
                {casePrompts(activeCase).map((p) => (
                  <button key={p.label} className="sm-rail-prompt" onClick={() => ask(p.query)} disabled={loading}>
                    <span>{p.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm-rail-sec">
              <span className="sm-rail-label">Linked follow-ups</span>
              {caseTasks.length > 0 ? (
                <div className="sm-rail-tasks">
                  {caseTasks.map((t) => (
                    <button key={t.id} className="sm-rail-task" onClick={() => toggleTask(t.id)}>
                      <span className="sm-rail-check" aria-hidden />
                      <span className="sm-rail-task-text">
                        {t.text}
                        {t.urgent && <span className="sm-task-urgent">urgent</span>}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="sm-rail-muted">No open follow-ups linked to this patient.</p>
              )}
              <button
                className="sm-rail-add"
                onClick={() => setTasks((t) => [...t, { id: "u" + Date.now(), text: `${shortAnimal(activeCase.animal)} — follow-up`, patient: shortAnimal(activeCase.animal), done: false }])}
              >
                + Add follow-up for this patient
              </button>
            </div>

            <button className="sm-rail-record" onClick={() => openCase(activeCase)} disabled={loading}>
              Open full record
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        ) : (
          <div className="sm-rail-empty">
            <div className="sm-rail-empty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>
            </div>
            <p>Open a consult from the diary or the now / next marker to see the patient at a glance here.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
