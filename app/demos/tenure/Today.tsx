"use client";

import {
  PEAK_DAY,
  certificates,
  clashJobs,
  contractors,
  formatDate,
  jobsOn,
  money,
  movementsOn,
  propertyLabel,
  relativeDays,
  shortDate,
  summary,
  unallocatedCosts,
  unassignedJobs,
  urgencyOf,
  weekday,
} from "./data";
import { Figure, Figures, PageHead } from "./ui";

export type SectionId =
  | "today"
  | "changeovers"
  | "rota"
  | "linen"
  | "compliance"
  | "statements"
  | "contractors"
  | "portfolio";

type Item = {
  id: string;
  headline: string;
  detail: string;
  section: SectionId;
  sectionLabel: string;
  urgency: "overdue" | "soon";
};

function buildList(): Item[] {
  const items: Item[] = [];

  certificates
    .filter((c) => urgencyOf(c.expires) === "overdue")
    .forEach((c) =>
      items.push({
        id: c.id,
        headline: `${c.kind} has expired`,
        detail: `${propertyLabel(c.propertyId)} — ran out ${relativeDays(
          c.expires
        )}, on ${formatDate(c.expires)}. Issued by ${c.provider}.`,
        section: "compliance",
        sectionLabel: "Compliance",
        urgency: "overdue",
      })
    );

  unassignedJobs.forEach((j) =>
    items.push({
      id: j.id,
      headline: "Changeover with no one assigned",
      detail: `${propertyLabel(j.propertyId)} — ${j.hours}h ${j.type.toLowerCase()} on ${weekday(
        j.date
      )} ${shortDate(j.date)}, still unallocated.`,
      section: "rota",
      sectionLabel: "Rota",
      urgency: "overdue",
    })
  );

  clashJobs.forEach((j) =>
    items.push({
      id: `clash-${j.id}`,
      headline: "Someone is rota'd while on leave",
      detail: `${propertyLabel(j.propertyId)} on ${weekday(j.date)} ${shortDate(
        j.date
      )} is assigned to a housekeeper booked off that day.`,
      section: "rota",
      sectionLabel: "Rota",
      urgency: "overdue",
    })
  );

  contractors
    .filter(
      (c) =>
        urgencyOf(c.publicLiabilityExpires) === "overdue" ||
        (c.registrationExpires &&
          urgencyOf(c.registrationExpires) === "overdue")
    )
    .forEach((c) =>
      items.push({
        id: c.id,
        headline: "Contractor cannot be assigned",
        detail: `${c.name} — ${
          urgencyOf(c.publicLiabilityExpires) === "overdue"
            ? "public liability"
            : "trade registration"
        } has lapsed. Any job routed to them is blocked until it is renewed.`,
        section: "contractors",
        sectionLabel: "Contractors",
        urgency: "overdue",
      })
    );

  if (unallocatedCosts.length > 0) {
    items.push({
      id: "unallocated",
      headline: "Costs with no property against them",
      detail: `${unallocatedCosts.length} invoices totalling ${money(
        summary.unallocatedValue
      )} cannot be recharged until someone says which property they belong to. The statement run waits on this.`,
      section: "statements",
      sectionLabel: "Owner statements",
      urgency: "overdue",
    });
  }

  certificates
    .filter((c) => urgencyOf(c.expires) === "soon")
    .forEach((c) =>
      items.push({
        id: c.id,
        headline: `${c.kind} due ${relativeDays(c.expires)}`,
        detail: `${propertyLabel(c.propertyId)} — expires ${formatDate(
          c.expires
        )}. ${c.interval} renewal.`,
        section: "compliance",
        sectionLabel: "Compliance",
        urgency: "soon",
      })
    );

  return items.sort((a, b) =>
    a.urgency === b.urgency ? 0 : a.urgency === "overdue" ? -1 : 1
  );
}

export default function Today({ onJump }: { onJump: (s: SectionId) => void }) {
  const items = buildList();
  const overdue = items.filter((i) => i.urgency === "overdue").length;
  const peak = movementsOn(PEAK_DAY);
  const peakHours = jobsOn(PEAK_DAY).reduce((s, j) => s + j.hours, 0);

  return (
    <>
      <PageHead
        title="Tuesday, 1 September"
        lede={`${overdue} things need a person today. Saturday's changeover is the week's pinch point.`}
      />

      <Figures>
        <Figure label="Properties" value={String(summary.properties)} />
        <Figure label="Owners" value={String(summary.owners)} />
        <Figure label="Saturday movements" value={String(peak.length)} />
        <Figure label="Saturday hours" value={`${peakHours}h`} />
        <Figure
          label="Unassigned"
          value={String(summary.unassigned)}
          tone={summary.unassigned > 0 ? "alert" : undefined}
        />
        <Figure
          label="Expired certificates"
          value={String(summary.expiredCerts)}
          tone={summary.expiredCerts > 0 ? "alert" : undefined}
        />
      </Figures>

      <ul className="tn-list">
        {items.map((i) => (
          <li key={`${i.section}-${i.id}`} className={`tn-exc tn-u-${i.urgency}`}>
            <div className="tn-exc-body">
              <h4>{i.headline}</h4>
              <p>{i.detail}</p>
              <button
                type="button"
                className="tn-inline"
                onClick={() => onJump(i.section)}
              >
                Open in {i.sectionLabel}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
