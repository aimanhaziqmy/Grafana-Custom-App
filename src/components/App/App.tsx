import React, { useState, useEffect } from 'react';
import { AppRootProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { TabsBar, Tab, TabContent, Alert } from '@grafana/ui';

// Import our refactored components
import { SitesTab } from './SitesTab';
import { InvertersTab } from './InvertersTab';
import { ExclusionsTab } from './ExclusionsTab';
import { AddSiteModal } from './AddSiteModal';

export function App(props: AppRootProps) {
  const pluginId = props.meta.id;
  const [activeTab, setActiveTab] = useState('sites');
  
  // Global Data State
  const [sites, setSites] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [exclusionsData, setExclusionsData] = useState<any>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Modal State
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);

  const fetchData = async () => {
    setFetchError(null);
    try {
      const s = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/sites`);
      const i = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/inverters`);
      const e = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/exclusions`);
      
      setSites(s || []);
      setInverters(i || []);
      setExclusionsData(e || {});
    } catch (err: any) {
      console.error("Backend Error:", err);
      const errorMessage = err.data?.error || err.message || "Unknown network error";
      setFetchError(`Database Connection Failed: ${errorMessage}`);
    }
  };

  // Fetch data on load
  useEffect(() => { fetchData(); }, []);

  return (
    <div style={{ padding: '20px', background: 'transparent' }}>
      <h2 style={{ marginBottom: '20px' }}>O&M Integration Hub</h2>

      <TabsBar>
        <Tab label="Sites & Stations" active={activeTab === 'sites'} onChangeTab={() => setActiveTab('sites')} />
        <Tab label="Inverter Management" active={activeTab === 'inverters'} onChangeTab={() => setActiveTab('inverters')} />
        <Tab label="String Exclusions" active={activeTab === 'exclusions'} onChangeTab={() => setActiveTab('exclusions')} />
      </TabsBar>

      <TabContent>
        <div style={{ marginTop: '25px', background: 'transparent' }}>
          
          {fetchError && (
            <div style={{ marginBottom: '20px' }}>
              <Alert severity="error" title="Backend Error">{fetchError}</Alert>
            </div>
          )}
          
          {activeTab === 'sites' && (
            <SitesTab 
              pluginId={pluginId} 
              sites={sites} 
              fetchError={fetchError} 
              onRefresh={fetchData} 
              onAddSite={() => setIsAddSiteOpen(true)} 
            />
          )}

          {activeTab === 'inverters' && (
            <InvertersTab 
              inverters={inverters} 
              sites={sites} 
              exclusionsData={exclusionsData} 
              fetchError={fetchError} 
              onRefresh={fetchData} 
            />
          )}

          {activeTab === 'exclusions' && (
            <ExclusionsTab 
              pluginId={pluginId} 
              sites={sites} 
              inverters={inverters} 
              exclusionsData={exclusionsData} 
              onRefresh={fetchData} 
            />
          )}

        </div>
      </TabContent>

      <AddSiteModal 
        isOpen={isAddSiteOpen} 
        onClose={() => setIsAddSiteOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
