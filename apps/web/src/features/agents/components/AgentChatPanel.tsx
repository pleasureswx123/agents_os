import { FormEvent, useState } from 'react';
import { chatWithAgent } from '../api';

interface AgentChatPanelProps {
  agentId: string;
}

export function AgentChatPanel({ agentId }: AgentChatPanelProps) {
  const [text, setText] = useState('这里是一段故事文本');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    const response = await chatWithAgent(agentId, { text });
    setResult(response.output as Record<string, unknown>);
    setRawText(response.rawText);
    setParseError(response.parseError);
    setUsage(response.usage);
  }

  return (
    <section className="chat-panel">
      <form onSubmit={send}>
        <textarea aria-label="Chat input" value={text} onChange={(event) => setText(event.target.value)} />
        <button type="submit">Send Test</button>
      </form>
      <div className="output-box" aria-label="Chat output">
        {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
        {rawText ? <pre>{rawText}</pre> : null}
        {parseError ? <p>{parseError}</p> : null}
        {usage ? <small>usage: {JSON.stringify(usage)}</small> : null}
      </div>
    </section>
  );
}
