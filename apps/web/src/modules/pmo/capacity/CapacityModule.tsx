import { C, Card, SectionHdr, StatCard, Avatar, Spinner, Empty } from '../../../components/ui';
import { useCapacity } from '../../../hooks/useData';

const PC = ['#3b82f6','#f59e0b','#10b981','#ef4444','#a78bfa','#14b8a6'];

function UtilBar({ pct, overAllocated }: { pct: number; overAllocated: boolean }) {
  const col = overAllocated ? C.red : pct > 80 ? C.amber : pct > 50 ? C.blue : C.teal;
  return (
    <div style={{ flex:1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.t2, marginBottom:3 }}>
        <span>{pct}% utilized</span>
        {overAllocated && <span style={{ color:C.red, fontWeight:700 }}>OVER CAPACITY</span>}
      </div>
      <div style={{ background:C.bg3, borderRadius:4, height:8, overflow:'hidden' }}>
        <div style={{ width:`${Math.min(pct,100)}%`, background:col, height:'100%', transition:'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export function CapacityModule() {
  const { data, isLoading } = useCapacity();

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={28}/></div>;
  if (!data)     return <Empty icon="👥" message="No capacity data" sub="Add engineers and allocations to see capacity planning" />;

  const { engineers = [], projects = [], totals } = data;

  return (
    <div>
      <SectionHdr title="Capacity Planning" />

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <StatCard label="Engineers"      value={totals.totalEngineers}                     color={C.blue}  />
        <StatCard label="Over allocated" value={totals.overAllocated}                      color={C.red}   />
        <StatCard label="Avg utilization"value={`${totals.avgUtilization}%`}               color={totals.avgUtilization > 90 ? C.red : totals.avgUtilization > 70 ? C.amber : C.green} />
        <StatCard label="Total capacity" value={`${totals.totalCapacityHours}h/wk`}        color={C.teal}  />
        <StatCard label="Available now"  value={`${totals.totalAvailableHours}h/wk`}       color={C.green} />
      </div>

      {/* Hiring signal */}
      {totals.avgUtilization > 85 && (
        <div style={{ background:C.amberBg, border:`1px solid ${C.amber}44`, borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>⚠</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>Team is near capacity</div>
            <div style={{ fontSize:12, color:C.t1 }}>
              Average utilization is {totals.avgUtilization}%. Consider hiring or reducing project intake before taking on new work.
            </div>
          </div>
        </div>
      )}
      {totals.avgUtilization < 50 && (
        <div style={{ background:C.blueBg, border:`1px solid ${C.blue}44`, borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>💡</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.blue }}>Team has significant availability</div>
            <div style={{ fontSize:12, color:C.t1 }}>
              {totals.totalAvailableHours}h/week available across the team. Good time to take on new project requests from the intake backlog.
            </div>
          </div>
        </div>
      )}

      {/* Per-engineer breakdown */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
        {engineers.map((eng: any) => (
          <Card key={eng.id} style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
              <Avatar name={eng.name} color={eng.color} size={36} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.t0, marginBottom:1 }}>{eng.name}</div>
                <div style={{ fontSize:11, color:C.t2 }}>{eng.role}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16, fontWeight:700, color: eng.overAllocated ? C.red : C.t0, fontFamily:'JetBrains Mono,monospace' }}>
                  {eng.allocatedHours}h
                </div>
                <div style={{ fontSize:10, color:C.t2 }}>of {eng.capacityHours}h/wk</div>
              </div>
            </div>
            <UtilBar pct={eng.utilizationPct} overAllocated={eng.overAllocated} />
            {eng.allocations.length > 0 && (
              <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                {eng.allocations.map((a: any, i: number) => (
                  <div key={i} style={{ background:PC[i % PC.length]+'22', border:`1px solid ${PC[i % PC.length]}44`, borderRadius:6, padding:'3px 10px', fontSize:11, color:PC[i % PC.length], fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                    <span>{a.projectName}</span>
                    <span style={{ opacity:0.7 }}>{a.hoursPerWeek}h</span>
                  </div>
                ))}
              </div>
            )}
            {eng.allocations.length === 0 && (
              <div style={{ marginTop:8, fontSize:11, color:C.t3 }}>No active allocations — fully available</div>
            )}
          </Card>
        ))}
      </div>

      {/* Project demand table */}
      <div style={{ fontSize:13, fontWeight:700, color:C.t0, marginBottom:12 }}>Active project demand</div>
      <Card style={{ overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.bd}` }}>
                {['Project','Company','Status','Engineers allocated','Hrs/wk demand'].map(h => (
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', color:C.t2, fontWeight:600, fontSize:10, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p: any) => {
                const projAllocs = engineers.flatMap((e: any) =>
                  e.allocations.filter((a: any) => a.projectId === p.id)
                );
                const totalHrs = projAllocs.reduce((s: number, a: any) => s + a.hoursPerWeek, 0);
                return (
                  <tr key={p.id} style={{ borderBottom:`1px solid ${C.bd}` }}>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:C.t0 }}>{p.name}</td>
                    <td style={{ padding:'10px 14px', color:C.t1 }}>{p.company}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ fontSize:10, fontWeight:600, color:p.status==='In Progress' ? C.blue : C.amber }}>{p.status}</span></td>
                    <td style={{ padding:'10px 14px', color:C.t1 }}>{projAllocs.length} engineer{projAllocs.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding:'10px 14px', fontFamily:'JetBrains Mono,monospace', color:C.t0, fontWeight:600 }}>{totalHrs}h</td>
                  </tr>
                );
              })}
              {!projects.length && (
                <tr><td colSpan={5} style={{ padding:'20px 14px', color:C.t2, fontSize:12, textAlign:'center' }}>No active projects</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
