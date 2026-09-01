"use client";

import { useState } from "react";
import {
  STATEMENT_MONTH,
  augustIncome,
  costsForOwner,
  formatDate,
  money,
  ownerById,
  properties,
  propertyName,
  statementTotals,
  statements,
  unallocatedCosts,
} from "./data";
import { Figure, Figures, PageHead, Provenance, TableWrap } from "./ui";

export default function Statements() {
  const [openId, setOpenId] = useState<string | null>("o-03");

  const rows = statements.map((s) => ({
    ...s,
    owner: ownerById(s.ownerId),
    totals: statementTotals(s.ownerId),
  }));

  const totalIncome = rows.reduce((s, r) => s + r.totals.income, 0);
  const totalFee = rows.reduce((s, r) => s + r.totals.fee, 0);
  const totalNet = rows.reduce((s, r) => s + r.totals.net, 0);
  const held = unallocatedCosts.reduce((s, c) => s + c.net, 0);
  const notReady = rows.filter((r) => r.status === "Draft").length;

  const open = rows.find((r) => r.ownerId === openId) ?? null;

  return (
    <>
      <PageHead
        title="Owner statements"
        lede={`The ${STATEMENT_MONTH} run — income, management fee and recharged costs for every owner.`}
      />

      <Provenance>
        Replaces the monthly statement workbook. Costs are allocated by property
        code from the accounting export, each owner&apos;s own fee and markup are
        applied from their agreement, and the statement PDF is generated rather
        than formatted.
      </Provenance>

      <Figures>
        <Figure label="Let income" value={money(totalIncome)} />
        <Figure label="Management fees" value={money(totalFee)} />
        <Figure label="Due to owners" value={money(totalNet)} />
        <Figure
          label="Not yet ready"
          value={String(notReady)}
          tone={notReady > 0 ? "warn" : undefined}
        />
        <Figure
          label="Costs unallocated"
          value={money(held)}
          tone={held > 0 ? "alert" : undefined}
        />
      </Figures>

      <TableWrap>
        <table className="tn-table">
          <thead>
            <tr>
              <th scope="col">Owner</th>
              <th scope="col">Properties</th>
              <th scope="col" className="tn-num">Income</th>
              <th scope="col" className="tn-num">Fee</th>
              <th scope="col" className="tn-num">Costs</th>
              <th scope="col" className="tn-num">Net due</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.ownerId}
                className={`tn-clickrow${
                  openId === r.ownerId ? " is-open" : ""
                }`}
                onClick={() =>
                  setOpenId(openId === r.ownerId ? null : r.ownerId)
                }
              >
                <th scope="row">
                  <span className="tn-strong">{r.owner?.name}</span>
                  <span className="tn-sub">
                    {r.owner?.based} · {r.owner?.bookkeeper}
                  </span>
                </th>
                <td className="tn-sub">
                  {r.totals.propertyIds.map(propertyName).join(", ")}
                </td>
                <td className="tn-num">{money(r.totals.income)}</td>
                <td className="tn-num">
                  {money(r.totals.fee)}
                  <span className="tn-sub">{r.owner?.feePercent}%</span>
                </td>
                <td className="tn-num">
                  {money(r.totals.costs + r.totals.markup)}
                </td>
                <td className="tn-num tn-strong">{money(r.totals.net)}</td>
                <td>
                  <span
                    className={`tn-tag tn-status-${r.status.toLowerCase()}`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {open && open.owner ? (
        <div className="tn-statement">
          <h3>
            {open.owner.name} — {STATEMENT_MONTH}
          </h3>
          <p className="tn-meta">
            Sent to {open.owner.statementEmail} · prepared by{" "}
            {open.owner.bookkeeper}
          </p>

          <TableWrap>
            <table className="tn-table">
              <tbody>
                {open.totals.propertyIds.map((pid) => (
                  <tr key={pid}>
                    <th scope="row">
                      Let income — {propertyName(pid)}
                      <span className="tn-sub">
                        {properties.find((p) => p.id === pid)?.use}
                      </span>
                    </th>
                    <td className="tn-num">{money(augustIncome[pid] ?? 0)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    Management fee
                    <span className="tn-sub">
                      {open.owner.feePercent}% of let income
                    </span>
                  </th>
                  <td className="tn-num tn-alerttext">
                    −{money(open.totals.fee)}
                  </td>
                </tr>
                {costsForOwner(open.ownerId).map((c) => (
                  <tr key={c.id}>
                    <th scope="row">
                      {c.description}
                      <span className="tn-sub">
                        {propertyName(c.propertyId)} · {c.supplier} ·{" "}
                        {formatDate(c.date)}
                      </span>
                    </th>
                    <td className="tn-num tn-alerttext">−{money(c.net)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    Handling on recharged costs
                    <span className="tn-sub">
                      {open.owner.markupPercent}%
                    </span>
                  </th>
                  <td className="tn-num tn-alerttext">
                    −{money(open.totals.markup)}
                  </td>
                </tr>
                <tr className="tn-totalrow">
                  <th scope="row">Net due to owner</th>
                  <td className="tn-num">{money(open.totals.net)}</td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
        </div>
      ) : null}

      <h3 className="tn-subhead">Holding the run up</h3>
      <ul className="tn-list">
        {unallocatedCosts.map((c) => (
          <li key={c.id} className="tn-flag tn-u-overdue">
            <span className="tn-strong">
              {c.supplier} · {money(c.net)}
            </span>
            <span>
              {c.description} · {formatDate(c.date)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
