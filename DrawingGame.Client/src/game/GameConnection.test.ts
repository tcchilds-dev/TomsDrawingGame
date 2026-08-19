import { HubConnectionState } from "@microsoft/signalr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameConnection } from "./GameConnection";
import type { GameState, RoomEntry } from "./types";

class FakeHubConnection {
  state = HubConnectionState.Disconnected;
  nextResult: unknown;

  readonly invoke = vi.fn(async () => this.nextResult);
  readonly handlers = new Map<string, (value: GameState) => void>();
  private reconnectedHandler: (() => Promise<void> | void) | null = null;

  async start() {
    this.state = HubConnectionState.Connected;
  }

  on(methodName: string, handler: (value: GameState) => void) {
    this.handlers.set(methodName, handler);
  }

  off(methodName: string, handler: (value: GameState) => void) {
    if (this.handlers.get(methodName) === handler) {
      this.handlers.delete(methodName);
    }
  }

  onreconnected(handler: () => Promise<void> | void) {
    this.reconnectedHandler = handler;
  }

  async reconnect() {
    await this.reconnectedHandler?.();
  }
}

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

const roomEntry: RoomEntry = {
  session: {
    roomId: "aBc12De",
    playerId: "player-1",
  },
  state: gameState,
};

describe("GameConnection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("persists the session returned when a room is created", async () => {
    const hub = new FakeHubConnection();
    hub.nextResult = roomEntry;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await expect(connection.createRoom("Alice")).resolves.toEqual(roomEntry);
    expect(hub.invoke).toHaveBeenCalledWith("CreateRoom", "Alice");

    const reloadedHub = new FakeHubConnection();
    reloadedHub.nextResult = roomEntry;
    const reloadedConnection = new GameConnection({
      connection: reloadedHub,
      storage: sessionStorage,
    });

    await expect(reloadedConnection.rejoinRoom()).resolves.toEqual(roomEntry);
    expect(reloadedHub.invoke).toHaveBeenCalledWith("RejoinRoom", roomEntry.session);
  });

  it("resumes and publishes fresh state after SignalR reconnects", async () => {
    const firstHub = new FakeHubConnection();
    firstHub.nextResult = roomEntry;
    const firstConnection = new GameConnection({
      connection: firstHub,
      storage: sessionStorage,
    });
    await firstConnection.createRoom("Alice");

    const reconnectedHub = new FakeHubConnection();
    reconnectedHub.state = HubConnectionState.Connected;
    reconnectedHub.nextResult = roomEntry;
    const connection = new GameConnection({
      connection: reconnectedHub,
      storage: sessionStorage,
    });
    const stateChanged = vi.fn();
    connection.onGameStateChanged(stateChanged);

    await reconnectedHub.reconnect();

    expect(reconnectedHub.invoke).toHaveBeenCalledWith("RejoinRoom", roomEntry.session);
    expect(stateChanged).toHaveBeenCalledWith(gameState);
  });

  it("clears an expired session when resuming fails", async () => {
    sessionStorage.setItem(
      "drawing-game-room-session",
      JSON.stringify(roomEntry.session),
    );
    const hub = new FakeHubConnection();
    hub.invoke.mockRejectedValueOnce(new Error("Room session is no longer valid."));
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await expect(connection.rejoinRoom()).rejects.toThrow(
      "Room session is no longer valid.",
    );
    expect(sessionStorage).toHaveLength(0);
  });
});
