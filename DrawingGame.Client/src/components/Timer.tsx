export default function Timer() {
  return (
    <span className="countdown font-mono text-xl">
      <span
        style={{ "--value": 59 } as React.CSSProperties}
        aria-live="polite"
        aria-label="59 seconds remaining"
      >
        59
      </span>
    </span>
  );
}
