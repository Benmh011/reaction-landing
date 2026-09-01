"use client";

import {
  certificates,
  formatDate,
  propertyLabel,
  relativeDays,
  urgencyOf,
} from "./data";
import { Figure, Figures, PageHead, Provenance } from "./ui";

const stateWord = (u: ReturnType<typeof urgencyOf>) =>
  u === "overdue" ? "Expired" : u === "soon" ? "Due" : "Valid";

export default function Compliance() {
  const rows = [...certificates].sort((a, b) =>
    a.expires.localeCompare(b.expires)
  );
  const expired = rows.filter((c) => urgencyOf(c.expires) === "overdue");
  const soon = rows.filter((c) => urgencyOf(c.expires) === "soon");

  return (
    <>
      <PageHead
        title="Compliance"
        lede="Every dated obligation across the portfolio, earliest first."
      />

      <Provenance>
        Replaces the compliance matrix. The difference is not the list — a
        spreadsheet holds a list perfectly well. It is that this one sends the
        reminder itself, at 90, 60, 30 and 7 days, to the named manager.
      </Provenance>

      <Figures>
        <Figure label="Obligations tracked" value={String(rows.length)} />
        <Figure
          label="Expired"
          value={String(expired.length)}
          tone={expired.length > 0 ? "alert" : undefined}
        />
        <Figure
          label="Due within 30 days"
          value={String(soon.length)}
          tone={soon.length > 0 ? "warn" : undefined}
        />
      </Figures>

      <ul className="tn-list">
        {rows.map((c) => {
          const u = urgencyOf(c.expires);
          return (
            <li key={c.id} className={`tn-cert tn-u-${u}`}>
              <div className="tn-cert-rail">
                <span className="tn-cert-date">{formatDate(c.expires)}</span>
                <span className="tn-cert-rel">{relativeDays(c.expires)}</span>
              </div>
              <div className="tn-cert-body">
                <h4>
                  {c.kind} — {propertyLabel(c.propertyId)}
                </h4>
                <p className="tn-meta">
                  {c.interval} · issued {formatDate(c.issued)} by {c.provider}
                </p>
              </div>
              <span className={`tn-tag tn-u-tag-${u}`}>{stateWord(u)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
