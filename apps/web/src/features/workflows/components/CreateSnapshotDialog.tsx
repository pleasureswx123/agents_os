interface CreateSnapshotDialogProps {
  onCreate: () => void;
}

export function CreateSnapshotDialog({ onCreate }: CreateSnapshotDialogProps) {
  return (
    <button type="button" onClick={onCreate}>
      Create Snapshot
    </button>
  );
}
