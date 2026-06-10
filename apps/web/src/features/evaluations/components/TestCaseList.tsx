import type { TestCase } from '../api';

interface TestCaseListProps {
  testCases: TestCase[];
  selectedId?: string;
  onSelect: (testCaseId: string) => void;
}

export function TestCaseList({ testCases, selectedId, onSelect }: TestCaseListProps) {
  return (
    <aside className="agent-list" aria-label="Test case list">
      {testCases.map((testCase) => (
        <button
          className={testCase.id === selectedId ? 'agent-list-item active' : 'agent-list-item'}
          key={testCase.id}
          type="button"
          onClick={() => onSelect(testCase.id)}
        >
          {testCase.name}
        </button>
      ))}
    </aside>
  );
}
