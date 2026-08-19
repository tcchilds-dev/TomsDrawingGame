import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export class GameConnection {
  private readonly connection: HubConnection;
  private startPromise: Promise<void> | null = null;

  constructor() {
    this.connection = new HubConnectionBuilder()
      .withUrl("/game")
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();
  }

  async start() {
    if (this.connection.state === HubConnectionState.Connected) {
      return;
    }
    if (!this.startPromise) {
      this.startPromise = this.connection
        .start()
        .catch((error: unknown) => {
          throw error;
        })
        .finally(() => {
          this.startPromise = null;
        });
    }
    await this.startPromise;
  }
}
