import { useState } from 'react'
import './App.css'
import Header from './components/Header.jsx'
import TabBar from './components/TabBar.jsx'
import SimulationBanner from './components/SimulationBanner.jsx'
import { SimulationProvider, useSimulation } from './context/SimulationContext.jsx'
import OverviewTab      from './tabs/OverviewTab.jsx'
import PnLTab           from './tabs/PnLTab.jsx'
import VarianceTab      from './tabs/VarianceTab.jsx'
import ForecastTab      from './tabs/ForecastTab.jsx'
import BalanceSheetTab  from './tabs/BalanceSheetTab.jsx'
import WorkingCapitalTab from './tabs/WorkingCapitalTab.jsx'
import WorkforceTab      from './tabs/WorkforceTab.jsx'
import StatisticsTab    from './tabs/StatisticsTab.jsx'
import SimulationsTab   from './tabs/SimulationsTab.jsx'
import AgentChatTab     from './tabs/AgentChatTab.jsx'

const TABS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'pnl',            label: 'P&L' },
  { id: 'variance',       label: 'Variance' },
  { id: 'forecast',       label: 'Forecast' },
  { id: 'balancesheet',   label: 'Balance Sheet' },
  { id: 'workingcapital', label: 'Working Capital' },
  { id: 'workforce',      label: 'Workforce' },
  { id: 'statistics',     label: 'Statistics' },
  { id: 'simulations',    label: 'Simulations', isSim: true },
  { id: 'agentchat',      label: 'Agent Chat' },
]

function DashboardInner() {
  const [activeTab, setActiveTab] = useState('overview')
  const [fiscalYear, setFiscalYear] = useState(25)
  const [period, setPeriod] = useState(6)
  const { isAnyActive, activeSimulations } = useSimulation()

  return (
    <div className="app">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>
      <Header fiscalYear={fiscalYear} period={period} onFiscalYearChange={setFiscalYear} onPeriodChange={setPeriod} isAnyActive={isAnyActive} activeSimulations={activeSimulations} />
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} isAnyActive={isAnyActive} activeSimulations={activeSimulations} />
      <SimulationBanner />
      {/* display:block/none preserves PanelGrid state (panel order + minimized) across tab switches */}
      <main className="panel">
        <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}><OverviewTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'pnl' ? 'block' : 'none' }}><PnLTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'variance' ? 'block' : 'none' }}><VarianceTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'forecast' ? 'block' : 'none' }}><ForecastTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'balancesheet' ? 'block' : 'none' }}><BalanceSheetTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'workingcapital' ? 'block' : 'none' }}><WorkingCapitalTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'workforce' ? 'block' : 'none' }}><WorkforceTab fiscalYear={fiscalYear} /></div>
        <div style={{ display: activeTab === 'statistics' ? 'block' : 'none' }}><StatisticsTab fiscalYear={fiscalYear} period={period} /></div>
        <div style={{ display: activeTab === 'simulations' ? 'block' : 'none' }}><SimulationsTab onNavigateToChat={() => setActiveTab('agentchat')} /></div>
        <div style={{ display: activeTab === 'agentchat' ? 'block' : 'none' }}><AgentChatTab onNavigateTo={setActiveTab} /></div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SimulationProvider>
      <DashboardInner />
    </SimulationProvider>
  )
}
