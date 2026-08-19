import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { RoomSessionStore } from "./RoomSessionStore";
import type { GameState, RoomEntry } from "./types";

type GameStateListener = (state: GameState) => void;
type SessionExpiredListener = (error: unknown) => void;

type GameHubConnection = {
  readonly state: HubConnectionState;
  start: () => Promise<void>;
  invoke: (methodName: string, ...args: unknown[]) => Promise<unknown>;
  on: (methodName: string, handler: (state: GameState) => void) => void;
  onreconnected: (handler: () => Promise<void> | void) => void;
};

type GameConnectionOptions = {
  connection?: GameHubConnection;
  storage?: Storage;
};

export class GameConnection {
  private readonly connection: GameHubConnection;
  private readonly gameStateListeners = new Set<GameStateListener>();
  private readonly roomSessionStore: RoomSessionStore;
  private readonly sessionExpiredListeners = new Set<SessionExpiredListener>();
  private startPromise: Promise<void> | null = null;

  constructor(options: GameConnectionOptions = {}) {
    this.connection = options.connection ?? createHubConnection();
    this.roomSessionStore = new RoomSessionStore(
      options.storage ?? window.sessionStorage,
    );

    this.connection.on("SyncGameState", (state) => {
      this.publishGameState(state);
    });
    this.connection.onreconnected(async () => {
      try {
        const entry = await this.rejoinRoom();
        if (entry) {
          this.publishGameState(entry.state);
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
