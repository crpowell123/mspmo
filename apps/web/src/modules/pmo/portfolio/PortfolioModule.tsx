import { useState } from 'react';
import { C, Card, Chip, SectionHdr, StatCard, Spinner, Empty, BudgetBar } from '../../../components/ui';
import { usePortfolio } from '../../../hooks/useData';

const RAG_COLORS: Record<string,string> = {
  Red:   C.red,
  Amber: C.amber,
  Green: C.green,
};
const RAG_BG: Record<string,string> = {
  Red:   C.redBg,
  Amber: C.amberBg,
  Green: C.greenBg,
};

function RAGBadge({ status }: { status: string }) {
  const col = RAG_COLORS[status] || C.teal;
  const bg  = RAG_BG[status]    || C.tealBg;
  return (
    <span style={{ background:bg, color:col, border:`1px solid ${col}44`, borderRadius:6,
      padding:'3px 12px', fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:col }} />
      {status}
    </span>
  );
}

export function PortfolioModule() {
  const { data, isLoading } = usePortfolio();
  const [filter, setFilter] = useState('All');

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={28} /></div>;
  if (!data)     return <Empty icon="📊" message="No portfolio data" sub="Add projects to see the portfolio view" />;

  const { projects = [], totals } = data;
  const filtered = filter === 'All' ? projects : projects.filter((p: any) => p.ragStatus === filter);

  return (
    <div>
      <SectionHdr title="Portfolio Dashboard" />

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <StatCard label="Total projects"  value={totals.totalProjects}  color={C.blue}   />
        <StatCard label="Active"          value={totals.activeProjects} color={C.teal}   />
        <StatCard label="Red / at risk"   value={totals.redProjects}    color={C.red}    />
        <StatCard label="Open risks"      value={totals.totalOpenRisks} color={C.amber}  />
        <StatCard label="Pending POs"     value={totals.totalPendingPOs}color={C.purple} />
      </div>

      {/* Budget summary */}
      <Card style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.t0 }}>Portfolio budget</span>
          <span style={{ fontSize:13, color:C.t1, fontFamily:'JetBrains Mono,monospace' }}>
            ${totals.totalSpent.toLocaleString()} / ${totals.totalBudget.toLocaleString()}
          </span>
        </div>
        <BudgetBar spent={totals.totalSpent} total={totals.totalBudget} />
      </Card>

      {/* RAG filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['All','Green','Amber','Red'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter===f ? (f==='All' ? C.blue : RAG_BG[f]||C.blue) : C.bg3,
            border: `1px solid ${filter===f ? (f==='All' ? C.blue : RAG_COLORS[f]||C.blue) : C.bd}`,
            borderRadius:7, padding:'5px 14px', color: filter===f ? (f==='All' ? '#fff' : RAG_COLORS[f]) : C.t1,
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          }}>
            {f}
            {f !== 'All' && (
              <span style={{ marginLeft:6, fontFamily:'JetBrains Mono,monospace' }}>
                {f==='Red' ? totals.redProjects : f==='Amber' ? totals.amberProjects : totals.greenProjects}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {!filtered.length && <Empty icon="✅" message="No projects match this filter" />}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map((p: any) => (
          <Card key={p.id} style={{ padding:'16px 20px', borderLeft:`3px solid ${RAG_COLORS[p.ragStatus] || C.teal}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <RAGBadge status={p.ragStatus} />
                  <span style={{ fontSize:14, fontWeight:700, color:C.t0 }}>{p.name}</span>
                </div>
                <div style={{ fontSize:11, color:C.t2 }}>{p.company} · {p.status} · {p.phase}</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {p.openRisks > 0 && (
                  <span style={{ background:C.amberBg, color:C.amber, border:`1px solid ${C.amber}33`, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5 }}>
                    ⚠ {p.openRisks} risk{p.openRisks > 1 ? 's' : ''}
                  </span>
                )}
                {p.pendingPOs > 0 && (
                  <span style={{ background:C.purpleBg, color:C.purple, border:`1px solid ${C.purple}33`, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5 }}>
                    {p.pendingPOs} pending PO{p.pendingPOs > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:16, alignItems:'end' }}>
              <div>
                <div style={{ fontSize:10, color:C.t2, fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>BUDGET</div>
                <BudgetBar spent={p.spent} total={p.budget} />
              </div>
              <div>
                <div style={{ fontSize:10, color:C.t2, fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>SCHEDULE</div>
                <div style={{ background:C.bg3, borderRadius:4, height:5, overflow:'hidden' }}>
                  <div style={{ width:`${p.phasePct}%`, background:C.teal, height:'100%' }} />
                </div>
                <div style={{ fontSize:10, color:C.t2, marginTop:3 }}>{p.phasePct}% phases done</div>
              </div>
              <div style={{ textAlign:'right' }}>
                {p.lastReport ? (
                  <div style={{ fontSize:10, color:C.t2 }}>
                    Last report<br />
                    <span style={{ color:C.t1 }}>{p.lastReport.period}</span>
                  </div>
                ) : (
                  <span style={{ fontSize:10, color:C.t3 }}>No report yet</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
