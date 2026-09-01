"use client";

import { useState } from "react";
import {
  PEAK_DAY,
  WEEK,
  daysUntil,
  linenFor,
  movementsOn,
  propertyById,
  shortDate,
  stockRule,
  weekday,
} from "./data";
import { Figure, Figures, PageHead, Provenance, TableWrap } from "./ui";

export default function Linen() {
  const [day, setDay] = useState(PEAK_DAY);

  // Only properties taking a new party need fresh linen.
  const arrivals = movementsOn(day).filter(
    (m) => m.kind === "in" || m.kind === "turnaround"
  );

  const lines = arrivals
    .map((m) => propertyById(m.propertyId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ property: p, linen: linenFor(p) }));

  const total = lines.reduce(
    (acc, l) => ({
      sheets: acc.sheets + l.linen.sheets,
      duvets: acc.duvets + l.linen.duvets,
      pillowcases: acc.pillowcases + l.linen.pillowcases,
      bathTowels: acc.bathTowels + l.linen.bathTowels,
      handTowels: acc.handTowels + l.linen.handTowels,
      bathMats: acc.bathMats + l.linen.bathMats,
      teaTowels: acc.teaTowels + l.linen.teaTowels,
    }),
    { sheets: 0, duvets: 0, pillowcases: 0, bathTowels: 0, handTowels: 0, bathMats: 0, teaTowels: 0 }
  );

  // A domestic-scale machine takes roughly this much per load.
  const loads = Math.ceil(
    (total.sheets + total.duvets + total.pillowcases / 4 + total.bathTowels / 2) / 9
  );

  const leadIn = daysUntil(day);

  return (
    <>
      <PageHead
        title="Linen & stock"
        lede="What the laundry has to send out and what has to be ordered, worked out from the arrivals."
      />

      <Provenance>
        Replaces the linen requirement tab. Every number below is arithmetic on
        the bed configuration held against each property, so it changes the
        moment a booking does.
      </Provenance>

      <div className="tn-daypick">
        {WEEK.map((d) => (
          <button
            key={d}
            type="button"
            className={`tn-daybtn${d === day ? " is-on" : ""}`}
            onClick={() => setDay(d)}
          >
            <span>{weekday(d)}</span>
            <span className="tn-sub">{shortDate(d)}</span>
          </button>
        ))}
      </div>

      <Figures>
        <Figure label="Properties" value={String(lines.length)} />
        <Figure label="Sheet sets" value={String(total.sheets)} />
        <Figure label="Duvet covers" value={String(total.duvets)} />
        <Figure label="Pillowcases" value={String(total.pillowcases)} />
        <Figure label="Bath towels" value={String(total.bathTowels)} />
        <Figure label="Laundry loads" value={String(loads)} />
      </Figures>

      {lines.length === 0 ? (
        <p className="tn-empty">No arrivals on this day, so no linen goes out.</p>
      ) : (
        <TableWrap>
          <table className="tn-table">
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Beds</th>
                <th scope="col" className="tn-num">Sheets</th>
                <th scope="col" className="tn-num">Duvets</th>
                <th scope="col" className="tn-num">Pillowcases</th>
                <th scope="col" className="tn-num">Bath</th>
                <th scope="col" className="tn-num">Hand</th>
                <th scope="col" className="tn-num">Mats</th>
                <th scope="col" className="tn-num">Tea</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ property: p, linen: l }) => (
                <tr key={p.id}>
                  <th scope="row">
                    <span className="tn-strong">{p.name}</span>
                    <span className="tn-sub">{p.village}</span>
                  </th>
                  <td className="tn-sub">
                    {[
                      p.beds.king ? `${p.beds.king} king` : null,
                      p.beds.double ? `${p.beds.double} double` : null,
                      p.beds.twin ? `${p.beds.twin} twin` : null,
                      p.beds.single ? `${p.beds.single} single` : null,
                      p.beds.sofa ? `${p.beds.sofa} sofa bed` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="tn-num">{l.sheets}</td>
                  <td className="tn-num">{l.duvets}</td>
                  <td className="tn-num">{l.pillowcases}</td>
                  <td className="tn-num">{l.bathTowels}</td>
                  <td className="tn-num">{l.handTowels}</td>
                  <td className="tn-num">{l.bathMats}</td>
                  <td className="tn-num">{l.teaTowels}</td>
                </tr>
              ))}
              <tr className="tn-totalrow">
                <th scope="row">Total out</th>
                <td />
                <td className="tn-num">{total.sheets}</td>
                <td className="tn-num">{total.duvets}</td>
                <td className="tn-num">{total.pillowcases}</td>
                <td className="tn-num">{total.bathTowels}</td>
                <td className="tn-num">{total.handTowels}</td>
                <td className="tn-num">{total.bathMats}</td>
                <td className="tn-num">{total.teaTowels}</td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
      )}

      <h3 className="tn-subhead">Consumables to order</h3>
      <TableWrap>
        <table className="tn-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Supplier</th>
              <th scope="col" className="tn-num">Per property</th>
              <th scope="col" className="tn-num">Needed</th>
              <th scope="col">Order by</th>
            </tr>
          </thead>
          <tbody>
            {stockRule.map((s) => {
              const needed = s.perProperty * lines.length;
              const late = leadIn < s.leadDays;
              return (
                <tr key={s.item}>
                  <th scope="row">{s.item}</th>
                  <td>{s.supplier}</td>
                  <td className="tn-num">{s.perProperty}</td>
                  <td className="tn-num">
                    {needed} {s.unit}
                  </td>
                  <td className={late ? "tn-alerttext" : undefined}>
                    {s.leadDays}-day lead
                    {late ? " — past the cut-off" : ""}
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
