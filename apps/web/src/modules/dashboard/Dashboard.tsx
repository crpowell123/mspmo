import { useState } from 'react';
import { UserButton, useOrganization } from '@clerk/clerk-react';
import { C, Chip } from '../../components/ui';
import { useRisks, useProcurement, useCWStatus, useCWSync } from '../../hooks/useData';

// Module imports
import { PortfolioModule }    from '../pmo/portfolio/PortfolioModule';
import { IntakeModule }       from '../pmo/intake/IntakeModule';
import { StatusReportsModule }from '../pmo/reports/StatusReportsModule';
import { CapacityModule }     from '../pmo/capacity/CapacityModule';
import { RMSModule } from '../rms/RMSModule';
import { RiskModule } from '../risk/RiskModule';
import { LessonsModule } from '../lessons/LessonsModule';
import { ScheduleModule } from '../schedule/ScheduleModule';
import { ProcurementModule } from '../procurement/ProcurementModule';
import { ChecklistModule } from '../checklist/ChecklistModule';
import { SettingsPage } from '../settings/SettingsPage';

const NAV = [
  { id:'pmo-portfolio', label:'Portfolio Dashboard',     icon:'📊', section:'PMO' },
  { id:'pmo-intake',    label:'Intake & Demand',         icon:'📥', section:'PMO' },
  { id:'pmo-reports',   label:'Status Reporting',        icon:'📋', section:'PMO' },
  { id:'pmo-capacity',  label:'Capacity Planning',       icon:'🗂️',  section:'PMO' },
  { id:'rms',           label:'Resource Management',     icon:'👥', section:'PROJECT' },
  { id:'risk',          label:'Risk Register',           icon:'⚠️',  section:'PROJECT' },
  { id:'lessons',       label:'Lessons Learned',         icon:'💡', section:'PROJECT' },
  { id:'schedule',      label:'Schedule & Dependencies', icon:'📅', section:'PROJECT' },
  { id:'procurement',   label:'Procurement',             icon:'📦', section:'PROJECT' },
  { id:'checklist',     label:'Material Checklist',      icon:'✅', section:'PROJECT' },
  { id:'settings',      label:'Settings',                icon:'⚙️',  section:'SETTINGS' },
];

export function Dashboard() {
  const [activeModule, setActiveModule] = useState('pmo-portfolio');
  const { organization } = useOrganization();
  const { data: risks = [] } = useRisks();
  const { data: proc = [] } = useProcurement();
  const { data: cwStatus } = useCWStatus();
  const syncMutation = useCWSync();

  const openRisks   = risks.filter((r: any) => r.status === 'Open').length;
  const pendingPOs  = proc.filter((p: any) => p.status === 'Pending PO').length;

  const alertMap: Record<string, boolean> = {
    risk: openRisks > 0,
    procurement: pendingPOs > 0,
  };

  const cwConnected = !!cwStatus;
  const cwSyncing   = cwStatus?.syncStatus === 'syncing';
  const cwError     = cwStatus?.syncStatus === 'error';

  return (
    <div style={{ fontFamily:'DM Sans,Segoe UI,sans-serif', background:C.bg0, color:C.t0, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* ── TOP BAR ── */}
      <div style={{ background:C.bg1, borderBottom:`1px solid ${C.bd}`, padding:'0 24px', display:'flex', alignItems:'center', height:54, flexShrink:0, gap:10 }}>
        <div style={{ width:32, height:32, background:'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', fontWeight:800, flexShrink:0 }}>F</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:C.t0, letterSpacing:'-0.03em', lineHeight:1 }}>MSPMO</div>
          <div style={{ fontSize:9, color:C.t2, letterSpacing:'0.1em' }}>YOUR PMO · {organization?.name?.toUpperCase()}</div>
        </div>
        <div style={{ height:28, width:1, background:C.bd, margin:'0 4px' }} />

        {/* Alert pills */}
        {openRisks > 0 && (
          <span style={{ background:C.amberBg, border:`1px solid ${C.amber}40`, borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:700, color:C.amber }}>
            ⚠ {openRisks} open risk{openRisks > 1 ? 's' : ''}
          </span>
        )}
        {pendingPOs > 0 && (
          <span style={{ background:C.purpleBg, border:`1px solid ${C.purple}40`, borderRadius:99, padding:'3px 10px', fontSize:10, fontWeight:700, color:C.purple }}>
            {pendingPOs} pending PO{pendingPOs > 1 ? 's' : ''}
          </span>
        )}

        {/* CW Status */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.t2 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: cwError ? C.red : cwConnected ? C.green : C.t3, animation: cwSyncing ? 'spin 1.5s linear infinite' : 'none' }} />
            {cwError ? 'CW Error' : cwSyncing ? 'Syncing…' : cwConnected ? `Synced ${cwStatus?.lastSyncedAt ? new Date(cwStatus.lastSyncedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}` : 'Not connected'}
          </div>
          {cwConnected && !cwSyncing && (
            <button onClick={() => syncMutation.mutate()} style={{ background:C.bg3, border:`1px solid ${C.bd}`, borderRadius:6, padding:'4px 10px', color:C.t1, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
              ↻ Sync
            </button>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* ── SIDEBAR ── */}
        <div style={{ width:220, background:C.bg1, borderRight:`1px solid ${C.bd}`, flexShrink:0, padding:'20px 10px', display:'flex', flexDirection:'column', gap:3, overflowY:'auto' }}>
          {['PMO','PROJECT','SETTINGS'].map(section => (
            <div key={section}>
              <div style={{ fontSize:9, fontWeight:700, color:C.t3, letterSpacing:'0.12em', margin:'12px 0 6px', paddingLeft:10 }}>{section}</div>
              {NAV.filter(n => n.section === section).map(n => (
            <button key={n.id} onClick={() => setActiveModule(n.id)} style={{
              background: activeModule===n.id ? C.blueBg : 'transparent',
              border:`1px solid ${activeModule===n.id ? C.blue+'55' : 'transparent'}`,
              borderRadius:8, padding:'9px 12px',
              color: activeModule===n.id ? C.blue : C.t1,
              fontSize:12, fontWeight:activeModule===n.id ? 700 : 500,
              cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:9,
              fontFamily:'inherit', width:'100%',
            }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              <span style={{ flex:1, lineHeight:1.3 }}>{n.label}</span>
              {alertMap[n.id] && <span style={{ width:7, height:7, borderRadius:'50%', background:C.red, flexShrink:0 }} />}
            </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
          {activeModule === 'pmo-portfolio' && <PortfolioModule />}
          {activeModule === 'pmo-intake'    && <IntakeModule />}
          {activeModule === 'pmo-reports'   && <StatusReportsModule />}
          {activeModule === 'pmo-capacity'  && <CapacityModule />}
          {activeModule === 'rms'           && <RMSModule />}
          {activeModule === 'risk'        && <RiskModule />}
          {activeModule === 'lessons'     && <LessonsModule />}
          {activeModule === 'schedule'    && <ScheduleModule />}
          {activeModule === 'procurement' && <ProcurementModule />}
          {activeModule === 'checklist'   && <ChecklistModule />}
          {activeModule === 'settings'    && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
