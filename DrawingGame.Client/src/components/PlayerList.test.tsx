import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Player } from "../game/types";
import PlayerList from "./PlayerList";

describe("PlayerList", () => {
  it("renders the room's players and scores in the existing table", () => {
    const players: Player[] = [
      {
        id: "player-1",
        username: "Alice",
        score: 100,
        isOwner: true,
        isArtist: false,
        hasCorrectlyGuessed: false,
      },
      {
        id: "player-2",
        username: "Bob",
        score: 25,
        isOwner: false,
        isArtist: false,
        hasCorrectlyGuessed: false,
      },
    ];

    render(<PlayerList players={players} />);

    const rows = screen.getAllByRole("row");
    expect(within(rows[0]).getByText("1")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Alice")).toBeInTheDocument();
    expect(within(rows[0]).getByText("100")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Bob")).toBeInTheDocument();
    expect(within(rows[1]).getByText("25")).toBeInTheDocument();
  });
});
