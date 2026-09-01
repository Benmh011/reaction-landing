"use client";

import { useState } from "react";
import {
  PEAK_DAY,
  WEEK,
  bookings,
  housekeeperById,
  isAbsent,
  jobsOn,
  movementsOn,
  properties,
  propertyById,
  propertyName,
  shortDate,
  weekday,
} from "./data";
import { Figure, Figures, PageHead, Provenance, TableWrap } from "./ui";

/** What a property is doing on a given day, for the grid cell. */
function cellFor(propertyId: string, date: string) {
  const out = bookings.find((b) => b.propertyId === propertyId && b.to === date);
  const arriving = bookings.find(
    (b) => b.propertyId === propertyId && b.from === date
  );
  if (out && arriving) return { label: "Turnaround", cls: "tn-c-turn" };
  if (out) return { label: "Out", cls: "tn-c-out" };
  if (arriving) return { label: "In", cls: "tn-c-in" };
  const occupied = bookings.some(
    (b) => b.propertyId === propertyId && b.from < date && b.to > date
  );
  if (occupied) return { label: "", cls: "tn-c-stay" };
  return { label: "", cls: "" };
}

export default function Changeovers() {
  const [day, setDay] = useState(PEAK_DAY);

  const movements = movementsOn(day);
  const jobs = jobsOn(day);
  const turnarounds = movements.filter((m) => m.kind === "turnaround").length;
  const unassigned = jobs.filter((j) => j.housekeeperId === null).length;
  const hours = jobs.reduce((s, j) => s + j.hours, 0);

  return (
    <>
      <PageHead
        title="Changeovers"
        lede="Every arrival and departure for the week, merged from all booking channels into one grid."
      />

      <Provenance>
        Replaces the weekly changeover sheet. Built from the channel calendars
        rather than typed up from them, so a booking made on Airbnb at midnight
        is in Saturday&apos;s plan by morning.
      </Provenance>

      <TableWrap>
        <table className="tn-table tn-grid">
          <thead>
            <tr>
              <th scope="col">Property</th>
              {WEEK.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={`tn-gridhead${d === day ? " is-on" : ""}`}
                >
                  <button type="button" onClick={() => setDay(d)}>
                    <span>{weekday(d)}</span>
                    <span className="tn-sub">{shortDate(d)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  <span className="tn-strong">{p.name}</span>
                  <span className="tn-sub">{p.village}</span>
                </th>
                {WEEK.map((d) => {
                  const c = cellFor(p.id, d);
                  return (
                    <td key={d} className={`tn-cell ${c.cls}`}>
                      {c.label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <div className="tn-daybreak">
        <h3>
          {weekday(day)} {shortDate(day)}
        </h3>

        <Figures>
          <Figure label="Movements" value={String(movements.length)} />
          <Figure
            label="Same-day turnarounds"
            value={String(turnarounds)}
            tone={turnarounds > 3 ? "warn" : undefined}
          />
          <Figure label="Cleaning hours" value={`${hours}h`} />
          <Figure
            label="Unassigned"
            value={String(unassigned)}
            tone={unassigned > 0 ? "alert" : undefined}
          />
        </Figures>

        {movements.length === 0 ? (
          <p className="tn-empty">Nothing moves on this day.</p>
        ) : (
          <ul className="tn-list">
            {movements.map((m) => {
              const p = propertyById(m.propertyId);
              const job = jobs.find((j) => j.propertyId === m.propertyId);
              const hk = job?.housekeeperId
                ? housekeeperById(job.housekeeperId)
                : null;
              const clash =
                job?.housekeeperId && isAbsent(job.housekeeperId, day);
              return (
                <li
                  key={m.propertyId}
                  className={`tn-move${
                    !job || job.housekeeperId === null ? " tn-u-overdue" : ""
                  }`}
                >
                  <div className="tn-move-rail">
                    <span className={`tn-tag tn-kind-${m.kind}`}>
                      {m.kind === "turnaround"
                        ? "Turnaround"
                        : m.kind === "out"
                        ? "Departure"
                        : "Arrival"}
                    </span>
                  </div>
                  <div className="tn-move-body">
                    <h4>{propertyName(m.propertyId)}</h4>
                    <p className="tn-sub">
                      {p?.village} · sleeps {p?.sleeps}
                      {p?.hotTub ? " · hot tub" : ""}
                    </p>
                    <p className="tn-meta">
                      {m.out
                        ? `${m.out.guest} out, party of ${m.out.party} (${m.out.channel})`
                        : null}
                      {m.out && m.in ? " · " : null}
                      {m.in
                        ? `${m.in.guest} in, party of ${m.in.party} (${m.in.channel})`
                        : null}
                    </p>
                  </div>
                  <div className="tn-move-assign">
                    {job ? (
                      <>
                        <span className="tn-strong">
                          {hk ? hk.name : "Unassigned"}
                        </span>
                        <span className="tn-sub">
                          {job.start} · {job.hours}h · {job.type}
                        </span>
                        {clash ? (
                          <span className="tn-alerttext">On leave that day</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="tn-alerttext">No clean scheduled</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
