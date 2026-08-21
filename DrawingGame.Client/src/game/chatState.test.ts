import { describe, expect, it } from "vitest";
import { applyReceivedMessage } from "./chatState";
import type { ChatMessage, GameState } from "./types";

const state: GameState = {
  roomId: "aBc12De",
  ownerId: "player-1",
  config: {
    maxPlayers: 6,
    wordSelectionSize: 3,
    wordChoiceTimerSeconds: 30,
    drawTimerSeconds: 60,
    numberOfRounds: 3,
  },
  phase: "Playing",
  currentRound: 1,
  currentArtistId: "player-1",
  displayWord: "_ _ _ _ _ _",
  phaseEndsAt: null,
  players: [
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
      hasCorrectlyGuessed: false,
    },
  ],
  chatHistory: [],
};

describe("applyReceivedMessage", () => {
  it("appends ordinary chat without changing player state", () => {
    const message: ChatMessage = {
      playerId: "player-2",
      username: "Bob",
      message: "Is it a castle?",
      timeStamp: "2026-08-21T12:00:00Z",
      messageType: "Chat",
    };

    const result = applyReceivedMessage(state, message);

    expect(result.chatHistory).toEqual([message]);
    expect(result.players).toBe(state.players);
  });

  it("marks the player identified by a correct-guess message", () => {
    const message: ChatMessage = {
      playerId: "player-2",
      username: "Bob",
      message: null,
      timeStamp: "2026-08-21T12:00:00Z",
      messageType: "CorrectGuess",
    };

    const result = applyReceivedMessage(state, message);

    expect(result.chatHistory).toEqual([message]);
    expect(
      result.players.find((player) => player.id === "player-2")
        ?.hasCorrectlyGuessed,
    ).toBe(true);
  });
});
