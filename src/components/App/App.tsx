import React, { useState, useEffect } from 'react';
import { AppRootProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { TabsBar, Tab, TabContent, Modal, Button, Select, Input, Field, Alert, useTheme2 } from '@grafana/ui';

export function App(props: AppRootProps) {
  const pluginId = props.meta.id;
  const theme = useTheme2(); // Using Grafana's native theme engine for seamless colors
  
  const [activeTab, setActiveTab] = useState('sites');
  
  const [sites, setSites] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [exclusionsData, setExclusionsData] = useState<any>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [siteFilterBrand, setSiteFilterBrand] = useState('ALL');
  
  const [inverterSearchQuery, setInverterSearchQuery] = useState('');
  const [inverterFilterSite, setInverterFilterSite] = useState('ALL');
  
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSiteBrand, setNewSiteBrand] = useState('');
  const [newSiteIdentifier, setNewSiteIdentifier] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<{type: string, msg: string} | null>(null);

  const [selectedSite, setSelectedSite] = useState('');
  const [selectedInv, setSelectedInv] = useState('');
  const [currentExclusions, setCurrentExclusions] = useState<number[]>([]);
  const [remarks, setRemarks] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

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

  useEffect(() => { fetchData(); }, []);

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

      const res = await fetch(url, { method: 'GET' });
      
      if (res.ok) {
        setWebhookStatus({ type: 'success', msg: `Successfully triggered ${newSiteBrand} webhook!` });
        setTimeout(() => {
          setIsAddSiteOpen(false);
          fetchData();
        }, 2000);
      } else {
        setWebhookStatus({ type: 'error', msg: `Webhook failed with status: ${res.status}` });
      }
    } catch (err: any) {
      setWebhookStatus({ type: 'error', msg: `Network Error: ${err.message}` });
    }
  };

  // ---> NEW: Toggle Status Logic <---
  const handleToggleMonitor = async (siteCode: string, currentStatus: string) => {
    const isActivating = currentStatus !== 'Active';
    const actionWord = isActivating ? 'ACTIVATE' : 'DEACTIVATE';
    
    // Safety Prompt
    if (window.confirm(`Are you sure you want to ${actionWord} the site: ${siteCode}?`)) {
      try {
        await getBackendSrv().post(`/api/plugins/${pluginId}/resources/sites/status`, {
          station_code: siteCode,
          is_monitored: isActivating
        });
        fetchData(); // Instantly refresh table to show new status
      } catch (err: any) {
        const errorMessage = err.data?.error || "Failed to update database.";
        setFetchError(`Status Update Failed: ${errorMessage}`);
      }
    }
  };

  const handleSaveExclusions = async () => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/resources/exclusions`, {
        site_code: selectedSite,
        inverter_sn: selectedInv,
        excluded_strings: currentExclusions,
        remarks: remarks
      });
      setSaveStatus('Success! Database updated.');
      fetchData(); 
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err: any) {
      const errorMessage = err.data?.error || "Failed to save to database.";
      setSaveStatus(`Error: ${errorMessage}`);
    }
  };

  const toggleString = (num: number) => {
    setCurrentExclusions(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b)
    );
  };

  const uniqueBrands = Array.from(new Set(sites.map(s => s.brand).filter(Boolean)));
  const brandOptions = [
    { label: 'All Brands', value: 'ALL' },
    ...uniqueBrands.map(brand => ({ label: String(brand), value: String(brand) }))
  ];

  const filteredSites = sites.filter(s => {
    const matchesSearch = !siteSearchQuery || 
      (s.code?.toLowerCase() || '').includes(siteSearchQuery.toLowerCase()) || 
      (s.name?.toLowerCase() || '').includes(siteSearchQuery.toLowerCase());
    const matchesBrand = siteFilterBrand === 'ALL' || s.brand === siteFilterBrand;
    return matchesSearch && matchesBrand;
  });

  const filteredInverters = inverters.filter(inv => {
    const matchesSearch = !inverterSearchQuery ||
      (inv.sn?.toLowerCase() || '').includes(inverterSearchQuery.toLowerCase());
    const matchesSite = inverterFilterSite === 'ALL' || inv.site === inverterFilterSite;
    return matchesSearch && matchesSite;
  });

  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' };

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
          
          {/* ================= SITES TAB ================= */}
          {activeTab === 'sites' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <Button variant="secondary" icon="sync" onClick={fetchData}>Refresh Dashboard</Button>
                  <Button variant="primary" icon="plus" onClick={() => setIsAddSiteOpen(true)}>Add New Site</Button>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                  <div style={{ width: '200px' }}>
                    <div style={labelStyle}>Filter by Brand</div>
                    <Select options={brandOptions} value={siteFilterBrand} onChange={(v) => setSiteFilterBrand(v.value!)} />
                  </div>
                  <div style={{ width: '250px' }}>
                    <div style={labelStyle}>Search Sites</div>
                    <Input placeholder="Search Code or Name..." value={siteSearchQuery} onChange={(e) => setSiteSearchQuery(e.currentTarget.value)} />
                  </div>
                </div>
              </div>

              <table className="filter-table form-inline">
                <thead>
                  <tr>
                    <th>Station Code</th>
                    <th>Plant Name</th>
                    <th>Brand</th>
                    <th>Capacity</th>
                    <th>Is Monitored</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.length === 0 && !fetchError && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No sites found matching your criteria.</td></tr>
                  )}
                  {filteredSites.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: theme.colors.primary.text, fontWeight: 'bold' }}>{s.code}</td>
                      <td>{s.name}</td>
                      <td>{s.brand}</td>
                      <td>{s.capacity}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 'bold',
                          background: s.status === 'Active' ? theme.colors.success.transparent : theme.colors.error.transparent,
                          color: s.status === 'Active' ? theme.colors.success.text : theme.colors.error.text
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {/* ---> NEW: Actions Button <--- */}
                        <Button 
                          variant={s.status === 'Active' ? 'destructive' : 'success'} 
                          size="sm" 
                          onClick={() => handleToggleMonitor(s.code, s.status)}
                        >
                          {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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

                {webhookStatus && <Alert severity={webhookStatus.type as any} title="">{webhookStatus.msg}</Alert>}

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setIsAddSiteOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleAddSite} disabled={!newSiteBrand || (!newSiteIdentifier && newSiteBrand !== 'Huawei')}>
                    {newSiteBrand === 'Huawei' ? 'Trigger Sync' : 'Add Site'}
                  </Button>
                </div>
              </Modal>
            </div>
          )}

          {/* ================= INVERTERS TAB ================= */}
          {activeTab === 'inverters' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <Button variant="secondary" icon="sync" onClick={fetchData}>Refresh Dashboard</Button>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                  <div style={{ width: '250px' }}>
                    <div style={labelStyle}>Filter by Site</div>
                    <Select
                      options={[
                        { label: 'All Sites', value: 'ALL' },
                        ...sites.map(s => ({ label: `${s.name} (${s.code})`, value: s.code }))
                      ]}
                      value={inverterFilterSite}
                      onChange={(v) => setInverterFilterSite(v.value!)}
                    />
                  </div>
                  <div style={{ width: '250px' }}>
                    <div style={labelStyle}>Search Inverters</div>
                    <Input placeholder="Search by Serial Number..." value={inverterSearchQuery} onChange={(e) => setInverterSearchQuery(e.currentTarget.value)} />
                  </div>
                </div>
              </div>

              <table className="filter-table form-inline">
                <thead>
                  <tr>
                    <th>Inverter SN</th>
                    <th>Station Code</th>
                    <th>Plant Name</th>
                    <th>Brand</th>
                    <th>DC Capacity (kWp)</th>
                    <th>Associated Strings</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInverters.length === 0 && !fetchError && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No inverters found matching your criteria.</td></tr>
                  )}
                  {filteredInverters.map((inv, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inv.sn}</td>
                      <td style={{ color: theme.colors.primary.text }}>{inv.site}</td>
                      <td>{inv.plant_name}</td>
                      <td>{inv.brand}</td>
                      <td>{inv.capacity}</td>
                      <td>{inv.strings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= EXCLUSIONS TAB ================= */}
          {activeTab === 'exclusions' && (
            <div style={{ maxWidth: '800px', background: 'transparent' }}>
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
                <div style={{ 
                  background: 'transparent', 
                  padding: '20px', 
                  border: `1px solid ${theme.colors.border.weak}`, 
                  borderRadius: theme.shape.radius.default 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0 }}>Configure Excluded Strings</h4>
                    <span style={{ color: theme.colors.warning.text, fontFamily: 'monospace', fontWeight: 'bold' }}>
                      Excluded: {currentExclusions.length > 0 ? currentExclusions.join(', ') : 'None'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px', marginBottom: '20px' }}>
                    {Array.from({ length: 40 }, (_, i) => i + 1).map(num => {
                      const isEx = currentExclusions.includes(num);
                      return (
                        <button
                          key={num}
                          onClick={() => toggleString(num)}
                          style={{
                            height: '40px', 
                            background: isEx ? theme.colors.error.transparent : theme.colors.background.secondary,
                            border: `1px solid ${isEx ? theme.colors.error.border : theme.colors.border.weak}`,
                            color: isEx ? theme.colors.error.text : theme.colors.text.secondary,
                            borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer'
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
                    {saveStatus && <span style={{ color: saveStatus.includes('Success') ? theme.colors.success.text : theme.colors.error.text, fontWeight: 'bold' }}>{saveStatus}</span>}
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
