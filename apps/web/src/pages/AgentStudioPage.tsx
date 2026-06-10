import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgentChatPanel } from '../features/agents/components/AgentChatPanel';
import { AgentConfigPanel } from '../features/agents/components/AgentConfigPanel';
import { AgentList } from '../features/agents/components/AgentList';
import { AgentVersionPanel } from '../features/agents/components/AgentVersionPanel';
import { getAgent, listAgents, updateAgent, type Agent, type AgentConfig } from '../features/agents/api';
import { useAgentStudioStore } from '../features/agents/store';

export function AgentStudioPage() {
  const { projectId, agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [draftConfig, setDraftConfig] = useState<AgentConfig | null>(null);
  const { selectedTab, setSelectedTab } = useAgentStudioStore();

  useEffect(() => {
    async function loadAgents() {
      if (!projectId) return;
      const response = await listAgents(projectId);
      setAgents(response.items);
      const firstAgentId = agentId ?? response.items[0]?.id;
      if (firstAgentId && !agentId) {
        navigate(`/projects/${projectId}/agents/${firstAgentId}`, { replace: true });
      }
    }

    void loadAgents();
  }, [agentId, navigate, projectId]);

  useEffect(() => {
    async function loadAgent() {
      if (!agentId) return;
      const response = await getAgent(agentId);
      setSelectedAgent(response);
      setDraftConfig(response.draftConfig);
    }

    void loadAgent();
  }, [agentId]);

  const selectedAgentName = useMemo(() => selectedAgent?.name ?? 'Agent Studio', [selectedAgent]);

  async function saveConfig() {
    if (!selectedAgent || !draftConfig) return;
    const response = await updateAgent(selectedAgent.id, { draftConfig });
    setSelectedAgent(response);
  }

  return (
    <main className="studio-shell">
      <AgentList
        agents={agents}
        selectedAgentId={selectedAgent?.id}
        onSelect={(nextAgentId) => navigate(`/projects/${projectId}/agents/${nextAgentId}`)}
      />
      <section className="studio-main">
        <header className="studio-header">
          <h1>{selectedAgentName}</h1>
        </header>
        {selectedAgent ? <AgentChatPanel agentId={selectedAgent.id} /> : null}
      </section>
      <aside className="studio-side">
        <div className="tabs">
          <button type="button" onClick={() => setSelectedTab('config')}>
            Config
          </button>
          <button type="button" onClick={() => setSelectedTab('versions')}>
            Versions
          </button>
          <button type="button" onClick={() => setSelectedTab('testCases')}>
            Test Cases
          </button>
        </div>
        {selectedTab === 'config' && draftConfig ? (
          <AgentConfigPanel config={draftConfig} onChange={setDraftConfig} onSave={saveConfig} />
        ) : null}
        {selectedTab === 'versions' && selectedAgent ? <AgentVersionPanel agentId={selectedAgent.id} /> : null}
        {selectedTab === 'testCases' ? <p className="message">测试用例将在 Evaluation Lab 中管理。</p> : null}
      </aside>
    </main>
  );
}
