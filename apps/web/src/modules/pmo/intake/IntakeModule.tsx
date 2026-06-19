import { useState } from 'react';
import { C, Card, Btn, Modal, Field, Inp, Sel, Textarea, Chip, SectionHdr, StatCard, Spinner, Empty } from '../../../components/ui';
import { useIntake, useCreateIntake, useReviewIntake } from '../../../hooks/useData';
import { useApiClient } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const PRIORITY_COLOR: Record<string,string> = {
  Critical: C.red,
  High:     C.amber,
  Medium:   C.blue,
  Low:      C.teal,
};
const PRIORITY_BG: Record<string,string> = {
  Critical: C.redBg,
  High:     C.amberBg,
  Medium:   C.blueBg,
  Low:      C.tealBg,
};

const STATUS_COLS: Record<string,string> = {
  Pending:       C.amber,
  'Under Review':C.blue,
  Approved:      C.green,
  Rejected:      C.red,
  Deferred:      C.purple,
};

function PriBadge({ priority }: { priority: string }) {
  return (
    <span style={{ background:PRIORITY_BG[priority]||C.bg3, color:PRIORITY_COLOR[priority]||C.t1,
      border:`1px solid ${PRIORITY_COLOR[priority]||C.bd}33`, borderRadius:5,
      padding:'2px 8px', fontSize:10, fontWeight:700 }}>
      {priority}
    </span>
  );
}

export function IntakeModule() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: intakes = [], isLoading } = useIntake(statusFilter || undefined);
  const createIntake  = useCreateIntake();
  const reviewIntake  = useReviewIntake();
  const api = useApiClient();
  const qc  = useQueryClient();

  const [showAdd,    setShowAdd]    = useState(false);
  const [showReview, setShowReview] = useState<any>(null);
  const [form, setForm] = useState({
    title:'', requestedBy:'', company:'', priority:'Medium',
    estimatedValue:0, estimatedHours:0, description:'', businessCase:'',
  });
  const [reviewForm, setReviewForm] = useState({
    status:'Approved', reviewedBy:'', reviewNotes:'',
  });

  const counts = {
    all:          intakes.length,
    pending:      intakes.filter((i: any) => i.status === 'Pending').length,
    underReview:  intakes.filter((i: any) => i.status === 'Under Review').length,
    approved:     intakes.filter((i: any) => i.status === 'Approved').length,
    rejected:     intakes.filter((i: any) => i.status === 'Rejected').length,
  };

  const totalValue = intakes
    .filter((i: any) => i.status === 'Approved')
    .reduce((s: number, i: any) => s + (i.estimatedValue || 0), 0);

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={28}/></div>;

  return (
    <div>
      {/* Add intake modal */}
      {showAdd && (
        <Modal title="New Project Request" onClose={() => setShowAdd(false)}>
          <Field label="Project Title"><Inp value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Brief title for the work" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Requested By"><Inp value={form.requestedBy} onChange={e => setForm({...form, requestedBy:e.target.value})} placeholder="Name" /></Field>
            <Field label="Client / Company"><Inp value={form.company} onChange={e => setForm({...form, company:e.target.value})} placeholder="Company name" /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Field label="Priority">
              <Sel value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
                {['Critical','High','Medium','Low'].map(x => <option key={x}>{x}</option>)}
              </Sel>
            </Field>
            <Field label="Est. Value ($)"><Inp type="number" value={String(form.estimatedValue)} onChange={e => setForm({...form, estimatedValue:Number(e.target.value)})} /></Field>
            <Field label="Est. Hours"><Inp type="number" value={String(form.estimatedHours)} onChange={e => setForm({...form, estimatedHours:Number(e.target.value)})} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="What work is being requested?" style={{ minHeight:80 }} /></Field>
          <Field label="Business Case"><Textarea value={form.businessCase} onChange={e => setForm({...form, businessCase:e.target.value})} placeholder="Why should this be approved?" style={{ minHeight:60 }} /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" loading={createIntake.isPending} onClick={async () => {
              await createIntake.mutateAsync(form);
              setShowAdd(false);
              setForm({ title:'', requestedBy:'', company:'', priority:'Medium', estimatedValue:0, estimatedHours:0, description:'', businessCase:'' });
            }}>Submit Request</Btn>
          </div>
        </Modal>
      )}

      {/* Review modal */}
      {showReview && (
        <Modal title={`Review: ${showReview.title}`} onClose={() => setShowReview(null)}>
          <div style={{ background:C.bg3, borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:12, color:C.t1, lineHeight:1.6 }}>
            <div style={{ fontWeight:700, color:C.t0, marginBottom:6 }}>Request details</div>
            <div>From: {showReview.requestedBy} · {showReview.company}</div>
            <div>Est. value: ${showReview.estimatedValue?.toLocaleString()} · Est. hours: {showReview.estimatedHours}h</div>
            <div style={{ marginTop:8 }}>{showReview.description}</div>
            {showReview.businessCase && <div style={{ marginTop:6, color:C.teal }}><strong>Business case:</strong> {showReview.businessCase}</div>}
          </div>
          <Field label="Decision">
            <Sel value={reviewForm.status} onChange={e => setReviewForm({...reviewForm, status:e.target.value})}>
              {['Approved','Rejected','Deferred','Under Review'].map(x => <option key={x}>{x}</option>)}
            </Sel>
          </Field>
          <Field label="Reviewed By"><Inp value={reviewForm.reviewedBy} onChange={e => setReviewForm({...reviewForm, reviewedBy:e.target.value})} placeholder="Your name" /></Field>
          <Field label="Notes"><Textarea value={reviewForm.reviewNotes} onChange={e => setReviewForm({...reviewForm, reviewNotes:e.target.value})} placeholder="Reason for decision, conditions, next steps..." style={{ minHeight:70 }} /></Field>
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <Btn onClick={() => setShowReview(null)}>Cancel</Btn>
            <Btn variant="primary" loading={reviewIntake.isPending} onClick={async () => {
              await reviewIntake.mutateAsync({ id: showReview.id, ...reviewForm });
              setShowReview(null);
            }}>Submit Review</Btn>
          </div>
        </Modal>
      )}

      <SectionHdr title="Intake & Demand" action={<Btn variant="primary" onClick={() => setShowAdd(true)}>+ New Request</Btn>} />

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        <StatCard label="Total requests" value={counts.all}         color={C.blue}   />
        <StatCard label="Pending review" value={counts.pending}     color={C.amber}  />
        <StatCard label="Under review"   value={counts.underReview} color={C.blue}   />
        <StatCard label="Approved"       value={counts.approved}    color={C.green}  />
        <StatCard label="Approved value" value={`$${totalValue.toLocaleString()}`} color={C.teal} />
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['','All'],['Pending','Pending'],['Under Review','Under Review'],['Approved','Approved'],['Rejected','Rejected'],['Deferred','Deferred']].map(([val,label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{
            background: statusFilter===val ? C.blue : C.bg3,
            border: `1px solid ${statusFilter===val ? C.blue : C.bd}`,
            borderRadius:6, padding:'4px 12px',
            color: statusFilter===val ? '#fff' : C.t1,
            fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          }}>{label}</button>
        ))}
      </div>

      {!intakes.length && <Empty icon="📥" message="No requests yet" sub="Submit a project request to start the intake process" />}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {intakes.map((item: any) => (
          <Card key={item.id} style={{ padding:'14px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <PriBadge priority={item.priority} />
                  <span style={{ fontSize:14, fontWeight:700, color:C.t0 }}>{item.title}</span>
                  <span style={{ fontSize:10, color:STATUS_COLS[item.status]||C.t2, background:C.bg3, border:`1px solid ${STATUS_COLS[item.status]||C.bd}33`, borderRadius:4, padding:'1px 7px', fontWeight:700 }}>{item.status}</span>
                </div>
                <div style={{ fontSize:11, color:C.t2 }}>
                  {item.requestedBy} · {item.company} · {new Date(item.submittedAt).toLocaleDateString()}
                  {item.estimatedValue > 0 && <span style={{ color:C.green, marginLeft:8 }}>${item.estimatedValue.toLocaleString()}</span>}
                  {item.estimatedHours > 0 && <span style={{ color:C.teal, marginLeft:8 }}>{item.estimatedHours}h</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, marginLeft:12 }}>
                {['Pending','Under Review'].includes(item.status) && (
                  <Btn small variant="primary" onClick={() => { setShowReview(item); setReviewForm({ status:'Approved', reviewedBy:'', reviewNotes:'' }); }}>Review</Btn>
                )}
                <button onClick={async () => { await api.delete(`/pmo/intake/${item.id}`); qc.invalidateQueries({ queryKey:['intake'] }); }} style={{ background:'none', border:'none', color:C.t3, cursor:'pointer', fontSize:16 }}>×</button>
              </div>
            </div>
            <div style={{ fontSize:12, color:C.t1, lineHeight:1.5, marginBottom: item.reviewNotes ? 8 : 0 }}>{item.description}</div>
            {item.reviewNotes && (
              <div style={{ background:C.bg3, borderRadius:6, padding:'8px 12px', fontSize:11, color:C.t1, marginTop:6 }}>
                <span style={{ fontWeight:600, color:C.t0 }}>Review note: </span>{item.reviewNotes}
                {item.reviewedBy && <span style={{ color:C.t2 }}> — {item.reviewedBy}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
