import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameConfig } from "../game/types";
import GameSettings from "./GameSettings";

const config: GameConfig = {
  maxPlayers: 6,
  wordSelectionSize: 3,
  wordChoiceTimerSeconds: 30,
  drawTimerSeconds: 80,
  numberOfRounds: 3,
};

describe("GameSettings", () => {
  it("lets the owner update settings within the configured ranges", async () => {
    const update = vi.fn(async () => undefined);

    render(<GameSettings config={config} isOwner onUpdate={update} />);

    const wordChoices = screen.getByRole("group", { name: "Word choices" });
    expect(
      within(wordChoices).getByRole("button", { name: "3 word choices" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(wordChoices).getByRole("button", { name: "5 word choices" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("slider", { name: "Word choices" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Word-choice time")).toHaveAttribute("min", "10");
    expect(screen.getByLabelText("Word-choice time")).toHaveAttribute("max", "30");
    expect(screen.getByLabelText("Drawing time")).toHaveAttribute("min", "30");
    expect(screen.getByLabelText("Drawing time")).toHaveAttribute("max", "120");
    expect(screen.getByLabelText("Rounds")).toHaveAttribute("min", "1");
    expect(screen.getByLabelText("Rounds")).toHaveAttribute("max", "10");

    fireEvent.click(
      within(wordChoices).getByRole("button", { name: "5 word choices" }),
    );

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        wordSelectionSize: 5,
        wordChoiceTimerSeconds: 30,
        drawTimerSeconds: 80,
        numberOfRounds: 3,
      }),
    );

    fireEvent.change(screen.getByLabelText("Drawing time"), {
      target: { value: "90" },
    });

    expect(screen.getByText("90 seconds")).toBeInTheDocument();
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        wordSelectionSize: 5,
        wordChoiceTimerSeconds: 30,
        drawTimerSeconds: 90,
        numberOfRounds: 3,
      }),
    );
  });

  it("shows synchronized settings as read-only to other players", () => {
    const { rerender } = render(
      <GameSettings config={config} isOwner={false} onUpdate={vi.fn()} />,
    );

    for (const slider of screen.getAllByRole("slider")) {
      expect(slider).toBeDisabled();
    }
    for (const button of within(
      screen.getByRole("group", { name: "Word choices" }),
    ).getAllByRole("button")) {
      expect(button).toBeDisabled();
    }

    rerender(
      <GameSettings
        config={{ ...config, drawTimerSeconds: 100, numberOfRounds: 5 }}
        isOwner={false}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Drawing time")).toHaveValue("100");
    expect(screen.getByLabelText("Rounds")).toHaveValue("5");
    expect(screen.getByText("100 seconds")).toBeInTheDocument();
    expect(screen.getByText("5 rounds")).toBeInTheDocument();
  });

  it("coalesces rapid changes while an update is in flight", async () => {
    let finishFirstUpdate: (() => void) | undefined;
    const update = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishFirstUpdate = resolve;
          }),
      )
      .mockResolvedValue(undefined);

    render(<GameSettings config={config} isOwner onUpdate={update} />);

    fireEvent.change(screen.getByLabelText("Drawing time"), {
      target: { value: "81" },
    });
    fireEvent.change(screen.getByLabelText("Drawing time"), {
      target: { value: "82" },
    });
    fireEvent.change(screen.getByLabelText("Rounds"), {
      target: { value: "4" },
    });

    expect(update).toHaveBeenCalledTimes(1);
    finishFirstUpdate?.();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith({
      wordSelectionSize: 3,
      wordChoiceTimerSeconds: 30,
      drawTimerSeconds: 82,
      numberOfRounds: 4,
    });
  });
});
