import type { Agent } from '../api';

interface AgentListProps {
  agents: Agent[];
  selectedAgentId?: string;
  onSelect: (agentId: string) => void;
}

export function AgentList({ agents, selectedAgentId, onSelect }: AgentListProps) {
  return (
    <aside className="agent-list" aria-label="Agent list">
      {agents.map((agent) => (
        <button
          className={agent.id === selectedAgentId ? 'agent-list-item active' : 'agent-list-item'}
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          type="button"
        >
          {agent.name}
        </button>
      ))}
    </aside>
  );
}
