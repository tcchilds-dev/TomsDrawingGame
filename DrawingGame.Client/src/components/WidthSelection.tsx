const brushWidths = [
  { label: "Small", dotClassName: "size-1", value: 4 },
  { label: "Medium", dotClassName: "size-2", value: 8 },
  { label: "Large", dotClassName: "size-3", value: 12 },
];

type WidthSelectionProps = {
  disabled?: boolean;
  onChange: (width: number) => void;
  value: number;
};

export default function WidthSelection({
  disabled = false,
  onChange,
  value,
}: WidthSelectionProps) {
  return (
    <ul
      aria-label="Brush width"
      className="menu menu-sm menu-vertical w-28 rounded-box bg-base-200 p-1"
    >
      {brushWidths.map(({ label, dotClassName, value: width }) => {
        const isSelected = value === width;

        return (
          <li key={width}>
            <button
              aria-pressed={isSelected}
              className={isSelected ? "menu-active" : undefined}
              disabled={disabled}
              onClick={() => onChange(width)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`${dotClassName} rounded-full bg-current`}
              />
              <span>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
