import WidthSelection from "./WidthSelection";

const paintColours = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#a16207",
  "#6b7280",
  "#fca5a5",
  "#fdba74",
  "#bef264",
  "#67e8f9",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
  "#78350f",
  "#94a3b8",
  "#fecaca",
  "#fed7aa",
  "#d9f99d",
];

type PaintSelectionProps = {
  brushWidth: number;
  onBrushWidthChange: (width: number) => void;
  onClear: () => void;
  onColourChange: (colour: string) => void;
  onUndo: () => void;
  selectedColour: string;
};

export default function PaintSelection({
  brushWidth,
  onBrushWidthChange,
  onClear,
  onColourChange,
  onUndo,
  selectedColour,
}: PaintSelectionProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="card w-fit bg-base-100 shadow-sm">
        <div className="card-body flex-row items-center gap-5 px-5 py-2">
          <div aria-label="Paint colours" className="grid grid-cols-8 gap-2" role="group">
            {paintColours.map((colour, index) => {
              const isSelected = selectedColour === colour;

              return (
                <button
                  aria-label={`Select colour ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`btn btn-circle btn-sm border-base-300 p-0 ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                      : ""
                  }`}
                  key={colour}
                  onClick={() => onColourChange(colour)}
                  style={{ backgroundColor: colour }}
                  title={colour}
                  type="button"
                />
              );
            })}
          </div>

          <WidthSelection onChange={onBrushWidthChange} value={brushWidth} />

          <div className="flex flex-col gap-2">
            <button className="btn btn-neutral btn-sm w-20" onClick={onUndo} type="button">
              Undo
            </button>
            <button className="btn btn-neutral btn-sm w-20" onClick={onClear} type="button">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
