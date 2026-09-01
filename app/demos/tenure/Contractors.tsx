"use client";

import {
  contractors,
  formatDate,
  money,
  relativeDays,
  urgencyOf,
} from "./data";
import { Figure, Figures, PageHead, Provenance, TableWrap } from "./ui";

export default function Contractors() {
  const blocked = contractors.filter(
    (c) =>
      urgencyOf(c.publicLiabilityExpires) === "overdue" ||
      (c.registrationExpires && urgencyOf(c.registrationExpires) === "overdue")
  );
  const soon = contractors.filter(
    (c) =>
      !blocked.includes(c) &&
      (urgencyOf(c.publicLiabilityExpires) === "soon" ||
        (c.registrationExpires && urgencyOf(c.registrationExpires) === "soon"))
  );

  return (
    <>
      <PageHead
        title="Contractors"
        lede="The trade list, with the paperwork that decides whether they can be sent to a job."
      />

      <Provenance>
        Replaces the contractor index. The list is the easy part; the rule is
        the point — an out-of-date trade cannot be assigned to work, rather than
        being caught later by whoever happens to check.
      </Provenance>

      <Figures>
        <Figure label="On the list" value={String(contractors.length)} />
        <Figure
          label="Blocked"
          value={String(blocked.length)}
          tone={blocked.length > 0 ? "alert" : undefined}
        />
        <Figure
          label="Expiring soon"
          value={String(soon.length)}
          tone={soon.length > 0 ? "warn" : undefined}
        />
      </Figures>

      <TableWrap>
        <table className="tn-table">
          <thead>
            <tr>
              <th scope="col">Contractor</th>
              <th scope="col">Trade</th>
              <th scope="col">Public liability</th>
              <th scope="col">Registration</th>
              <th scope="col" className="tn-num">Day rate</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map((c) => {
              const pl = urgencyOf(c.publicLiabilityExpires);
              const reg = c.registrationExpires
                ? urgencyOf(c.registrationExpires)
                : "clear";
              const isBlocked = pl === "overdue" || reg === "overdue";
              return (
                <tr key={c.id} className={isBlocked ? "tn-rowalert" : undefined}>
                  <th scope="row">
                    <span className="tn-strong">{c.name}</span>
                  </th>
                  <td>{c.trade}</td>
                  <td className={pl === "overdue" ? "tn-alerttext" : undefined}>
                    {formatDate(c.publicLiabilityExpires)}
                    <span className="tn-sub">
                      {relativeDays(c.publicLiabilityExpires)}
                    </span>
                  </td>
                  <td
                    className={reg === "overdue" ? "tn-alerttext" : undefined}
                  >
                    {c.registration ?? "—"}
                    {c.registrationExpires ? (
                      <span className="tn-sub">
                        {relativeDays(c.registrationExpires)}
                      </span>
                    ) : null}
                  </td>
                  <td className="tn-num">{money(c.dayRate)}</td>
                  <td>
                    <span
                      className={`tn-tag ${
                        isBlocked
                          ? "tn-tag-alert"
                          : pl === "soon" || reg === "soon"
                          ? "tn-tag-warn"
                          : "tn-tag-clear"
                      }`}
                    >
                      {isBlocked
                        ? "Cannot be assigned"
                        : pl === "soon" || reg === "soon"
                        ? "Chase paperwork"
                        : "Available"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
