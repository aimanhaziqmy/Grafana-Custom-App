import React, { useState, useEffect } from 'react';
import { AppRootProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { TabsBar, Tab, TabContent, Modal, Button, Select, Input, Field, Alert } from '@grafana/ui';

export function App(props: AppRootProps) {
  // 1. DYNAMICALLY GET THE PLUGIN ID (Fixes the "Plugin not found" error)
  const pluginId = props.meta.id;
  
  const [activeTab, setActiveTab] = useState('sites');
  
  // Data State
  const [sites, setSites] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [exclusionsData, setExclusionsData] = useState<any>({});
  
  // Modal & Form State
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSiteBrand, setNewSiteBrand] = useState('');
  const [newSiteIdentifier, setNewSiteIdentifier] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<{type: string, msg: string} | null>(null);

  // Exclusions Tab State
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedInv, setSelectedInv] = useState('');
  const [currentExclusions, setCurrentExclusions] = useState<number[]>([]);
  const [remarks, setRemarks] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // 2. Fetch Initial Data using the dynamic pluginId
  const fetchData = async () => {
    try {
      const s = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/sites`);
      const i = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/inverters`);
      const e = await getBackendSrv().get(`/api/plugins/${pluginId}/resources/exclusions`);
      setSites(s || []);
      setInverters(i || []);
      setExclusionsData(e || {});
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 3. Add Site Webhook Logic
  const handleAddSite = async () => {
    setWebhookStatus(null);
    try {
      let url = '';
      if (newSiteBrand === 'Huawei') {
        url = 'https://ersn8n.freeddns.org/webhook/huawei-sync-pdr-site';
      } else if (newSiteBrand === 'Goodwe') {
        url = `https://ersn8n.freeddns.org/webhook/goodwe-sync-pdr-site?site_id=${newSiteIdentifier}`;
      } else if (newSiteBrand === 'Sungrow') {
        url = `https://ersn8n.freeddns.org/webhook/sungrow-sync-pdr-site?site_name=${newSiteIdentifier}`;
      }

      // Call n8n webhook directly from frontend
      const res = await fetch(url, { method: 'GET' });
      
      if (res.ok) {
        setWebhookStatus({ type: 'success', msg: `Successfully triggered ${newSiteBrand} webhook!` });
        setTimeout(() => setIsAddSiteOpen(false), 2000);
      } else {
        setWebhookStatus({ type: 'error', msg: `Webhook failed with status: ${res.status}` });
      }
    } catch (err: any) {
      setWebhookStatus({ type: 'error', msg: `Network Error: ${err.message}` });
    }
  };

  // 4. Save Exclusions Logic using dynamic pluginId
  const handleSaveExclusions = async () => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/resources/exclusions`, {
        site_code: selectedSite,
        inverter_sn: selectedInv,
        excluded_strings: currentExclusions,
        remarks: remarks
      });
      setSaveStatus('Success! Database updated.');
      fetchData(); // Refresh state
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Failed to save to database.');
    }
  };

  const toggleString = (num: number) => {
    setCurrentExclusions(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b)
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>O&M Integration Hub</h2>

      {/* TABS */}
      <TabsBar>
        <Tab label="Sites & Stations" active={activeTab === 'sites'} onChangeTab={() => setActiveTab('sites')} />
        <Tab label="Inverter Management" active={activeTab === 'inverters'} onChangeTab={() => setActiveTab('inverters')} />
        <Tab label="String Exclusions" active={activeTab === 'exclusions'} onChangeTab={() => setActiveTab('exclusions')} />
      </TabsBar>

      <TabContent>
        <div style={{ marginTop: '20px' }}>
          
          {/* ================= SITES TAB ================= */}
          {activeTab === 'sites' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Button variant="secondary" icon="sync" onClick={fetchData}>Sync Database</Button>
                <Button variant="primary" icon="plus" onClick={() => setIsAddSiteOpen(true)}>Add New Site</Button>
              </div>

              <table className="filter-table form-inline">
                <thead>
                  <tr>
                    <th>Station Code</th>
                    <th>Plant Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: '#3274d9', fontWeight: 'bold' }}>{s.code}</td>
                      <td>{s.name}</td>
                      <td>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* NATIVE GRAFANA MODAL */}
              <Modal title="Add New Site" isOpen={isAddSiteOpen} onDismiss={() => setIsAddSiteOpen(false)}>
                <Field label="Inverter Brand System">
                  <Select 
                    options={[
                      { label: 'Huawei', value: 'Huawei' },
                      { label: 'Goodwe', value: 'Goodwe' },
                      { label: 'Sungrow', value: 'Sungrow' }
                    ]}
                    value={newSiteBrand}
                    onChange={(v) => { setNewSiteBrand(v.value!); setNewSiteIdentifier(''); }}
                  />
                </Field>

                {newSiteBrand === 'Huawei' && (
                  <Alert severity="info" title="Huawei Synchronization">
                    Huawei sites are discovered automatically. Click Trigger Sync to run the webhook.
                  </Alert>
                )}
                {newSiteBrand === 'Goodwe' && (
                  <Field label="Goodwe Site ID" description="Enter the alphanumeric Site ID">
                    <Input value={newSiteIdentifier} onChange={(e) => setNewSiteIdentifier(e.currentTarget.value)} />
                  </Field>
                )}
                {newSiteBrand === 'Sungrow' && (
                  <Field label="Sungrow Site Name" description="Enter the exact Site Name from iSolarCloud">
                    <Input value={newSiteIdentifier} onChange={(e) => setNewSiteIdentifier(e.currentTarget.value)} />
                  </Field>
                )}

                {webhookStatus && (
                   <Alert severity={webhookStatus.type as any} title="">{webhookStatus.msg}</Alert>
                )}

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setIsAddSiteOpen(false)}>Cancel</Button>
                  <Button 
                    variant="primary" 
                    onClick={handleAddSite}
                    disabled={!newSiteBrand || (!newSiteIdentifier && newSiteBrand !== 'Huawei')}
                  >
                    {newSiteBrand === 'Huawei' ? 'Trigger Sync' : 'Add Site'}
                  </Button>
                </div>
              </Modal>
            </div>
          )}

          {/* ================= INVERTERS TAB ================= */}
          {activeTab === 'inverters' && (
             <table className="filter-table form-inline">
               <thead>
                 <tr>
                   <th>Inverter SN</th>
                   <th>Station</th>
                   <th>Associated Strings</th>
                 </tr>
               </thead>
               <tbody>
                 {inverters.map((inv, i) => (
                   <tr key={i}>
                     <td style={{ fontFamily: 'monospace' }}>{inv.sn}</td>
                     <td>{inv.site}</td>
                     <td>{inv.strings}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}

          {/* ================= EXCLUSIONS TAB ================= */}
          {activeTab === 'exclusions' && (
            <div style={{ maxWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <Field label="1. Select Site">
                  <Select 
                    options={sites.map(s => ({ label: s.name, value: s.code }))}
                    value={selectedSite}
                    onChange={(v) => {
                      setSelectedSite(v.value!);
                      setSelectedInv('');
                      setCurrentExclusions([]);
                    }}
                  />
                </Field>
                <Field label="2. Select Inverter">
                  <Select 
                    options={inverters.filter(i => i.site === selectedSite).map(i => ({ label: i.sn, value: i.sn }))}
                    value={selectedInv}
                    onChange={(v) => {
                      const sn = v.value!;
                      setSelectedInv(sn);
                      setCurrentExclusions(exclusionsData[sn] || []);
                    }}
                    disabled={!selectedSite}
                  />
                </Field>
              </div>

              {selectedInv && (
                <div style={{ background: '#181b1f', padding: '20px', border: '1px solid #2c3235', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0 }}>Configure Excluded Strings</h4>
                    <span style={{ color: '#e8823a', fontFamily: 'monospace' }}>
                      Excluded: {currentExclusions.length > 0 ? currentExclusions.join(', ') : 'None'}
                    </span>
                  </div>

                  {/* 40 STRING GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px', marginBottom: '20px' }}>
                    {Array.from({ length: 40 }, (_, i) => i + 1).map(num => {
                      const isEx = currentExclusions.includes(num);
                      return (
                        <button
                          key={num}
                          onClick={() => toggleString(num)}
                          style={{
                            height: '40px',
                            background: isEx ? '#5e1f26' : '#22252b',
                            border: `1px solid ${isEx ? '#e02f44' : '#2c3235'}`,
                            color: isEx ? '#ffccd2' : '#8e98a5',
                            borderRadius: '3px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  <Field label="Remarks / Reason for Exclusion">
                    <Input value={remarks} onChange={(e) => setRemarks(e.currentTarget.value)} placeholder="Pending maintenance..." />
                  </Field>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Button variant="primary" icon="save" onClick={handleSaveExclusions}>Save Exclusions</Button>
                    {saveStatus && <span style={{ color: saveStatus.includes('Success') ? '#73bf69' : '#e02f44' }}>{saveStatus}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </TabContent>
    </div>
  );
}
