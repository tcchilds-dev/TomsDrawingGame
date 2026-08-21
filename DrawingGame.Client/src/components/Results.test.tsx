import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Player } from "../game/types";
import Results from "./Results";

const players: Player[] = [
  {
    id: "player-1",
    username: "Alice",
    score: 240,
    isOwner: true,
    isArtist: false,
    hasCorrectlyGuessed: false,
  },
  {
    id: "player-2",
    username: "Bob",
    score: 190,
    isOwner: false,
    isArtist: false,
    hasCorrectlyGuessed: false,
  },
];

describe("Results", () => {
  it("announces the winner and lets the owner request another game", async () => {
    const user = userEvent.setup();
    const playAgain = vi.fn(async () => undefined);

    render(
      <Results
        isOwner
        isSubmitting={false}
        onPlayAgain={playAgain}
        players={players}
      />,
    );

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("240 points")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play Again" }));

    expect(playAgain).toHaveBeenCalledOnce();
  });

  it("announces tied winners and asks non-owners to wait", () => {
    render(
      <Results
        isOwner={false}
        isSubmitting={false}
        onPlayAgain={vi.fn()}
        players={[players[0], { ...players[1], score: 240 }]}
      />,
    );

    expect(screen.getByText("It's a draw!")).toBeInTheDocument();
    expect(screen.getByText("Alice & Bob")).toBeInTheDocument();
    expect(screen.getByText("240 points each")).toBeInTheDocument();
    expect(
      screen.getByText("Waiting for the owner to play again"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play Again" }),
    ).not.toBeInTheDocument();
  });
});
