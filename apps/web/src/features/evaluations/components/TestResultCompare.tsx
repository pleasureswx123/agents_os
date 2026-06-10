import type { TestResult } from '../api';

interface TestResultCompareProps {
  results: TestResult[];
  onScore: (resultId: string, rating: string) => void;
}

export function TestResultCompare({ results, onScore }: TestResultCompareProps) {
  return (
    <div className="compare-grid">
      {results.map((result) => (
        <article className="compare-card" key={result.id}>
          <strong>{result.agentVersion?.versionName ?? 'AgentVersion'}</strong>
          <pre>{JSON.stringify(result.output, null, 2)}</pre>
          <div className="tabs">
            {['good', 'average', 'bad'].map((rating) => (
              <button key={rating} type="button" onClick={() => onScore(result.id, rating)}>
                {rating}
              </button>
            ))}
          </div>
          {result.rating ? <p>{result.rating}</p> : null}
        </article>
      ))}
    </div>
  );
}
