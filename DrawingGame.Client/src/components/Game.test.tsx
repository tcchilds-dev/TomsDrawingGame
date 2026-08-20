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
        error={null}
        isLeaving={false}
        onLeaveRoom={leaveRoom}
        state={gameState}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Leave" }));

    expect(leaveRoom).toHaveBeenCalledOnce();
  });

  it("disables leaving and displays an error when requested", () => {
    render(
      <Game
        error="Unable to leave room."
        isLeaving
        onLeaveRoom={vi.fn()}
        state={gameState}
      />,
    );

    expect(screen.getByRole("button", { name: "Leave" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to leave room.");
  });
});
