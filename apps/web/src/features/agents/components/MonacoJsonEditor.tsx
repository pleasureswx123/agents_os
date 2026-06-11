import Editor from '@monaco-editor/react';

interface MonacoJsonEditorProps {
  value: string;
  height: string;
  onChange: (value: string) => void;
}

export function MonacoJsonEditor({ value, height, onChange }: MonacoJsonEditorProps) {
  return (
    <div
      aria-label="JSON editor"
      className="json-editor"
      style={{ minHeight: height, height }}
    >
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on'
        }}
      />
    </div>
  );
}
