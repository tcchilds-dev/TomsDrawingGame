import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RoomCodeButton from "./RoomCodeButton";

describe("RoomCodeButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies the room code and briefly uses the primary colour", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<RoomCodeButton roomCode="aBc12De" />);

    const button = screen.getByRole("button", {
      name: "Copy room code aBc12De",
    });
    expect(button).toHaveClass("btn-neutral", "text-white");

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("aBc12De");
    expect(
      screen.getByRole("button", { name: "Copied room code aBc12De" }),
    ).toHaveClass("btn-primary", "text-white");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      screen.getByRole("button", { name: "Copy room code aBc12De" }),
    ).toHaveClass("btn-neutral");
  });
});
