import { appTabs, type AppTab } from '../hooks/useRestaurantStore';
import type { AuthSession } from '../types/auth';
import type { Branch, SyncStatus } from '../types/models';

interface Props {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  branches: Branch[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  syncStatus: SyncStatus;
  pendingWrites: number;
  toast: string;
  session: AuthSession;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Shell({ activeTab, setActiveTab, branches, activeBranchId, setActiveBranchId, syncStatus, pendingWrites, toast, session, onLogout, children }: Props) {
  const visibleTabs = session.role === 'admin' ? appTabs : appTabs.filter((tab) => ['Dashboard', 'POS', 'Loyalty'].includes(tab));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">LC</div>
          <div><strong>Loader Castle</strong><span>Restaurant POS</span></div>
        </div>
        <nav>
          {visibleTabs.map((tab) => (
            <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeTab}</h1>
            <p>{toast}</p>
          </div>
          <div className="topbar-controls">
            <select value={activeBranchId} onChange={(event) => setActiveBranchId(event.target.value)} aria-label="Active branch">
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <span className={`sync-pill ${syncStatus}`}>{syncStatus}</span>
            <span className="sync-pill pending">{pendingWrites} pending</span>
            <span className="sync-pill role">{session.role}</span>
            <button className="logout-button" onClick={onLogout}>Logout</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
