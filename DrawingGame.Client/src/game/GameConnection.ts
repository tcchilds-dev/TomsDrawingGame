import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { RoomSessionStore } from "./RoomSessionStore";
import type {
  CanvasState,
  CanvasUpdate,
  ChatMessage,
  GameState,
  Point,
  RoomEntry,
  Stroke,
} from "./types";

type GameStateListener = (state: GameState) => void;
type CanvasUpdateListener = (update: CanvasUpdate) => void;
type MessageReceivedListener = (message: ChatMessage) => void;
type SessionExpiredListener = (error: unknown) => void;
type HubEventHandler = (...args: unknown[]) => void;

type GameHubConnection = {
  readonly state: HubConnectionState;
  start: () => Promise<void>;
  invoke: (methodName: string, ...args: unknown[]) => Promise<unknown>;
  send: (methodName: string, ...args: unknown[]) => Promise<void>;
  on: (methodName: string, handler: HubEventHandler) => void;
  onreconnected: (handler: () => Promise<void> | void) => void;
};

type GameConnectionOptions = {
  connection?: GameHubConnection;
  storage?: Storage;
};

export class GameConnection {
  private readonly connection: GameHubConnection;
  private readonly canvasUpdateListeners = new Set<CanvasUpdateListener>();
  private readonly gameStateListeners = new Set<GameStateListener>();
  private readonly messageReceivedListeners = new Set<MessageReceivedListener>();
  private readonly roomSessionStore: RoomSessionStore;
  private readonly sessionExpiredListeners = new Set<SessionExpiredListener>();
  private startPromise: Promise<void> | null = null;

  constructor(options: GameConnectionOptions = {}) {
    this.connection = options.connection ?? createHubConnection();
    this.roomSessionStore = new RoomSessionStore(
      options.storage ?? window.sessionStorage,
    );

    this.connection.on("SyncGameState", (state) => {
      this.publishGameState(state as GameState);
    });
    this.connection.on("SyncCanvas", (state) => {
      this.publishCanvasUpdate({
        type: "synced",
        state: state as CanvasState,
      });
    });
    this.connection.on("StrokeStarted", (stroke) => {
      this.publishCanvasUpdate({
        type: "strokeStarted",
        stroke: stroke as Stroke,
      });
    });
    this.connection.on("StrokePointsAdded", (points) => {
      this.publishCanvasUpdate({
        type: "strokePointsAdded",
        points: points as Point[],
      });
    });
    this.connection.on("StrokeEnded", () => {
      this.publishCanvasUpdate({ type: "strokeEnded" });
    });
    this.connection.on("MessageReceived", (message) => {
      this.publishMessageReceived(message as ChatMessage);
    });
    this.connection.onreconnected(async () => {
      try {
        const entry = await this.rejoinRoom();
        if (entry) {
          this.publishGameState(entry.state);
          this.publishCanvasUpdate({
            type: "synced",
            state: await this.getCanvasState(),
          });
        }
      } catch (error) {
        this.publishSessionExpired(error);
      }
    });
  }

  async start() {
    if (this.connection.state === HubConnectionState.Connected) {
      return;
    }

    if (!this.startPromise) {
      this.startPromise = this.connection.start().finally(() => {
        this.startPromise = null;
      });
    }

    await this.startPromise;
  }

  async createRoom(username: string): Promise<RoomEntry> {
    return this.enterRoom("CreateRoom", username);
  }

  async joinRoom(username: string, roomCode: string): Promise<RoomEntry> {
    return this.enterRoom("JoinRoom", username, roomCode);
  }

  async leaveRoom(): Promise<void> {
    await this.start();
    await this.connection.invoke("LeaveRoom");
    this.roomSessionStore.clear();
  }

  async startGame(): Promise<void> {
    await this.start();
    await this.connection.invoke("StartGame");
  }

  async getWordChoices(): Promise<string[]> {
    await this.start();
    return (await this.connection.invoke("GetWordChoices")) as string[];
  }

  async chooseWord(word: string): Promise<void> {
    await this.start();
    await this.connection.invoke("ChooseWord", word);
  }

  async getCurrentWord(): Promise<string> {
    await this.start();
    return (await this.connection.invoke("GetCurrentWord")) as string;
  }

  async getCanvasState(): Promise<CanvasState> {
    await this.start();
    return (await this.connection.invoke("GetCanvasState")) as CanvasState;
  }

  async beginStroke(colour: string, width: number, firstPoint: Point) {
    await this.start();
    await this.connection.send("BeginStroke", colour, width, firstPoint);
  }

  async addStrokePoints(points: Point[]) {
    await this.start();
    await this.connection.send("AddStrokePoints", points);
  }

  async endStroke() {
    await this.start();
    await this.connection.send("EndStroke");
  }

  async undoStroke() {
    await this.start();
    await this.connection.send("UndoStroke");
  }

  async clearCanvas() {
    await this.start();
    await this.connection.send("ClearCanvas");
  }

  async sendMessage(message: string) {
    await this.start();
    await this.connection.invoke("SendMessage", message);
  }

  async rejoinRoom(): Promise<RoomEntry | null> {
    const session = this.roomSessionStore.load();
    if (!session) {
      return null;
    }

    await this.start();

    try {
      return (await this.connection.invoke("RejoinRoom", session)) as RoomEntry;
    } catch (error) {
      this.roomSessionStore.clear();
      throw error;
    }
  }

  onGameStateChanged(listener: GameStateListener) {
    this.gameStateListeners.add(listener);
    return () => this.gameStateListeners.delete(listener);
  }

  onCanvasUpdated(listener: CanvasUpdateListener) {
    this.canvasUpdateListeners.add(listener);
    return () => this.canvasUpdateListeners.delete(listener);
  }

  onMessageReceived(listener: MessageReceivedListener) {
    this.messageReceivedListeners.add(listener);
    return () => this.messageReceivedListeners.delete(listener);
  }

  onSessionExpired(listener: SessionExpiredListener) {
    this.sessionExpiredListeners.add(listener);
    return () => this.sessionExpiredListeners.delete(listener);
  }

  private async enterRoom(methodName: string, ...args: unknown[]) {
    await this.start();
    const entry = (await this.connection.invoke(methodName, ...args)) as RoomEntry;
    this.roomSessionStore.save(entry.session);
    return entry;
  }

  private publishGameState(state: GameState) {
    for (const listener of this.gameStateListeners) {
      listener(state);
    }
  }

  private publishCanvasUpdate(update: CanvasUpdate) {
    for (const listener of this.canvasUpdateListeners) {
      listener(update);
    }
  }

  private publishMessageReceived(message: ChatMessage) {
    for (const listener of this.messageReceivedListeners) {
      listener(message);
    }
  }

  private publishSessionExpired(error: unknown) {
    for (const listener of this.sessionExpiredListeners) {
      listener(error);
    }
  }
}

function createHubConnection(): GameHubConnection {
  return new HubConnectionBuilder()
    .withUrl("/game")
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
}
