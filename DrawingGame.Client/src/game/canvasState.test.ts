import { describe, expect, it } from "vitest";
import { applyCanvasUpdate, emptyCanvasState } from "./canvasState";
import type { Stroke } from "./types";

const stroke: Stroke = {
  colour: "#111827",
  width: 8,
  points: [{ x: 0.1, y: 0.2 }],
};

describe("canvas state", () => {
  it("builds an incremental stroke without mutating prior state", () => {
    const started = applyCanvasUpdate(emptyCanvasState, {
      type: "strokeStarted",
      stroke,
    });
    const extended = applyCanvasUpdate(started, {
      type: "strokePointsAdded",
      points: [{ x: 0.3, y: 0.4 }],
    });
    const ended = applyCanvasUpdate(extended, { type: "strokeEnded" });

    expect(started.activeStroke?.points).toEqual([{ x: 0.1, y: 0.2 }]);
    expect(extended.activeStroke?.points).toEqual([
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ]);
    expect(ended).toEqual({
      completedStrokes: [extended.activeStroke],
      activeStroke: null,
    });
  });

  it("replaces incremental state with an authoritative canvas sync", () => {
    const incremental = {
      completedStrokes: [],
      activeStroke: stroke,
    };
    const synchronized = {
      completedStrokes: [stroke],
      activeStroke: null,
    };

    expect(
      applyCanvasUpdate(incremental, {
        type: "synced",
        state: synchronized,
      }),
    ).toBe(synchronized);
  });

  it("ignores point and end events when no stroke is active", () => {
    expect(
      applyCanvasUpdate(emptyCanvasState, {
        type: "strokePointsAdded",
        points: [{ x: 0.3, y: 0.4 }],
      }),
    ).toBe(emptyCanvasState);
    expect(
      applyCanvasUpdate(emptyCanvasState, { type: "strokeEnded" }),
    ).toBe(emptyCanvasState);
  });
});
