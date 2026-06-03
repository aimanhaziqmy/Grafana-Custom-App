import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Field, useTheme2 } from '@grafana/ui';
import { getBackendSrv } from '@grafana/runtime';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pluginId: string;
  inverter: any;
  initialExclusions: number[];
}

export function EditExclusionsModal({ isOpen, onClose, onSuccess, pluginId, inverter, initialExclusions }: Props) {
  const theme = useTheme2();
  const [currentExclusions, setCurrentExclusions] = useState<number[]>([]);
  const [remarks, setRemarks] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Reset the modal state whenever it opens for a new inverter
  useEffect(() => {
    if (isOpen && inverter) {
      setCurrentExclusions(initialExclusions || []);
      setRemarks('');
      setSaveStatus('');
    }
  }, [isOpen, inverter, initialExclusions]);

  const toggleString = (num: number) => {
    setCurrentExclusions(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b));
  };

  const handleSave = async () => {
    try {
      await getBackendSrv().post(`/api/plugins/${pluginId}/resources/exclusions`, {
        site_code: inverter.site,
        inverter_sn: inverter.sn,
        excluded_strings: currentExclusions,
        remarks: remarks
      });
      setSaveStatus('Success! Database updated.');
      onSuccess(); // Refresh the parent table data
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setSaveStatus('Error: Failed to save to database.');
    }
  };

  if (!inverter) return null;

  return (
    <Modal title={`Edit String Exclusions`} isOpen={isOpen} onDismiss={onClose}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ color: theme.colors.text.secondary }}>
            Inverter: <strong style={{ color: theme.colors.text.primary, fontFamily: 'monospace' }}>{inverter.sn}</strong> 
            &nbsp; | &nbsp; Site: <strong style={{ color: theme.colors.text.primary }}>{inverter.site}</strong>
          </span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="save" onClick={handleSave}>Save Exclusions</Button>
          {saveStatus && <span style={{ color: saveStatus.includes('Success') ? theme.colors.success.text : theme.colors.error.text, fontWeight: 'bold' }}>{saveStatus}</span>}
        </div>
      </div>
    </Modal>
  );
}