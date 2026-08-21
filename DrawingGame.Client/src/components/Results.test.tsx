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

    expect(screen.getByRole("heading", { name: "Results" })).toHaveClass(
      "text-2xl",
    );
    expect(screen.getByText("Winner")).toHaveClass("text-success", "text-lg");
    expect(screen.getByText("Alice")).toHaveClass("text-success", "text-2xl");
    expect(screen.getByText("240 points")).toHaveClass("text-lg");
    expect(screen.getByRole("button", { name: "Play Again" })).toHaveClass(
      "text-lg",
    );

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

    expect(screen.getByText("It's a draw!")).toHaveClass(
      "text-warning",
      "text-lg",
    );
    expect(screen.getByText("Alice & Bob")).toHaveClass(
      "text-warning",
      "text-2xl",
    );
    expect(screen.getByText("240 points each")).toBeInTheDocument();
    expect(
      screen.getByText("Waiting for the owner to play again"),
    ).toHaveClass("text-lg");
    expect(
      screen.queryByRole("button", { name: "Play Again" }),
    ).not.toBeInTheDocument();
  });
});
