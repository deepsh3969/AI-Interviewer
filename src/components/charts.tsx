import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

interface TrendPoint {
  date: string;
  overall: number;
  label: string;
}

/**
 * Score trend chart with an accessible data-table alternative.
 * Only render this when there is enough real history (callers gate it).
 */
export function ScoreTrendChart({ points, title = 'Score trend' }: { points: TrendPoint[]; title?: string }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button type="button" className="btn-ghost text-xs" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Hide data table' : 'Show data table'}
        </button>
      </div>
      {showTable ? (
        <table className="w-full text-left text-xs text-ink-dim">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-3 font-medium">
                Date
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Session
              </th>
              <th scope="col" className="py-1 font-medium">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={`${point.date}-${point.label}`} className="border-b border-line/50">
                <td className="py-1 pr-3">{point.date}</td>
                <td className="py-1 pr-3">{point.label}</td>
                <td className="py-1">{point.overall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-56 w-full" role="img" aria-label={`${title}. ${points.map((p) => `${p.date}: ${p.overall}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
              <CartesianGrid stroke="#22304d" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#78859d" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#78859d" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111a2c', border: '1px solid #22304d', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a9b6cc' }}
              />
              <Line type="monotone" dataKey="overall" name="Overall score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface ScoredItem {
  label: string;
  score: number;
  count?: number;
}

export function DimensionBarChart({ items, title }: { items: ScoredItem[]; title: string }) {
  const [showTable, setShowTable] = useState(false);
  const colour = (score: number) => (score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171');

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button type="button" className="btn-ghost text-xs" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Hide data table' : 'Show data table'}
        </button>
      </div>
      {showTable ? (
        <table className="w-full text-left text-xs text-ink-dim">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-3 font-medium">
                Dimension
              </th>
              <th scope="col" className="py-1 font-medium">
                Average score (0-100)
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.label} className="border-b border-line/50">
                <td className="py-1 pr-3">{item.label}</td>
                <td className="py-1">{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-56 w-full" role="img" aria-label={`${title}. ${items.map((i) => `${i.label}: ${i.score}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="#22304d" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#78859d" fontSize={11} />
              <YAxis type="category" dataKey="label" width={130} stroke="#78859d" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111a2c', border: '1px solid #22304d', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a9b6cc' }}
              />
              <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                {items.map((item) => (
                  <Cell key={item.label} fill={colour(item.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
