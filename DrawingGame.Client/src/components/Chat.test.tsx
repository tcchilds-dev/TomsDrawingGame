import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Chat from "./Chat";

describe("Chat", () => {
  it("renders ordinary messages and concealed correct guesses", () => {
    render(
      <Chat
        currentPlayerId="player-1"
        messages={[
          {
            playerId: "player-1",
            username: "Alice",
            message: "Is it a castle?",
            timeStamp: "2026-08-21T12:00:00Z",
            messageType: "Chat",
          },
          {
            playerId: "player-2",
            username: "Bob",
            message: null,
            timeStamp: "2026-08-21T12:00:01Z",
            messageType: "CorrectGuess",
          },
        ]}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Is it a castle?")).toBeInTheDocument();
    expect(screen.getByText("Bob guessed the word!")).toBeInTheDocument();
    expect(screen.getByText("Is it a castle?").closest(".chat")).toHaveClass(
      "chat-end",
    );
    expect(screen.getByText("Bob guessed the word!").closest(".chat")).toHaveClass(
      "chat-start",
    );
    expect(screen.getByText("Bob guessed the word!")).toHaveClass(
      "chat-bubble-primary",
    );
  });
});
