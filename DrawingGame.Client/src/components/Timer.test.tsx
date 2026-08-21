import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Timer from "./Timer";

describe("Timer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down from the server phase deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));

    render(<Timer phaseEndsAt="2026-08-21T12:00:30.000Z" />);

    expect(screen.getByLabelText("30 seconds remaining")).toHaveTextContent(
      "30",
    );

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(screen.getByLabelText("29 seconds remaining")).toHaveTextContent(
      "29",
    );

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByLabelText("0 seconds remaining")).toHaveTextContent("0");
  });

  it("stays empty when the current phase has no deadline", () => {
    render(<Timer phaseEndsAt={null} />);

    expect(screen.queryByLabelText(/seconds remaining/)).not.toBeInTheDocument();
  });
});
