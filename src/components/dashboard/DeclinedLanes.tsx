export type LaneRow = {
  origin: string;
  destination: string;
  total_calls: number;
  declines: number;
};

const pctClass = (p: number) => (p >= 60 ? "hi" : p >= 30 ? "mid" : "lo");

export function DeclinedLanes({ data }: { data: LaneRow[] }) {
  if (!data.length) {
    return <div className="empty">No lane data yet — start booking calls to populate.</div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lane</th>
            <th style={{ textAlign: "right" }}>Calls</th>
            <th style={{ textAlign: "right" }}>Declines</th>
            <th style={{ textAlign: "right" }}>Decline %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l) => {
            const pct = l.total_calls > 0 ? (l.declines / l.total_calls) * 100 : 0;
            return (
              <tr key={`${l.origin}-${l.destination}`} className="lane-row">
                <td>
                  <span className="lane">
                    {l.origin}
                    <span className="arrow">→</span>
                    {l.destination}
                  </span>
                </td>
                <td style={{ textAlign: "right" }} className="cell-mono">
                  {l.total_calls}
                </td>
                <td style={{ textAlign: "right" }} className="cell-mono">
                  {l.declines}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className={`decline-pct ${pctClass(pct)}`}>{pct.toFixed(0)}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
