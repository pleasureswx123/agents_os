import type { AgentConfig } from '../api';
import { MonacoJsonEditor } from './MonacoJsonEditor';

interface AgentConfigPanelProps {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
  onSave: () => void;
}

export function AgentConfigPanel({ config, onChange, onSave }: AgentConfigPanelProps) {
  function updateJsonField(field: keyof AgentConfig, value?: string) {
    try {
      onChange({ ...config, [field]: JSON.parse(value || '{}') });
    } catch {
      // Keep invalid editor text local to Monaco until it becomes valid JSON.
    }
  }

  return (
    <div className="panel-stack">
      <label>
        System Prompt
        <textarea
          aria-label="System Prompt"
          value={config.systemPrompt}
          onChange={(event) => onChange({ ...config, systemPrompt: event.target.value })}
        />
      </label>
      <label>
        Runtime Params
        <MonacoJsonEditor
          height="120px"
          value={JSON.stringify(config.runtimeParams, null, 2)}
          onChange={(value) => updateJsonField('runtimeParams', value)}
        />
      </label>
      <label>
        Input Schema
        <MonacoJsonEditor
          height="150px"
          value={JSON.stringify(config.inputSchema, null, 2)}
          onChange={(value) => updateJsonField('inputSchema', value)}
        />
      </label>
      <label>
        Output Schema
        <MonacoJsonEditor
          height="150px"
          value={JSON.stringify(config.outputSchema, null, 2)}
          onChange={(value) => updateJsonField('outputSchema', value)}
        />
      </label>
      <button type="button" onClick={onSave}>
        Save Config
      </button>
    </div>
  );
}
