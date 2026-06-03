import React, { useState } from 'react';
import { Button, Select, Input, useTheme2 } from '@grafana/ui';
import { EditExclusionsModal } from './EditExclusionsModal';

interface Props {
  pluginId: string; // We now need pluginId to pass to the modal
  inverters: any[];
  sites: any[];
  exclusionsData: any;
  onRefresh: () => void;
  fetchError: string | null;
}

export function InvertersTab({ pluginId, inverters, sites, exclusionsData, onRefresh, fetchError }: Props) {
  const theme = useTheme2();
  const [inverterSearchQuery, setInverterSearchQuery] = useState('');
  const [inverterFilterSite, setInverterFilterSite] = useState('ALL');
  const [inverterFilterConfigured, setInverterFilterConfigured] = useState('ALL');
  
  // State for controlling the Edit Modal
  const [editingInv, setEditingInv] = useState<any | null>(null);

  const filteredInverters = inverters.filter(inv => {
    const matchesSearch = !inverterSearchQuery || (inv.sn?.toLowerCase() || '').includes(inverterSearchQuery.toLowerCase());
    const matchesSite = inverterFilterSite === 'ALL' || inv.site === inverterFilterSite;
    
    const excludedArray = exclusionsData[inv.sn] || [];
    const isConfigured = excludedArray.length > 0;
    
    let matchesConfig = true;
    if (inverterFilterConfigured === 'CONFIGURED') matchesConfig = isConfigured;
    if (inverterFilterConfigured === 'NOT_CONFIGURED') matchesConfig = !isConfigured;

    return matchesSearch && matchesSite && matchesConfig;
  });

  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Button variant="secondary" icon="sync" onClick={onRefresh}>Refresh Dashboard</Button>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ width: '250px' }}>
            <div style={labelStyle}>Search Inverters</div>
            <Input placeholder="Search by Serial Number..." value={inverterSearchQuery} onChange={(e) => setInverterSearchQuery(e.currentTarget.value)} />
          </div>

          <div style={{ width: '200px' }}>
            <div style={labelStyle}>Filter by Site</div>
            <Select
              options={[{ label: 'All Sites', value: 'ALL' }, ...sites.map(s => ({ label: `${s.name} (${s.code})`, value: s.code }))]}
              value={inverterFilterSite}
              onChange={(v) => setInverterFilterSite(v.value!)}
            />
          </div>

          <div style={{ width: '180px' }}>
            <div style={labelStyle}>Filter by Rule</div>
            <Select
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Configured', value: 'CONFIGURED' },
                { label: 'Not Configured', value: 'NOT_CONFIGURED' }
              ]}
              value={inverterFilterConfigured}
              onChange={(v) => setInverterFilterConfigured(v.value!)}
            />
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
            <th>Active Strings</th>
            <th>Exclusion Rules</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInverters.length === 0 && !fetchError && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>No inverters found matching your criteria.</td></tr>
          )}
          {filteredInverters.map((inv, i) => {
            const excludedArray = exclusionsData[inv.sn] || [];
            const isConfigured = excludedArray.length > 0;
            const activeStrings = 40 - excludedArray.length; 

            return (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inv.sn}</td>
                <td style={{ color: theme.colors.primary.text }}>{inv.site}</td>
                <td>{inv.plant_name}</td>
                <td>{inv.brand}</td>
                <td>{inv.capacity}</td>
                <td style={{ fontWeight: 'bold' }}>{activeStrings}</td>
                <td>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 'bold',
                    background: isConfigured ? theme.colors.success.transparent : theme.colors.background.secondary,
                    color: isConfigured ? theme.colors.success.text : theme.colors.text.secondary
                  }}>
                    {isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditingInv(inv)}>
                    Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Render the Edit Modal safely */}
      <EditExclusionsModal 
        isOpen={!!editingInv}
        onClose={() => setEditingInv(null)}
        onSuccess={onRefresh}
        pluginId={pluginId}
        inverter={editingInv}
        initialExclusions={editingInv ? (exclusionsData[editingInv.sn] || []) : []}
      />
    </div>
  );
}