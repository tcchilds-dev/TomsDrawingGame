import { HubConnectionState } from "@microsoft/signalr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameConnection } from "./GameConnection";
import type {
  CanvasState,
  ChatMessage,
  GameState,
  RoomEntry,
  Stroke,
} from "./types";

type HubEventHandler = (...args: unknown[]) => void;

class FakeHubConnection {
  state = HubConnectionState.Disconnected;
  nextResult: unknown;

  readonly invoke = vi.fn(async () => this.nextResult);
  readonly send = vi.fn(async () => undefined);
  readonly handlers = new Map<string, HubEventHandler>();
  private reconnectedHandler: (() => Promise<void> | void) | null = null;

  async start() {
    this.state = HubConnectionState.Connected;
  }

  on(methodName: string, handler: HubEventHandler) {
    this.handlers.set(methodName, handler);
  }

  off(methodName: string, handler: HubEventHandler) {
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

  emit(methodName: string, ...args: unknown[]) {
    this.handlers.get(methodName)?.(...args);
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

const canvasState: CanvasState = {
  completedStrokes: [],
  activeStroke: null,
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
    reconnectedHub.invoke
      .mockResolvedValueOnce(roomEntry)
      .mockResolvedValueOnce(canvasState);
    const connection = new GameConnection({
      connection: reconnectedHub,
      storage: sessionStorage,
    });
    const stateChanged = vi.fn();
    connection.onGameStateChanged(stateChanged);

    await reconnectedHub.reconnect();

    expect(reconnectedHub.invoke).toHaveBeenCalledWith("RejoinRoom", roomEntry.session);
    expect(reconnectedHub.invoke).toHaveBeenCalledWith("GetCanvasState");
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

  it("leaves the room and clears the saved session after the hub confirms", async () => {
    const hub = new FakeHubConnection();
    hub.nextResult = roomEntry;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });
    await connection.createRoom("Alice");

    await connection.leaveRoom();

    expect(hub.invoke).toHaveBeenLastCalledWith("LeaveRoom");
    expect(sessionStorage).toHaveLength(0);
  });

  it("keeps the saved session when leaving fails", async () => {
    const hub = new FakeHubConnection();
    hub.nextResult = roomEntry;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });
    await connection.createRoom("Alice");
    hub.invoke.mockRejectedValueOnce(new Error("Unable to leave room."));

    await expect(connection.leaveRoom()).rejects.toThrow("Unable to leave room.");

    expect(sessionStorage.getItem("drawing-game-room-session")).toBe(
      JSON.stringify(roomEntry.session),
    );
  });

  it("starts the game without sending client-owned room state", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await connection.startGame();

    expect(hub.invoke).toHaveBeenCalledWith("StartGame");
  });

  it("requests a rematch without sending client-owned room state", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await connection.playAgain();

    expect(hub.invoke).toHaveBeenCalledWith("PlayAgain");
  });

  it("requests private word choices for the current artist", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    hub.nextResult = ["Apple", "Castle", "Rocket"];
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await expect(connection.getWordChoices()).resolves.toEqual([
      "Apple",
      "Castle",
      "Rocket",
    ]);
    expect(hub.invoke).toHaveBeenCalledWith("GetWordChoices");
  });

  it("submits only the selected word", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await connection.chooseWord("Castle");

    expect(hub.invoke).toHaveBeenCalledWith("ChooseWord", "Castle");
  });

  it("requests the private current word without room state", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    hub.nextResult = "Castle";
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await expect(connection.getCurrentWord()).resolves.toBe("Castle");
    expect(hub.invoke).toHaveBeenCalledWith("GetCurrentWord");
  });

  it("requests a complete canvas snapshot", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    hub.nextResult = canvasState;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });

    await expect(connection.getCanvasState()).resolves.toEqual(canvasState);
    expect(hub.invoke).toHaveBeenCalledWith("GetCanvasState");
  });

  it("forwards incremental canvas events", () => {
    const hub = new FakeHubConnection();
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });
    const canvasUpdated = vi.fn();
    connection.onCanvasUpdated(canvasUpdated);
    const stroke: Stroke = {
      colour: "#111827",
      width: 8,
      points: [{ x: 0.25, y: 0.5 }],
    };
    const points = [{ x: 0.5, y: 0.75 }];

    hub.emit("StrokeStarted", stroke);
    hub.emit("StrokePointsAdded", points);
    hub.emit("StrokeEnded");
    hub.emit("SyncCanvas", canvasState);

    expect(canvasUpdated).toHaveBeenNthCalledWith(1, {
      type: "strokeStarted",
      stroke,
    });
    expect(canvasUpdated).toHaveBeenNthCalledWith(2, {
      type: "strokePointsAdded",
      points,
    });
    expect(canvasUpdated).toHaveBeenNthCalledWith(3, { type: "strokeEnded" });
    expect(canvasUpdated).toHaveBeenNthCalledWith(4, {
      type: "synced",
      state: canvasState,
    });
  });

  it("sends drawing commands without waiting for hub results", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });
    const firstPoint = { x: 0.25, y: 0.5 };
    const points = [{ x: 0.5, y: 0.75 }];

    await connection.beginStroke("#111827", 8, firstPoint);
    await connection.addStrokePoints(points);
    await connection.endStroke();
    await connection.undoStroke();
    await connection.clearCanvas();

    expect(hub.send).toHaveBeenNthCalledWith(
      1,
      "BeginStroke",
      "#111827",
      8,
      firstPoint,
    );
    expect(hub.send).toHaveBeenNthCalledWith(2, "AddStrokePoints", points);
    expect(hub.send).toHaveBeenNthCalledWith(3, "EndStroke");
    expect(hub.send).toHaveBeenNthCalledWith(4, "UndoStroke");
    expect(hub.send).toHaveBeenNthCalledWith(5, "ClearCanvas");
  });

  it("publishes received messages and invokes the chat command", async () => {
    const hub = new FakeHubConnection();
    hub.state = HubConnectionState.Connected;
    const connection = new GameConnection({
      connection: hub,
      storage: sessionStorage,
    });
    const messageReceived = vi.fn();
    connection.onMessageReceived(messageReceived);
    const message: ChatMessage = {
      playerId: "player-2",
      username: "Bob",
      message: "Hello",
      timeStamp: "2026-08-21T12:00:00Z",
      messageType: "Chat",
    };

    hub.emit("MessageReceived", message);
    await connection.sendMessage("Hello");

    expect(messageReceived).toHaveBeenCalledWith(message);
    expect(hub.invoke).toHaveBeenCalledWith("SendMessage", "Hello");
  });
});
