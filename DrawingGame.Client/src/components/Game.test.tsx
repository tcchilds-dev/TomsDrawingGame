import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../game/types";
import Game from "./Game";

vi.mock("./Canvas", async () => {
  const { forwardRef } = await import("react");

  return {
    default: forwardRef(function Canvas() {
      return <canvas aria-label="Drawing canvas" />;
    }),
  };
});

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
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onLeaveRoom={leaveRoom}
        onStartGame={vi.fn()}
        state={gameState}
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
        currentPlayerId="player-1"
        error="Unable to leave room."
        isSubmitting
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={gameState}
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
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onLeaveRoom={vi.fn()}
        onStartGame={startGame}
        state={gameState}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start Game" }));

    expect(startGame).toHaveBeenCalledOnce();
  });

  it("asks non-owners to wait instead of showing the start action", () => {
    render(
      <Game
        currentPlayerId="player-2"
        error={null}
        isSubmitting={false}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={gameState}
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
        currentPlayerId="player-1"
        error={null}
        isSubmitting={false}
        onLeaveRoom={vi.fn()}
        onStartGame={vi.fn()}
        state={{ ...gameState, currentRound: 1, phase: "WordChoice" }}
      />,
    );

    expect(screen.getByText("Round: 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start Game" }),
    ).not.toBeInTheDocument();
  });
});
