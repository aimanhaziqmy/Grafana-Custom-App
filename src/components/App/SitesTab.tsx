import React, { useState } from 'react';
import { Button, Select, Input, useTheme2 } from '@grafana/ui';
import { getBackendSrv } from '@grafana/runtime';

interface Props {
  pluginId: string;
  sites: any[];
  onRefresh: () => void;
  onAddSite: () => void;
  fetchError: string | null;
}

export function SitesTab({ pluginId, sites, onRefresh, onAddSite, fetchError }: Props) {
  const theme = useTheme2();
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [siteFilterBrand, setSiteFilterBrand] = useState('ALL');

  const uniqueBrands = Array.from(new Set(sites.map(s => s.brand).filter(Boolean)));
  const brandOptions = [{ label: 'All Brands', value: 'ALL' }, ...uniqueBrands.map(b => ({ label: String(b), value: String(b) }))];

  const filteredSites = sites.filter(s => {
    const matchesSearch = !siteSearchQuery || 
      (s.code?.toLowerCase() || '').includes(siteSearchQuery.toLowerCase()) || 
      (s.name?.toLowerCase() || '').includes(siteSearchQuery.toLowerCase());
    const matchesBrand = siteFilterBrand === 'ALL' || s.brand === siteFilterBrand;
    return matchesSearch && matchesBrand;
  });

  const handleToggleMonitor = async (siteCode: string, currentStatus: string) => {
    const isActivating = currentStatus !== 'Active';
    const actionWord = isActivating ? 'ACTIVATE' : 'DEACTIVATE';
    
    if (window.confirm(`Are you sure you want to ${actionWord} the site: ${siteCode}?`)) {
      try {
        await getBackendSrv().post(`/api/plugins/${pluginId}/resources/sites/status`, {
          station_code: siteCode,
          is_monitored: isActivating
        });
        onRefresh(); 
      } catch (err) {
        alert("Failed to update database.");
      }
    }
  };

  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, color: theme.colors.text.secondary, marginBottom: '4px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Button variant="secondary" icon="sync" onClick={onRefresh}>Refresh Dashboard</Button>
          <Button variant="primary" icon="plus" onClick={onAddSite}>Add New Site</Button>
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
                <Button variant={s.status === 'Active' ? 'destructive' : 'success'} size="sm" onClick={() => handleToggleMonitor(s.code, s.status)}>
                  {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
