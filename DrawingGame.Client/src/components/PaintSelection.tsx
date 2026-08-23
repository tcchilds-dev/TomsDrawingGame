import WidthSelection from "./WidthSelection";

const paintColours = [
  "#111827",
  "#7a7d82",
  "#ee1a13",
  "#ff7000",
  "#ffe300",
  "#00cb00",
  "#00ff90",
  "#00b1ff",
  "#2824d2",
  "#a200b9",
  "#e8469a",
  "#9f5331",
  "#ffffff",
  "#c0c0c0",
  "#b51b16",
  "#ff9b4f",
  "#f5e782",
  "#a5fca4",
  "#a6ffd8",
  "#9ee2ff",
  "#3f3bff",
  "#9705ff",
  "#fc8bd9",
  "#ffab8d",
];

type PaintSelectionProps = {
  brushWidth: number;
  disabled?: boolean;
  onBrushWidthChange: (width: number) => void;
  onClear: () => void;
  onColourChange: (colour: string) => void;
  onUndo: () => void;
  selectedColour: string;
};

export default function PaintSelection({
  brushWidth,
  disabled = false,
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
          <div aria-label="Paint colours" className="grid grid-cols-12 gap-2" role="group">
            {paintColours.map((colour, index) => {
              const isSelected = selectedColour === colour;

              return (
                <button
                  aria-label={`Select colour ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`btn btn-circle btn-sm border-base-300 p-0 ${
                    isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100" : ""
                  }`}
                  disabled={disabled}
                  key={colour}
                  onClick={() => onColourChange(colour)}
                  style={{ backgroundColor: colour }}
                  title={colour}
                  type="button"
                />
              );
            })}
          </div>

          <WidthSelection disabled={disabled} onChange={onBrushWidthChange} value={brushWidth} />

          <div className="flex flex-col gap-2">
            <button
              className="btn btn-neutral btn-sm w-20"
              disabled={disabled}
              onClick={onUndo}
              type="button"
            >
              Undo
            </button>
            <button
              className="btn btn-neutral btn-sm w-20"
              disabled={disabled}
              onClick={onClear}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
