export function FieldWarn({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      className="shrink-0 text-sm leading-none"
      title={message}
      aria-label={message}
      role="img"
    >
      ⚠️
    </span>
  );
}
