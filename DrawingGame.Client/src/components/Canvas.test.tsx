import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCanvasState } from "../game/canvasState";
import Canvas from "./Canvas";

const context = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
};

const bounds = {
  bottom: 100,
  height: 100,
  left: 0,
  right: 100,
  top: 0,
  width: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

describe("Canvas", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(
      HTMLCanvasElement.prototype,
      "getBoundingClientRect",
    ).mockReturnValue(bounds);
    Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("normalizes and batches the artist's pointer input", () => {
    const beginStroke = vi.fn();
    const addStrokePoints = vi.fn();
    const endStroke = vi.fn();

    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled
        onAddStrokePoints={addStrokePoints}
        onBeginStroke={beginStroke}
        onEndStroke={endStroke}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 25,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(canvas, {
      buttons: 1,
      clientX: 50,
      clientY: 75,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(canvas, {
      clientX: 75,
      clientY: 100,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(beginStroke).toHaveBeenCalledWith("#111827", 8, {
      x: 0.25,
      y: 0.5,
    });
    expect(addStrokePoints).toHaveBeenNthCalledWith(1, [{ x: 0.5, y: 0.75 }]);
    expect(addStrokePoints).toHaveBeenNthCalledWith(2, [{ x: 0.75, y: 1 }]);
    expect(endStroke).toHaveBeenCalledOnce();
  });

  it("ignores pointer input when drawing is disabled", () => {
    const beginStroke = vi.fn();

    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled={false}
        onAddStrokePoints={vi.fn()}
        onBeginStroke={beginStroke}
        onEndStroke={vi.fn()}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 25,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(beginStroke).not.toHaveBeenCalled();
    expect(canvas).toHaveAttribute("aria-disabled", "true");
  });
});
