import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAgent, listAgentVersions, type AgentVersion } from '../features/agents/api';
import { createTestCase, listTestCases, listTestResults, runTestCase, scoreTestResult, type TestCase, type TestResult } from '../features/evaluations/api';
import { TestCaseList } from '../features/evaluations/components/TestCaseList';
import { TestResultCompare } from '../features/evaluations/components/TestResultCompare';

export function EvaluationLabPage() {
  const { agentId } = useParams();
  const [agentName, setAgentName] = useState('Evaluation Lab');
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>();
  const [results, setResults] = useState<TestResult[]>([]);
  const [inputText, setInputText] = useState('雨夜，主角发现密信。');

  async function load() {
    if (!agentId) return;
    const [agent, versionResponse, caseResponse] = await Promise.all([
      getAgent(agentId),
      listAgentVersions(agentId),
      listTestCases(agentId)
    ]);
    setAgentName(agent.name);
    setVersions(versionResponse.items);
    setTestCases(caseResponse.items);
    const firstCaseId = selectedCaseId ?? caseResponse.items[0]?.id;
    setSelectedCaseId(firstCaseId);
    if (firstCaseId) {
      const resultResponse = await listTestResults(firstCaseId);
      setResults(resultResponse.items);
    }
  }

  useEffect(() => {
    void load();
  }, [agentId]);

  async function addCase(event: FormEvent) {
    event.preventDefault();
    if (!agentId) return;
    const created = await createTestCase(agentId, {
      name: `case-${Date.now()}`,
      input: { text: inputText }
    });
    setSelectedCaseId(created.id);
    await load();
  }

  async function runSelectedCase() {
    if (!selectedCaseId || versions.length === 0) return;
    await runTestCase(selectedCaseId, versions[0].id);
    const resultResponse = await listTestResults(selectedCaseId);
    setResults(resultResponse.items);
  }

  async function score(resultId: string, rating: string) {
    await scoreTestResult(resultId, rating);
    if (selectedCaseId) {
      const resultResponse = await listTestResults(selectedCaseId);
      setResults(resultResponse.items);
    }
  }

  return (
    <main className="studio-shell">
      <TestCaseList
        testCases={testCases}
        selectedId={selectedCaseId}
        onSelect={async (nextId) => {
          setSelectedCaseId(nextId);
          const resultResponse = await listTestResults(nextId);
          setResults(resultResponse.items);
        }}
      />
      <section className="studio-main">
        <header className="studio-header">
          <h1>{agentName}</h1>
        </header>
        <form className="chat-panel" onSubmit={addCase}>
          <textarea aria-label="Test input" value={inputText} onChange={(event) => setInputText(event.target.value)} />
          <button type="submit">Create Test Case</button>
        </form>
        <button type="button" onClick={runSelectedCase}>
          Run Selected Case
        </button>
      </section>
      <aside className="studio-side">
        <h2>Version Compare</h2>
        <TestResultCompare results={results} onScore={score} />
      </aside>
    </main>
  );
}
