import { beforeEach, describe, expect, it } from "vitest";
import type { RoomSession } from "./types";
import { RoomSessionStore } from "./RoomSessionStore";

describe("RoomSessionStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("restores a room session after a page-level object is recreated", () => {
    const session: RoomSession = {
      roomId: "aBc12De",
      playerId: "player-1",
    };

    new RoomSessionStore(sessionStorage).save(session);

    expect(new RoomSessionStore(sessionStorage).load()).toEqual(session);
  });

  it("discards malformed stored data", () => {
    sessionStorage.setItem("drawing-game-room-session", "not-json");
    const store = new RoomSessionStore(sessionStorage);

    expect(store.load()).toBeNull();
    expect(sessionStorage).toHaveLength(0);
  });
});
