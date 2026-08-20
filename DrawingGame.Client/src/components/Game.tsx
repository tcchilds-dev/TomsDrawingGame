import { useRef, useState } from "react";
import Button from "./Button";
import Canvas from "./Canvas";
import type { CanvasHandle } from "./Canvas";
import Chat from "./Chat";
import Input from "./Input";
import PaintSelection from "./PaintSelection";
import PlayerList from "./PlayerList";
import Timer from "./Timer";
import Word from "./Word";
import type { GameState } from "../game/types";

type GameProps = {
  currentPlayerId: string | null;
  error: string | null;
  isSubmitting: boolean;
  onLeaveRoom: () => Promise<void> | void;
  onStartGame: () => Promise<void> | void;
  state: GameState;
};

export default function Game({
  currentPlayerId,
  error,
  isSubmitting,
  onLeaveRoom,
  onStartGame,
  state,
}: GameProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [selectedColour, setSelectedColour] = useState("#111827");
  const [brushWidth, setBrushWidth] = useState(8);
  const isOwner = currentPlayerId === state.ownerId;

  return (
    <main className="grid h-screen grid-cols-6 grid-rows-24 gap-2 p-2">
      <aside className="col-start-1 row-start-1 text-center">
        {state.currentRound === null ? "Lobby" : `Round: ${state.currentRound}`}
      </aside>
      <aside className="col-start-1 row-start-2 row-span-17">
        <PlayerList players={state.players}></PlayerList>
      </aside>
      <aside
        aria-label="Room notices"
        className="col-start-1 row-start-19 row-span-3 flex items-center justify-center text-center"
      >
        {error ? (
          <p className="text-error" role="alert">
            {error}
          </p>
        ) : (
          state.phase === "Lobby" &&
          !isOwner && <p>Waiting for the owner to start</p>
        )}
      </aside>
      <aside className="col-start-1 row-start-22 row-span-3 flex flex-col justify-center gap-2 text-center">
        <p aria-label="Room code">Room Code: {state.roomId}</p>
        {state.phase === "Lobby" && isOwner && (
          <Button
            disabled={isSubmitting}
            onClick={() => void onStartGame()}
            type="Start"
          />
        )}
        <Button
          disabled={isSubmitting}
          onClick={() => void onLeaveRoom()}
          type="Leave"
        />
      </aside>

      <header className="col-start-2 col-span-4 row-start-1 content-center text-center">
        <Word></Word>
      </header>

      <section className="col-start-2 col-span-4 row-start-2 row-span-20">
        <Canvas brushWidth={brushWidth} colour={selectedColour} ref={canvasRef} />
      </section>

      <section className="col-start-2 col-span-4 row-start-22 row-span-4">
        <PaintSelection
          brushWidth={brushWidth}
          onBrushWidthChange={setBrushWidth}
          onClear={() => canvasRef.current?.clear()}
          onColourChange={setSelectedColour}
          onUndo={() => canvasRef.current?.undo()}
          selectedColour={selectedColour}
        />
      </section>

      <aside className="col-start-6 row-start-1 content-center text-center">
        <Timer />
      </aside>
      <aside className="col-start-6 row-start-2 row-span-20">
        <Chat></Chat>
      </aside>
      <aside className="col-start-6 row-start-23 row-span-4">
        <Input placeholder="" />
      </aside>
    </main>
  );
}
