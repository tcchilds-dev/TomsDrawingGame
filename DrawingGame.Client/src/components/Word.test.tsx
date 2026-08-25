import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Word from "./Word";

describe("Word", () => {
  it("leaves the display blank when it is not in active use", () => {
    const { container } = render(
      <Word
        artistName={null}
        artistWord={null}
        choices={[]}
        displayWord={null}
        isArtist={false}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        phase="Lobby"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lets the artist select one of their private choices", async () => {
    const user = userEvent.setup();
    const chooseWord = vi.fn(async () => undefined);

    render(
      <Word
        artistName="Alice"
        artistWord={null}
        choices={["Apple", "Castle", "Rocket"]}
        displayWord={null}
        isArtist
        isSubmitting={false}
        onChooseWord={chooseWord}
        phase="WordChoice"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Castle" }));

    expect(chooseWord).toHaveBeenCalledWith("Castle");
  });

  it("tells other players who is choosing without exposing the choices", () => {
    render(
      <Word
        artistName="Alice"
        artistWord={null}
        choices={[]}
        displayWord={null}
        isArtist={false}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        phase="WordChoice"
      />,
    );

    expect(screen.getByText("Alice is choosing a word")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the real word only to the artist while playing", () => {
    const { rerender } = render(
      <Word
        artistName="Alice"
        artistWord="Castle"
        choices={[]}
        displayWord="______"
        isArtist
        isSubmitting={false}
        onChooseWord={vi.fn()}
        phase="Playing"
      />,
    );

    expect(
      screen.getByLabelText("Current word: Castle, 6 letters"),
    ).toHaveTextContent("C a s t l e(6 letters)");
    expect(screen.queryByText("______")).not.toBeInTheDocument();

    rerender(
      <Word
        artistName="Alice"
        artistWord={null}
        choices={[]}
        displayWord="______"
        isArtist={false}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        phase="Playing"
      />,
    );

    expect(
      screen.getByLabelText("Masked word: ______, 6 letters"),
    ).toHaveTextContent("_ _ _ _ _ _(6 letters)");
    expect(screen.queryByText("Castle")).not.toBeInTheDocument();
  });

  it("counts letters without including spaces in multi-word prompts", () => {
    render(
      <Word
        artistName="Alice"
        artistWord={null}
        choices={[]}
        displayWord="_____ _____"
        isArtist={false}
        isSubmitting={false}
        onChooseWord={vi.fn()}
        phase="Playing"
      />,
    );

    expect(
      screen.getByLabelText("Masked word: _____ _____, 10 letters"),
    ).toHaveTextContent("(10 letters)");
  });
});
