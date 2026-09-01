"use client";

import { ownerById, properties } from "./data";
import { PageHead, Provenance, TableWrap } from "./ui";

export default function Portfolio() {
  return (
    <>
      <PageHead
        title="Portfolio"
        lede="The properties under management and who each one belongs to."
      />

      <Provenance>
        The single record every other tab reads from. Bed configuration drives
        the linen numbers, clean hours drive the rota, and the owner&apos;s fee
        agreement drives the statement.
      </Provenance>

      <TableWrap>
        <table className="tn-table">
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Owner</th>
              <th scope="col">Use</th>
              <th scope="col">Sleeps</th>
              <th scope="col">Beds</th>
              <th scope="col">Manager</th>
              <th scope="col" className="tn-num">Clean</th>
              <th scope="col" className="tn-num">Drive</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const o = ownerById(p.ownerId);
              return (
                <tr key={p.id}>
                  <th scope="row">
                    <span className="tn-strong">{p.name}</span>
                    <span className="tn-sub">
                      {p.village} · {p.branch} branch
                      {p.hotTub ? " · hot tub" : ""}
                    </span>
                  </th>
                  <td>
                    {o?.name}
                    <span className="tn-sub">{o?.based}</span>
                  </td>
                  <td>
                    <span
                      className={`tn-tag${
                        p.use === "Private" ? " tn-tag-quiet" : ""
                      }`}
                    >
                      {p.use}
                    </span>
                  </td>
                  <td className="tn-num">{p.sleeps}</td>
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
                  <td>{p.manager}</td>
                  <td className="tn-num">{p.cleanHours}h</td>
                  <td className="tn-num">{p.driveMinutes}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
