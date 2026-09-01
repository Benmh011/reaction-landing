"use client";

import {
  WEEK,
  absences,
  clashJobs,
  housekeepers,
  isAbsent,
  jobsFor,
  propertyName,
  shortDate,
  unassignedJobs,
  weekHoursFor,
  weekday,
} from "./data";
import { Figure, Figures, PageHead, Provenance, TableWrap } from "./ui";

export default function Rota() {
  const assigned = housekeepers.reduce((s, h) => s + weekHoursFor(h.id), 0);
  const contracted = housekeepers.reduce((s, h) => s + h.contracted, 0);
  const over = housekeepers.filter(
    (h) => weekHoursFor(h.id) > h.contracted
  ).length;

  return (
    <>
      <PageHead
        title="Rota"
        lede="The week's cleaning work laid against who is available and what they are contracted for."
      />

      <Provenance>
        Replaces the rota workbook. The hours come from the changeover plan
        rather than being typed in twice, and the checks below run on every
        change instead of being spotted by eye.
      </Provenance>

      <Figures>
        <Figure label="Hours to cover" value={`${assigned}h`} />
        <Figure label="Contracted hours" value={`${contracted}h`} />
        <Figure
          label="Over contract"
          value={String(over)}
          tone={over > 0 ? "warn" : undefined}
        />
        <Figure
          label="Unassigned jobs"
          value={String(unassignedJobs.length)}
          tone={unassignedJobs.length > 0 ? "alert" : undefined}
        />
        <Figure
          label="Leave clashes"
          value={String(clashJobs.length)}
          tone={clashJobs.length > 0 ? "alert" : undefined}
        />
      </Figures>

      <TableWrap>
        <table className="tn-table tn-grid">
          <thead>
            <tr>
              <th scope="col">Housekeeper</th>
              {WEEK.map((d) => (
                <th key={d} scope="col">
                  <span>{weekday(d)}</span>
                  <span className="tn-sub">{shortDate(d)}</span>
                </th>
              ))}
              <th scope="col" className="tn-num">
                Week
              </th>
            </tr>
          </thead>
          <tbody>
            {housekeepers.map((h) => {
              const total = weekHoursFor(h.id);
              const state =
                total > h.contracted
                  ? "warn"
                  : total < h.contracted * 0.5
                  ? "under"
                  : "ok";
              return (
                <tr key={h.id}>
                  <th scope="row">
                    <span className="tn-strong">{h.name}</span>
                    <span className="tn-sub">
                      {h.role} · {h.basedIn}
                      {h.trainedOn.length > 0
                        ? ` · ${h.trainedOn.length} properties only`
                        : ""}
                    </span>
                  </th>
                  {WEEK.map((d) => {
                    const jobs = jobsFor(h.id, d);
                    const away = isAbsent(h.id, d);
                    const hours = jobs.reduce((s, j) => s + j.hours, 0);
                    return (
                      <td
                        key={d}
                        className={`tn-cell${away ? " tn-c-away" : ""}${
                          away && jobs.length > 0 ? " tn-c-clash" : ""
                        }`}
                      >
                        {away && jobs.length === 0 ? (
                          <span className="tn-sub">Leave</span>
                        ) : jobs.length === 0 ? (
                          ""
                        ) : (
                          <>
                            <span className="tn-cellhours">{hours}h</span>
                            <span className="tn-sub">
                              {jobs
                                .map((j) => propertyName(j.propertyId))
                                .join(", ")}
                            </span>
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className={`tn-num tn-total tn-total-${state}`}>
                    {total}h
                    <span className="tn-sub">of {h.contracted}h</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      <h3 className="tn-subhead">What the checks caught</h3>
      <ul className="tn-list">
        {unassignedJobs.map((j) => (
          <li key={j.id} className="tn-flag tn-u-overdue">
            <span className="tn-strong">No one assigned</span>
            <span>
              {propertyName(j.propertyId)} · {j.type} · {j.hours}h on{" "}
              {weekday(j.date)} {shortDate(j.date)}
            </span>
          </li>
        ))}
        {clashJobs.map((j) => (
          <li key={j.id} className="tn-flag tn-u-overdue">
            <span className="tn-strong">Assigned while on leave</span>
            <span>
              {propertyName(j.propertyId)} on {weekday(j.date)}{" "}
              {shortDate(j.date)}
            </span>
          </li>
        ))}
        {housekeepers
          .filter((h) => weekHoursFor(h.id) > h.contracted)
          .map((h) => (
            <li key={h.id} className="tn-flag tn-u-soon">
              <span className="tn-strong">Over contracted hours</span>
              <span>
                {h.name} is on {weekHoursFor(h.id)}h against a {h.contracted}h
                contract
              </span>
            </li>
          ))}
        {absences.length > 0 ? (
          <li className="tn-flag">
            <span className="tn-strong">Leave booked this week</span>
            <span>
              {absences
                .map(
                  (a) =>
                    `${
                      housekeepers.find((h) => h.id === a.housekeeperId)?.name ??
                      a.housekeeperId
                    } (${shortDate(a.date)})`
                )
                .join(", ")}
            </span>
          </li>
        ) : null}
      </ul>
    </>
  );
}
