interface MonacoJsonEditorProps {
  value: string;
  height: string;
  onChange: (value: string) => void;
}

export function MonacoJsonEditor({ value, height, onChange }: MonacoJsonEditorProps) {
  return (
    <textarea
      aria-label="JSON editor"
      className="json-editor"
      style={{ minHeight: height }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
    />
  );
}
