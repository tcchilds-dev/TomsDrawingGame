import { useState, type FormEvent } from "react";
import Button from "./Button";
import Canvas from "./Canvas";
import Chat from "./Chat";
import Input from "./Input";
import PaintSelection from "./PaintSelection";
import PlayerList from "./PlayerList";
import Timer from "./Timer";
import Word from "./Word";
import type { CanvasState, GameState, Point } from "../game/types";

type GameProps = {
  artistWord: string | null;
  canvasState: CanvasState;
  currentPlayerId: string | null;
  error: string | null;
  isSubmitting: boolean;
  onAddStrokePoints: (points: Point[]) => void;
  onBeginStroke: (colour: string, width: number, firstPoint: Point) => void;
  onClearCanvas: () => void;
  onChooseWord: (word: string) => Promise<void> | void;
  onEndStroke: () => void;
  onLeaveRoom: () => Promise<void> | void;
  onSendMessage: (message: string) => Promise<void> | void;
  onStartGame: () => Promise<void> | void;
  onUndoStroke: () => void;
  state: GameState;
  wordChoices: string[];
};

export default function Game({
  artistWord,
  canvasState,
  currentPlayerId,
  error,
  isSubmitting,
  onAddStrokePoints,
  onBeginStroke,
  onClearCanvas,
  onChooseWord,
  onEndStroke,
  onLeaveRoom,
  onSendMessage,
  onStartGame,
  onUndoStroke,
  state,
  wordChoices,
}: GameProps) {
  const [selectedColour, setSelectedColour] = useState("#111827");
  const [brushWidth, setBrushWidth] = useState(8);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const isOwner = currentPlayerId === state.ownerId;
  const isArtist = currentPlayerId === state.currentArtistId;
  const isDrawingEnabled = isArtist && state.phase === "Playing";
  const currentPlayer = state.players.find(
    (player) => player.id === currentPlayerId,
  );
  const isChatRestricted =
    state.phase === "Playing" &&
    (isArtist || currentPlayer?.hasCorrectlyGuessed === true);
  const chatPlaceholder =
    state.phase !== "Playing"
      ? "Type a message"
      : isArtist
        ? "You're drawing"
        : currentPlayer?.hasCorrectlyGuessed
          ? "You guessed the word"
          : "Type a guess";
  const artistName = state.players.find(
    (player) => player.id === state.currentArtistId,
  )?.username;

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draftMessage.trim();

    if (!message || isChatRestricted || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    try {
      await onSendMessage(message);
      setDraftMessage("");
    } catch {
      // The parent displays transport and server errors in the notice board.
    } finally {
      setIsSendingMessage(false);
    }
  };

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
        <Word
          artistName={artistName ?? null}
          artistWord={artistWord}
          choices={wordChoices}
          displayWord={state.displayWord}
          isArtist={isArtist}
          isSubmitting={isSubmitting}
          onChooseWord={onChooseWord}
          phase={state.phase}
        />
      </header>

      <section className="col-start-2 col-span-4 row-start-2 row-span-20">
        <Canvas
          brushWidth={brushWidth}
          canvasState={canvasState}
          colour={selectedColour}
          isDrawingEnabled={isDrawingEnabled}
          onAddStrokePoints={onAddStrokePoints}
          onBeginStroke={onBeginStroke}
          onEndStroke={onEndStroke}
        />
      </section>

      <section className="col-start-2 col-span-4 row-start-22 row-span-4">
        <PaintSelection
          brushWidth={brushWidth}
          disabled={!isDrawingEnabled}
          onBrushWidthChange={setBrushWidth}
          onClear={onClearCanvas}
          onColourChange={setSelectedColour}
          onUndo={onUndoStroke}
          selectedColour={selectedColour}
        />
      </section>

      <aside className="col-start-6 row-start-1 content-center text-center">
        <Timer />
      </aside>
      <aside className="col-start-6 row-start-2 row-span-20 min-h-0">
        <Chat
          currentPlayerId={currentPlayerId}
          messages={state.chatHistory}
        />
      </aside>
      <aside className="col-start-6 row-start-23 row-span-4">
        <form onSubmit={(event) => void submitMessage(event)}>
          <Input
            ariaLabel="Chat message"
            disabled={isChatRestricted || isSendingMessage}
            maxLength={200}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder={chatPlaceholder}
            value={draftMessage}
          />
        </form>
      </aside>
    </main>
  );
}
