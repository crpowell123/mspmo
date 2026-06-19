import { useState } from 'react';
import { C, Card, Btn, Modal, Field, Inp, Sel, Textarea, SectionHdr, StatCard, Spinner, Empty } from '../../../components/ui';
import { useStatusReports, useProjects, useGenerateReport, useCreateStatusReport } from '../../../hooks/useData';
import { useApiClient } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const RAG_COLORS: Record<string,string> = { Red:C.red, Amber:C.amber, Green:C.green };
const RAG_BG:     Record<string,string> = { Red:C.redBg, Amber:C.amberBg, Green:C.greenBg };

function RAGBadge({ status }: { status: string }) {
  return (
    <span style={{ background:RAG_BG[status]||C.bg3, color:RAG_COLORS[status]||C.teal,
      border:`1px solid ${RAG_COLORS[status]||C.teal}44`, borderRadius:6,
      padding:'3px 12px', fontSize:12, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:RAG_COLORS[status]||C.teal }} />
      {status}
    </span>
  );
}

export function StatusReportsModule() {
  const { data: projects = [] }  = useProjects();
  const [selProj, setSelProj]    = useState('');
  const { data: reports = [], isLoading } = useStatusReports(selProj || undefined);
  const generateReport  = useGenerateReport();
  const createReport    = useCreateStatusReport();
  const api = useApiClient();
  const qc  = useQueryClient();
  const [showManual, setShowManual] = useState(false);
  const [generating, setGenerating] = useState<string|null>(null);
  const [form, setForm] = useState({
    projectId:'', period:'', ragStatus:'Green', summary:'',
    highlights:['','',''], issues:['',''], nextSteps:['','',''], createdBy:'',
  });

  const redCount   = reports.filter((r: any) => r.ragStatus === 'Red').length;
  const amberCount = reports.filter((r: any) => r.ragStatus === 'Amber').length;
  const aiCount    = reports.filter((r: any) => r.aiGenerated).length;

  const handleGenerate = async (projectId: string) => {
    setGenerating(projectId);
    try {
      await generateReport.mutateAsync(projectId);
    } catch (e: any) {
      alert('Generation failed: ' + e.message);
    }
    setGenerating(null);
  };

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={28}/></div>;

  return (
    <div>
      {showManual && (
        <Modal title="Add Status Report" onClose={() => setShowManual(false)}>
          <Field label="Project">
            <Sel value={form.projectId} onChange={e => setForm({...form, projectId:e.target.value})}>
              <option value="">Select project…</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Sel>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Period (e.g. 2026-W24)"><Inp value={form.period} onChange={e => setForm({...form, period:e.target.value})} placeholder="YYYY-Www" /></Field>
            <Field label="RAG Status">
              <Sel value={form.ragStatus} onChange={e => setForm({...form, ragStatus:e.target.value})}>
                {['Green','Amber','Red'].map(x => <option key={x}>{x}</option>)}
              </Sel>
            </Field>
          </div>
          <Field label="Summary"><Textarea value={form.summary} onChange={e => setForm({...form, summary:e.target.value})} placeholder="2-3 sentence project status summary…" /></Field>
          <Field label="Highlights (one per line)">
            {form.highlights.map((h,i) => (
              <Inp key={i} value={h} onChange={e => { const a=[...form.highlights]; a[i]=e.target.value; setForm({...form, highlights:a}); }} placeholder={`Highlight ${i+1}`} style={{ marginBottom:6 }} />
            ))}
          </Field>
          <Field label="Issues (one per line)">
            {form.issues.map((h,i) => (
              <Inp key={i} value={h} onChange={e => { const a=[...form.issues]; a[i]=e.target.value; setForm({...form, issues:a}); }} placeholder={`Issue ${i+1}`} style={{ marginBottom:6 }} />
            ))}
          </Field>
          <Field label="Next steps">
            {form.nextSteps.map((h,i) => (
              <Inp key={i} value={h} onChange={e => { const a=[...form.nextSteps]; a[i]=e.target.value; setForm({...form, nextSteps:a}); }} placeholder={`Next step ${i+1}`} style={{ marginBottom:6 }} />
            ))}
          </Field>
          <Field label="Created By"><Inp value={form.createdBy} onChange={e => setForm({...form, createdBy:e.target.value})} placeholder="Your name" /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowManual(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => {
              await createReport.mutateAsync({
                ...form,
                highlights: form.highlights.filter(Boolean),
                issues:     form.issues.filter(Boolean),
                nextSteps:  form.nextSteps.filter(Boolean),
              });
              setShowManual(false);
            }}>Save Report</Btn>
          </div>
        </Modal>
      )}

      <SectionHdr title="Status Reporting" action={
        <div style={{ display:'flex', gap:8 }}>
          <Btn onClick={() => setShowManual(true)}>+ Manual Report</Btn>
        </div>
      } />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        <StatCard label="Total reports"  value={reports.length} color={C.blue}  />
        <StatCard label="Red status"     value={redCount}       color={C.red}   />
        <StatCard label="Amber status"   value={amberCount}     color={C.amber} />
        <StatCard label="AI generated"   value={aiCount}        color={C.purple}/>
      </div>

      {/* Generate AI reports */}
      <Card style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.t0, marginBottom:4 }}>Generate AI Status Report</div>
        <div style={{ fontSize:12, color:C.t2, marginBottom:14 }}>
          Automatically generate a weekly RAG status report from live project data using MSPMO AI.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {projects.filter((p: any) => ['In Progress','Planning','On Hold'].includes(p.status)).map((p: any) => (
            <div key={p.id} style={{ background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.t0, marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:10, color:C.t2 }}>{p.company}</div>
              </div>
              <Btn small variant="primary" loading={generating === p.id} onClick={() => handleGenerate(p.id)}>
                {generating === p.id ? 'Generating…' : '✦ Generate'}
              </Btn>
            </div>
          ))}
        </div>
      </Card>

      {/* Project filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={() => setSelProj('')} style={{ background:!selProj ? C.blue : C.bg3, border:`1px solid ${!selProj ? C.blue : C.bd}`, borderRadius:6, padding:'4px 12px', color:!selProj ? '#fff' : C.t1, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>All</button>
        {projects.map((p: any) => (
          <button key={p.id} onClick={() => setSelProj(p.id)} style={{ background:selProj===p.id ? C.blue : C.bg3, border:`1px solid ${selProj===p.id ? C.blue : C.bd}`, borderRadius:6, padding:'4px 12px', color:selProj===p.id ? '#fff' : C.t1, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{p.id}</button>
        ))}
      </div>

      {!reports.length && <Empty icon="📋" message="No reports yet" sub="Generate an AI report above or add one manually" />}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {reports.map((r: any) => {
          const proj = projects.find((p: any) => p.id === r.projectId);
          return (
            <Card key={r.id} style={{ padding:'16px 20px', borderLeft:`3px solid ${RAG_COLORS[r.ragStatus]||C.teal}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <RAGBadge status={r.ragStatus} />
                    <span style={{ fontSize:14, fontWeight:700, color:C.t0 }}>{proj?.name || r.projectId}</span>
                    <span style={{ fontSize:10, color:C.t2 }}>{r.period}</span>
                    {r.aiGenerated && <span style={{ background:C.purpleBg, color:C.purple, border:`1px solid ${C.purple}33`, fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4 }}>✦ AI</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.t2 }}>{proj?.company} · {r.createdBy} · {new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <button onClick={async () => { await api.delete(`/pmo/reports/${r.id}`); qc.invalidateQueries({ queryKey:['status-reports'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:16 }}>×</button>
              </div>
              <div style={{ fontSize:13, color:C.t0, lineHeight:1.6, marginBottom:12 }}>{r.summary}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {r.highlights?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.green, letterSpacing:'0.06em', marginBottom:6 }}>HIGHLIGHTS</div>
                    {r.highlights.map((h: string, i: number) => (
                      <div key={i} style={{ fontSize:11, color:C.t1, display:'flex', gap:6, marginBottom:4 }}>
                        <span style={{ color:C.green }}>✓</span>{h}
                      </div>
                    ))}
                  </div>
                )}
                {r.issues?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.06em', marginBottom:6 }}>ISSUES</div>
                    {r.issues.map((h: string, i: number) => (
                      <div key={i} style={{ fontSize:11, color:C.t1, display:'flex', gap:6, marginBottom:4 }}>
                        <span style={{ color:C.amber }}>⚠</span>{h}
                      </div>
                    ))}
                  </div>
                )}
                {r.nextSteps?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.blue, letterSpacing:'0.06em', marginBottom:6 }}>NEXT STEPS</div>
                    {r.nextSteps.map((h: string, i: number) => (
                      <div key={i} style={{ fontSize:11, color:C.t1, display:'flex', gap:6, marginBottom:4 }}>
                        <span style={{ color:C.blue }}>{i+1}.</span>{h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
