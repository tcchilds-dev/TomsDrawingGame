import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../game/types";
import Game from "./Game";

vi.mock("./Canvas", () => {
  return {
    default: function Canvas({
      isDrawingEnabled,
    }: {
      isDrawingEnabled: boolean;
    }) {
      return (
        <canvas
          aria-disabled={!isDrawingEnabled}
          aria-label="Drawing canvas"
        />
      );
    },
  };
});

const drawingProps = {
  canvasState: { completedStrokes: [], activeStroke: null },
  onAddStrokePoints: vi.fn(),
  onBeginStroke: vi.fn(),
  onClearCanvas: vi.fn(),
  onEndStroke: vi.fn(),
  onSendMessage: vi.fn(async () => undefined),
  onUndoStroke: vi.fn(),
};

const gameState: GameState = {
  roomId: "aBc12De",
  ownerId: "player-1",
  config: {
    maxPlayers: 6,
    wordSelectionSize: 3,
    wordChoiceTimerSeconds: 30,
    drawTimerSeconds: 60,
    numberOfRounds: 3,
  },
  phase: "Lobby",
  currentRound: null,
  currentArtistId: null,
  displayWord: null,
  phaseEndsAt: null,
  players: [],
  chatHistory: [],
};

describe("Game", () => {
  it("requests to leave through the existing button", async () => {
    const user = userEvent.setup();
    const leaveRoom = vi.fn(async () => undefined);

    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={leaveRoom}
        onStartGame={vi.fn()}
        state={gameState}
        wordChoices={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Leave" }));

    expect(leaveRoom).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Room code")).toHaveTextContent(
      "Room Code: aBc12De",
    );
  });

  it("disables leaving and displays an error when requested", () => {
    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-1"
        error="Unable to leave room."
        isSubmitting
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={gameState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Leave" })).toBeDisabled();
    const noticeBoard = screen.getByLabelText("Room notices");
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to leave room.");
    expect(noticeBoard).toContainElement(screen.getByRole("alert"));
  });

  it("lets the owner start a lobby game", async () => {
    const user = userEvent.setup();
    const startGame = vi.fn(async () => undefined);

    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={startGame}
        state={gameState}
        wordChoices={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start Game" }));

    expect(startGame).toHaveBeenCalledOnce();
  });

  it("asks non-owners to wait instead of showing the start action", () => {
    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-2"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={gameState}
        wordChoices={[]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Start Game" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Room notices")).toContainElement(
      screen.getByText("Waiting for the owner to start"),
    );
  });

  it("uses the synchronized round and hides lobby controls after starting", () => {
    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={{ ...gameState, currentRound: 1, phase: "WordChoice" }}
        wordChoices={[]}
      />,
    );

    expect(screen.getByText("Round: 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Game" }),
    ).not.toBeInTheDocument();
  });

  it("only shows drawing controls for the artist", () => {
    const playingState: GameState = {
      ...gameState,
      phase: "Playing",
      currentArtistId: "player-1",
    };

    const { rerender } = render(
      <Game
        {...drawingProps}
        artistWord="Castle"
        currentPlayerId="player-2"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={playingState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByLabelText("Drawing canvas")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    rerender(
      <Game
        {...drawingProps}
        artistWord="Castle"
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={playingState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByLabelText("Drawing canvas")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
  });

  it("submits trimmed chat messages outside a round", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn(async () => undefined);

    render(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onSendMessage={sendMessage}
        onStartGame={vi.fn()}
        state={gameState}
        wordChoices={[]}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Chat message" });
    await user.type(input, "  Hello everyone  {Enter}");

    expect(sendMessage).toHaveBeenCalledWith("Hello everyone");
    expect(input).toHaveValue("");
  });

  it("restricts the artist and successful guessers during play", () => {
    const players = [
      {
        id: "player-1",
        username: "Alice",
        score: 0,
        isOwner: true,
        isArtist: true,
        hasCorrectlyGuessed: false,
      },
      {
        id: "player-2",
        username: "Bob",
        score: 0,
        isOwner: false,
        isArtist: false,
        hasCorrectlyGuessed: true,
      },
      {
        id: "player-3",
        username: "Carol",
        score: 0,
        isOwner: false,
        isArtist: false,
        hasCorrectlyGuessed: false,
      },
    ];
    const playingState: GameState = {
      ...gameState,
      phase: "Playing",
      currentArtistId: "player-1",
      players,
    };

    const { rerender } = render(
      <Game
        {...drawingProps}
        artistWord="Castle"
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={playingState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Chat message" })).toBeDisabled();
    expect(screen.getByPlaceholderText("You're drawing")).toBeDisabled();

    rerender(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-2"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={playingState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByPlaceholderText("You guessed the word")).toBeDisabled();

    rerender(
      <Game
        {...drawingProps}
        artistWord={null}
        currentPlayerId="player-3"
        error={null}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={playingState}
        wordChoices={[]}
      />,
    );

    expect(screen.getByPlaceholderText("Type a guess")).toBeEnabled();
  });
});
