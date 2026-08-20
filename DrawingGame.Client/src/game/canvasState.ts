import type { CanvasState, CanvasUpdate } from "./types";

export const emptyCanvasState: CanvasState = {
  completedStrokes: [],
  activeStroke: null,
};

export function applyCanvasUpdate(
  state: CanvasState,
  update: CanvasUpdate,
): CanvasState {
  switch (update.type) {
    case "synced":
      return update.state;
    case "strokeStarted":
      return { ...state, activeStroke: update.stroke };
    case "strokePointsAdded":
      if (!state.activeStroke || update.points.length === 0) {
        return state;
      }

      return {
        ...state,
        activeStroke: {
          ...state.activeStroke,
          points: [...state.activeStroke.points, ...update.points],
        },
      };
    case "strokeEnded":
      if (!state.activeStroke) {
        return state;
      }

      return {
        completedStrokes: [...state.completedStrokes, state.activeStroke],
        activeStroke: null,
      };
  }
}
