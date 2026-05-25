import React, { useState } from 'react';
import { Button, Select, Input, Field, useTheme2 } from '@grafana/ui';
import { getBackendSrv } from '@grafana/runtime';

interface Props {
  pluginId: string;
  sites: any[];
  inverters: any[];
  exclusionsData: any;
  onRefresh: () => void;
}

export function ExclusionsTab({ pluginId, sites, inverters, exclusionsData, onRefresh }: Props) {
  const theme = useTheme2();
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedInv, setSelectedInv] = useState('');
  const [currentExclusions, setCurrentExclusions] = useState<number[]>([]);
  const [remarks, setRemarks] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const toggleString = (num: number) => {
    setCurrentExclusions(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b));
  };

  const handleSave = async () => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/resources/exclusions`, {
        site_code: selectedSite,
        inverter_sn: selectedInv,
        excluded_strings: currentExclusions,
        remarks: remarks
      });
      setSaveStatus('Success! Database updated.');
      onRefresh(); 
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Error: Failed to save to database.');
    }
  };

  return (
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
        <div style={{ background: 'transparent', padding: '20px', border: `1px solid ${theme.colors.border.weak}`, borderRadius: theme.shape.radius.default }}>
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
            <Button variant="primary" icon="save" onClick={handleSave}>Save Exclusions</Button>
            {saveStatus && <span style={{ color: saveStatus.includes('Success') ? theme.colors.success.text : theme.colors.error.text, fontWeight: 'bold' }}>{saveStatus}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
