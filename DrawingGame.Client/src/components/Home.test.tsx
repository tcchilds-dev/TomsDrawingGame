import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "./Home";

describe("Home", () => {
  it("creates a room with the entered username", async () => {
    const user = userEvent.setup();
    const createRoom = vi.fn(async () => undefined);

    render(
      <Home
        error={null}
        isSubmitting={false}
        onCreateRoom={createRoom}
        onJoinRoom={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Room entry")).toHaveClass(
      "flex",
      "flex-col",
      "gap-2",
    );

    await user.type(screen.getByPlaceholderText("input name"), "Alice");
    await user.click(screen.getByRole("button", { name: "Create Room" }));

    expect(createRoom).toHaveBeenCalledWith("Alice");
  });

  it("joins a case-sensitive room code entered below the username", async () => {
    const user = userEvent.setup();
    const joinRoom = vi.fn(async () => undefined);

    render(
      <Home
        error={null}
        isSubmitting={false}
        onCreateRoom={vi.fn()}
        onJoinRoom={joinRoom}
      />,
    );

    await user.type(screen.getByPlaceholderText("input name"), "Bob");
    await user.type(screen.getByPlaceholderText("room code"), "aBc12De");
    await user.click(screen.getByRole("button", { name: "Join Room" }));

    expect(joinRoom).toHaveBeenCalledWith("Bob", "aBc12De");
  });

  it("shows room errors and disables actions while a request is running", () => {
    render(
      <Home
        error="Room not found."
        isSubmitting
        onCreateRoom={vi.fn()}
        onJoinRoom={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Room not found.");
    expect(screen.getByRole("button", { name: "Create Room" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join Room" })).toBeDisabled();
  });
});
