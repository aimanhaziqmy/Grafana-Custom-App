import React, { useState } from 'react';
import { Modal, Button, Select, Input, Field, Alert } from '@grafana/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSiteModal({ isOpen, onClose, onSuccess }: Props) {
  const [newSiteBrand, setNewSiteBrand] = useState('');
  const [newSiteIdentifier, setNewSiteIdentifier] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<{type: string, msg: string} | null>(null);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setNewSiteBrand('');
      setNewSiteIdentifier('');
      setWebhookStatus(null);
    }, 300);
  };

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
          handleClose();
          onSuccess();
        }, 3000);
      } else {
        setWebhookStatus({ type: 'error', msg: `Webhook failed with status: ${res.status}` });
      }
    } catch (err: any) {
      setWebhookStatus({ type: 'error', msg: `Network Error: ${err.message}` });
    }
  };

  return (
    <Modal title="Add New Site" isOpen={isOpen} onDismiss={handleClose}>
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
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" onClick={handleAddSite} disabled={!newSiteBrand || (!newSiteIdentifier && newSiteBrand !== 'Huawei')}>
          {newSiteBrand === 'Huawei' ? 'Trigger Sync' : 'Add Site'}
        </Button>
      </div>
    </Modal>
  );
}
