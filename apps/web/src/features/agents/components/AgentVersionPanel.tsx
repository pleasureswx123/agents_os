import { useEffect, useState } from 'react';
import { createAgentVersion, listAgentVersions, type AgentVersion } from '../api';

interface AgentVersionPanelProps {
  agentId: string;
}

export function AgentVersionPanel({ agentId }: AgentVersionPanelProps) {
  const [versions, setVersions] = useState<AgentVersion[]>([]);

  async function loadVersions() {
    const response = await listAgentVersions(agentId);
    setVersions(response.items);
  }

  useEffect(() => {
    void loadVersions();
  }, [agentId]);

  async function saveVersion() {
    await createAgentVersion(agentId, `version-${Date.now()}`);
    await loadVersions();
  }

  return (
    <div className="panel-stack">
      <button type="button" onClick={saveVersion}>
        Save Version
      </button>
      <div className="table-list">
        {versions.map((version) => (
          <div className="row" key={version.id}>
            <span>{version.versionName}</span>
            <span>{new Date(version.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
