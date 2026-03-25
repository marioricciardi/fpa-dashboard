import { useState } from 'react'
import './App.css'
import Header from './components/Header.jsx'
import TabBar from './components/TabBar.jsx'
import OverviewTab     from './tabs/OverviewTab.jsx'
import PnLTab          from './tabs/PnLTab.jsx'
import VarianceTab     from './tabs/VarianceTab.jsx'
import ForecastTab     from './tabs/ForecastTab.jsx'
import BalanceSheetTab from './tabs/BalanceSheetTab.jsx'
import AgentChatTab   from './tabs/AgentChatTab.jsx'

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'pnl',           label: 'P&L' },
  { id: 'variance',      label: 'Variance' },
  { id: 'forecast',      label: 'Forecast' },
  { id: 'balancesheet',  label: 'Balance Sheet' },
  { id: 'agentchat',    label: 'Agent Chat' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  return (
    <div className="app">
      <Header />
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <main className="panel">
        {activeTab === 'overview'     && <OverviewTab />}
        {activeTab === 'pnl'          && <PnLTab />}
        {activeTab === 'variance'     && <VarianceTab />}
        {activeTab === 'forecast'     && <ForecastTab />}
        {activeTab === 'balancesheet' && <BalanceSheetTab />}
        {activeTab === 'agentchat'    && <AgentChatTab />}
      </main>
    </div>
  )
}
