import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getStrokePoints } from "perfect-freehand";
import type { CanvasState, Point, Stroke } from "../game/types";

type CanvasProps = {
  brushWidth: number;
  canvasState: CanvasState;
  colour: string;
  isDrawingEnabled: boolean;
  onAddStrokePoints: (points: Point[]) => void;
  onBeginStroke: (colour: string, width: number, firstPoint: Point) => void;
  onEndStroke: () => void;
};

type CanvasSize = {
  height: number;
  width: number;
};

const EMPTY_CANVAS_SIZE: CanvasSize = { height: 1, width: 1 };
const MAX_POINT_GAP_PX = 8;
const MAX_POINTS_PER_BATCH = 150;
const STROKE_STREAMLINE = 0.45;

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasSize: CanvasSize,
  isComplete: boolean,
) {
  const [firstPoint] = stroke.points;

  if (!firstPoint) {
    return;
  }

  const firstX = firstPoint.x * canvasSize.width;
  const firstY = firstPoint.y * canvasSize.height;

  context.fillStyle = stroke.colour;

  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(firstX, firstY, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const centreline = getStrokePoints(
    stroke.points.map((point) => [point.x * canvasSize.width, point.y * canvasSize.height]),
    {
      last: isComplete,
      size: stroke.width,
      streamline: STROKE_STREAMLINE,
    },
  ).map(({ point }) => point);

  const [centrelineStart] = centreline;
  if (!centrelineStart) {
    return;
  }

  if (centreline.length === 1) {
    context.beginPath();
    context.arc(centrelineStart[0], centrelineStart[1], stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;
  context.strokeStyle = stroke.colour;
  context.beginPath();
  context.moveTo(centrelineStart[0], centrelineStart[1]);

  if (centreline.length === 2) {
    context.lineTo(centreline[1][0], centreline[1][1]);
    context.stroke();
    return;
  }

  for (let index = 1; index < centreline.length - 1; index += 1) {
    const point = centreline[index];
    const nextPoint = centreline[index + 1];

    context.quadraticCurveTo(
      point[0],
      point[1],
      (point[0] + nextPoint[0]) / 2,
      (point[1] + nextPoint[1]) / 2,
    );
  }

  const secondLastPoint = centreline[centreline.length - 2];
  const lastPoint = centreline[centreline.length - 1];
  context.quadraticCurveTo(
    secondLastPoint[0],
    secondLastPoint[1],
    lastPoint[0],
    lastPoint[1],
  );
  context.stroke();
}

export default function Canvas({
  brushWidth,
  canvasState,
  colour,
  isDrawingEnabled,
  onAddStrokePoints,
  onBeginStroke,
  onEndStroke,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedStrokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<CanvasSize>(EMPTY_CANVAS_SIZE);
  const networkFlushFrameRef = useRef<number | null>(null);
  const pendingNetworkPointsRef = useRef<Point[]>([]);
  const redrawFrameRef = useRef<number | null>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const { height, width } = canvasSizeRef.current;
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    context.clearRect(0, 0, width, height);

    for (const stroke of completedStrokesRef.current) {
      drawStroke(context, stroke, canvasSizeRef.current, true);
    }

    if (activeStrokeRef.current) {
      drawStroke(context, activeStrokeRef.current, canvasSizeRef.current, false);
    }
  }, []);

  const queueRedraw = useCallback(() => {
    if (redrawFrameRef.current !== null) {
      return;
    }

    redrawFrameRef.current = requestAnimationFrame(() => {
      redrawFrameRef.current = null;
      redrawCanvas();
    });
  }, [redrawCanvas]);

  const flushPendingNetworkPoints = useCallback(() => {
    while (pendingNetworkPointsRef.current.length > 0) {
      const points = pendingNetworkPointsRef.current.splice(0, MAX_POINTS_PER_BATCH);
      onAddStrokePoints(points);
    }
  }, [onAddStrokePoints]);

  const queueNetworkFlush = useCallback(() => {
    if (networkFlushFrameRef.current !== null) {
      return;
    }

    networkFlushFrameRef.current = requestAnimationFrame(() => {
      networkFlushFrameRef.current = null;
      flushPendingNetworkPoints();
    });
  }, [flushPendingNetworkPoints]);

  const cancelPendingFrames = useCallback(() => {
    if (redrawFrameRef.current !== null) {
      cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = null;
    }

    if (networkFlushFrameRef.current !== null) {
      cancelAnimationFrame(networkFlushFrameRef.current);
      networkFlushFrameRef.current = null;
    }
  }, []);

  const resizeCanvas = useCallback((entry?: ResizeObserverEntry) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(bounds.width || canvas.clientWidth, 1);
    const height = Math.max(bounds.height || canvas.clientHeight, 1);
    const devicePixelSize = entry?.devicePixelContentBoxSize?.[0];
    const devicePixelRatio = window.devicePixelRatio || 1;
    const bitmapWidth = Math.max(
      Math.round(devicePixelSize?.inlineSize ?? width * devicePixelRatio),
      1,
    );
    const bitmapHeight = Math.max(
      Math.round(devicePixelSize?.blockSize ?? height * devicePixelRatio),
      1,
    );

    canvasSizeRef.current = { height, width };

    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    resizeCanvas();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            const entry = entries.find(({ target }) => target === canvas);
            resizeCanvas(entry);
          });

    if (resizeObserver) {
      try {
        resizeObserver.observe(canvas, { box: "device-pixel-content-box" });
      } catch {
        resizeObserver.observe(canvas);
      }
    }

    const handleWindowResize = () => resizeCanvas();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      cancelPendingFrames();
      pendingNetworkPointsRef.current = [];
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [cancelPendingFrames, resizeCanvas]);

  useEffect(() => {
    cancelPendingFrames();
    pendingNetworkPointsRef.current = [];
    activePointerIdRef.current = null;
    completedStrokesRef.current = canvasState.completedStrokes;
    activeStrokeRef.current = canvasState.activeStroke;
    redrawCanvas();
  }, [cancelPendingFrames, canvasState, redrawCanvas]);

  useEffect(() => {
    if (isDrawingEnabled || activePointerIdRef.current === null) {
      return;
    }

    cancelPendingFrames();
    pendingNetworkPointsRef.current = [];
    activePointerIdRef.current = null;
    activeStrokeRef.current = canvasState.activeStroke;
    redrawCanvas();
  }, [cancelPendingFrames, canvasState.activeStroke, isDrawingEnabled, redrawCanvas]);

  const getPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width || canvasSizeRef.current.width;
    const height = bounds.height || canvasSizeRef.current.height;

    return {
      x: Math.min(Math.max((clientX - bounds.left) / width, 0), 1),
      y: Math.min(Math.max((clientY - bounds.top) / height, 0), 1),
    };
  }, []);

  const appendPointWithDensification = useCallback(
    (clientX: number, clientY: number) => {
      const activeStroke = activeStrokeRef.current;

      if (!activeStroke) {
        return [];
      }

      const point = getPoint(clientX, clientY);
      const previousPoint = activeStroke.points.at(-1);

      if (!previousPoint || (previousPoint.x === point.x && previousPoint.y === point.y)) {
        return [];
      }

      const distanceX = (point.x - previousPoint.x) * canvasSizeRef.current.width;
      const distanceY = (point.y - previousPoint.y) * canvasSizeRef.current.height;
      const steps = Math.max(1, Math.ceil(Math.hypot(distanceX, distanceY) / MAX_POINT_GAP_PX));
      const points: Point[] = [];

      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        points.push({
          x: previousPoint.x + (point.x - previousPoint.x) * progress,
          y: previousPoint.y + (point.y - previousPoint.y) * progress,
        });
      }

      activeStroke.points.push(...points);
      return points;
    },
    [getPoint],
  );

  const finishStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, includeFinalPoint: boolean) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (includeFinalPoint) {
        pendingNetworkPointsRef.current.push(
          ...appendPointWithDensification(event.clientX, event.clientY),
        );
      }

      if (networkFlushFrameRef.current !== null) {
        cancelAnimationFrame(networkFlushFrameRef.current);
        networkFlushFrameRef.current = null;
      }
      flushPendingNetworkPoints();

      const activeStroke = activeStrokeRef.current;
      if (activeStroke) {
        completedStrokesRef.current = [...completedStrokesRef.current, activeStroke];
      }

      activePointerIdRef.current = null;
      activeStrokeRef.current = null;
      pendingNetworkPointsRef.current = [];

      if (redrawFrameRef.current !== null) {
        cancelAnimationFrame(redrawFrameRef.current);
        redrawFrameRef.current = null;
      }
      redrawCanvas();

      if (activeStroke) {
        onEndStroke();
      }
    },
    [appendPointWithDensification, flushPendingNetworkPoints, onEndStroke, redrawCanvas],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      !isDrawingEnabled ||
      activePointerIdRef.current !== null ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const firstPoint = getPoint(event.clientX, event.clientY);
    pendingNetworkPointsRef.current = [];
    activePointerIdRef.current = event.pointerId;
    activeStrokeRef.current = {
      colour,
      points: [firstPoint],
      width: brushWidth,
    };

    onBeginStroke(colour, brushWidth, firstPoint);
    redrawCanvas();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled || activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.();
    const pointerEvents =
      coalescedEvents && coalescedEvents.length > 0 ? coalescedEvents : [event.nativeEvent];
    for (const pointerEvent of pointerEvents) {
      pendingNetworkPointsRef.current.push(
        ...appendPointWithDensification(pointerEvent.clientX, pointerEvent.clientY),
      );
    }

    if (pendingNetworkPointsRef.current.length > 0) {
      queueNetworkFlush();
      queueRedraw();
    }
  };

  return (
    <canvas
      aria-disabled={!isDrawingEnabled}
      aria-label="Drawing canvas"
      className={`h-full w-full touch-none rounded-box bg-white shadow-sm ${
        isDrawingEnabled ? "cursor-crosshair" : "cursor-default"
      }`}
      onLostPointerCapture={(event) => finishStroke(event, false)}
      onPointerCancel={(event) => finishStroke(event, false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishStroke(event, true)}
      ref={canvasRef}
    >
      Your browser does not support the drawing canvas.
    </canvas>
  );
}
