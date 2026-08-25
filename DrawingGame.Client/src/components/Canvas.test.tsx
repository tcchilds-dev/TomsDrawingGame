import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCanvasState } from "../game/canvasState";
import Canvas from "./Canvas";

const context = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  fillStyle: "",
  lineCap: "butt",
  lineTo: vi.fn(),
  lineJoin: "miter",
  lineWidth: 1,
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: "",
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
  let animationFrames: Map<number, FrameRequestCallback>;
  let nextAnimationFrameId: number;
  let resizeObserverCallback: ResizeObserverCallback | null;

  const flushAnimationFrames = () => {
    const callbacks = [...animationFrames.values()];
    animationFrames.clear();
    callbacks.forEach((callback) => callback(0));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    animationFrames = new Map();
    nextAnimationFrameId = 1;
    resizeObserverCallback = null;
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1,
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      animationFrames.delete(id);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }

        disconnect() {
          return undefined;
        }

        observe() {
          return undefined;
        }

        unobserve() {
          return undefined;
        }
      },
    );
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

  it("normalizes, densifies, and frame-batches the artist's pointer input", () => {
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
    flushAnimationFrames();
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
    const firstBatch = addStrokePoints.mock.calls[0]?.[0];
    const secondBatch = addStrokePoints.mock.calls[1]?.[0];

    expect(firstBatch).toHaveLength(5);
    expect(firstBatch[0]).toEqual({ x: 0.3, y: 0.55 });
    expect(firstBatch.at(-1)).toEqual({ x: 0.5, y: 0.75 });
    expect(secondBatch).toHaveLength(5);
    expect(secondBatch[0]).toEqual({ x: 0.55, y: 0.8 });
    expect(secondBatch.at(-1)).toEqual({ x: 0.75, y: 1 });
    expect(endStroke).toHaveBeenCalledOnce();
  });

  it("renders multi-point strokes as smooth native centrelines", () => {
    render(
      <Canvas
        brushWidth={8}
        canvasState={{
          activeStroke: null,
          completedStrokes: [
            {
              colour: "#111827",
              points: [
                { x: 0, y: 0 },
                { x: 0.5, y: 1 },
                { x: 1, y: 0 },
              ],
              width: 8,
            },
          ],
        }}
        colour="#111827"
        isDrawingEnabled={false}
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    expect(context.quadraticCurveTo).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.closePath).not.toHaveBeenCalled();
    expect(context.fill).not.toHaveBeenCalled();
    expect(context).toMatchObject({
      lineCap: "round",
      lineJoin: "round",
      lineWidth: 8,
      strokeStyle: "#111827",
    });
  });

  it("matches its fallback backing resolution to the display pixel ratio", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1.25,
    });

    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled={false}
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    expect(canvas).toHaveProperty("width", 125);
    expect(canvas).toHaveProperty("height", 125);
    expect(context.setTransform).toHaveBeenCalledWith(1.25, 0, 0, 1.25, 0, 0);
  });

  it("uses the canvas's exact physical-pixel dimensions when available", () => {
    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled={false}
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");

    if (!resizeObserverCallback) {
      throw new Error("ResizeObserver was not created");
    }

    resizeObserverCallback(
      [
        {
          devicePixelContentBoxSize: [{ blockSize: 199, inlineSize: 251 }],
          target: canvas,
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    expect(canvas).toHaveProperty("width", 251);
    expect(canvas).toHaveProperty("height", 199);
    expect(context.setTransform).toHaveBeenLastCalledWith(2.51, 0, 0, 1.99, 0, 0);
  });

  it("caps each frame-batched network update at 150 points", () => {
    const addStrokePoints = vi.fn();

    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled
        onAddStrokePoints={addStrokePoints}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 7,
      pointerType: "mouse",
    });

    for (let index = 0; index < 9; index += 1) {
      const coordinate = index % 2 === 0 ? 100 : 0;
      fireEvent.pointerMove(canvas, {
        buttons: 1,
        clientX: coordinate,
        clientY: coordinate,
        pointerId: 7,
        pointerType: "mouse",
      });
    }

    flushAnimationFrames();

    expect(addStrokePoints).toHaveBeenCalledTimes(2);
    expect(addStrokePoints.mock.calls[0]?.[0]).toHaveLength(150);
    expect(addStrokePoints.mock.calls[1]?.[0]).toHaveLength(12);
  });

  it("keeps drawing after a captured pointer leaves the canvas", () => {
    const addStrokePoints = vi.fn();
    const endStroke = vi.fn();

    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled
        onAddStrokePoints={addStrokePoints}
        onBeginStroke={vi.fn()}
        onEndStroke={endStroke}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerLeave(canvas, {
      clientX: 101,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(endStroke).not.toHaveBeenCalled();

    fireEvent.pointerMove(canvas, {
      buttons: 1,
      clientX: 125,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(canvas, {
      clientX: 125,
      clientY: 50,
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(addStrokePoints.mock.calls[0]?.[0].at(-1)).toEqual({ x: 1, y: 0.5 });
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

  it("uses the selected brush colour and width for the drawing cursor", () => {
    const { rerender } = render(
      <Canvas
        brushWidth={4}
        canvasState={emptyCanvasState}
        colour="#ffffff"
        isDrawingEnabled
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    const canvas = screen.getByLabelText("Drawing canvas");
    const smallWhiteCursor = canvas.style.cursor;

    expect(smallWhiteCursor).toContain("data:image/svg+xml");
    expect(smallWhiteCursor).toContain("%23ffffff");
    expect(smallWhiteCursor).toContain("r%3D%222%22");
    expect(smallWhiteCursor).toContain("stroke-width%3D%220.75%22");
    expect(canvas).not.toHaveClass("cursor-crosshair");

    rerender(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    expect(canvas.style.cursor).toContain("%23111827");
    expect(canvas.style.cursor).toContain("r%3D%224%22");
    expect(canvas.style.cursor).not.toBe(smallWhiteCursor);
  });

  it("uses subtle elevation without changing the canvas material", () => {
    render(
      <Canvas
        brushWidth={8}
        canvasState={emptyCanvasState}
        colour="#111827"
        isDrawingEnabled={false}
        onAddStrokePoints={vi.fn()}
        onBeginStroke={vi.fn()}
        onEndStroke={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Drawing canvas")).toHaveClass(
      "bg-white",
      "rounded-box",
      "shadow-sm",
    );
  });
});
