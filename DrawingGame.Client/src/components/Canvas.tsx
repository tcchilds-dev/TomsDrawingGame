import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasSize: CanvasSize,
) {
  const [firstPoint, ...remainingPoints] = stroke.points;

  if (!firstPoint) {
    return;
  }

  const firstX = firstPoint.x * canvasSize.width;
  const firstY = firstPoint.y * canvasSize.height;

  context.fillStyle = stroke.colour;
  context.strokeStyle = stroke.colour;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;

  if (remainingPoints.length === 0) {
    context.beginPath();
    context.arc(firstX, firstY, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(firstX, firstY);

  for (const point of remainingPoints) {
    context.lineTo(point.x * canvasSize.width, point.y * canvasSize.height);
  }

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

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    const { height, width } = canvasSizeRef.current;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    for (const stroke of completedStrokesRef.current) {
      drawStroke(context, stroke, canvasSizeRef.current);
    }

    if (activeStrokeRef.current) {
      drawStroke(context, activeStrokeRef.current, canvasSizeRef.current);
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width || canvas.clientWidth), 1);
    const height = Math.max(Math.round(bounds.height || canvas.clientHeight), 1);
    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    const bitmapWidth = Math.round(width * pixelRatio);
    const bitmapHeight = Math.round(height * pixelRatio);

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
        : new ResizeObserver(resizeCanvas);

    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    activePointerIdRef.current = null;
    completedStrokesRef.current = canvasState.completedStrokes;
    activeStrokeRef.current = canvasState.activeStroke;
    redrawCanvas();
  }, [canvasState, redrawCanvas]);

  useEffect(() => {
    if (isDrawingEnabled || activePointerIdRef.current === null) {
      return;
    }

    activePointerIdRef.current = null;
    activeStrokeRef.current = canvasState.activeStroke;
    redrawCanvas();
  }, [canvasState.activeStroke, isDrawingEnabled, redrawCanvas]);

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

  const appendPoint = useCallback(
    (clientX: number, clientY: number) => {
      const activeStroke = activeStrokeRef.current;

      if (!activeStroke) {
        return null;
      }

      const point = getPoint(clientX, clientY);
      const previousPoint = activeStroke.points.at(-1);

      if (previousPoint?.x === point.x && previousPoint.y === point.y) {
        return null;
      }

      activeStroke.points.push(point);
      return point;
    },
    [getPoint],
  );

  const finishStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, includeFinalPoint: boolean) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (includeFinalPoint) {
        const finalPoint = appendPoint(event.clientX, event.clientY);
        if (finalPoint) {
          onAddStrokePoints([finalPoint]);
        }
      }

      const activeStroke = activeStrokeRef.current;
      if (activeStroke) {
        completedStrokesRef.current = [
          ...completedStrokesRef.current,
          activeStroke,
        ];
      }

      activePointerIdRef.current = null;
      activeStrokeRef.current = null;
      redrawCanvas();

      if (activeStroke) {
        onEndStroke();
      }
    },
    [appendPoint, onAddStrokePoints, onEndStroke, redrawCanvas],
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
    if (
      !isDrawingEnabled ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.();
    const pointerEvents =
      coalescedEvents && coalescedEvents.length > 0
        ? coalescedEvents
        : [event.nativeEvent];
    const points: Point[] = [];

    for (const pointerEvent of pointerEvents) {
      const point = appendPoint(pointerEvent.clientX, pointerEvent.clientY);
      if (point) {
        points.push(point);
      }
    }

    if (points.length > 0) {
      onAddStrokePoints(points);
      redrawCanvas();
    }
  };

  return (
    <canvas
      aria-disabled={!isDrawingEnabled}
      aria-label="Drawing canvas"
      className={`h-full w-full touch-none rounded-box bg-base-100 shadow-sm ${
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
