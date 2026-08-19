import type { RoomSession } from "./types";

const roomSessionKey = "drawing-game-room-session";

export class RoomSessionStore {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  load(): RoomSession | null {
    const storedSession = this.storage.getItem(roomSessionKey);
    if (storedSession === null) {
      return null;
    }

    try {
      const session: unknown = JSON.parse(storedSession);
      if (!isRoomSession(session)) {
        this.clear();
        return null;
      }

      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: RoomSession) {
    this.storage.setItem(roomSessionKey, JSON.stringify(session));
  }

  clear() {
    this.storage.removeItem(roomSessionKey);
  }
}

function isRoomSession(value: unknown): value is RoomSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.roomId === "string" &&
    session.roomId.length > 0 &&
    typeof session.playerId === "string" &&
    session.playerId.length > 0
  );
}
