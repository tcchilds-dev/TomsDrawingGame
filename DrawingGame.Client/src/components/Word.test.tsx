import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Word from "./Word";

describe("Word", () => {
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

    expect(screen.getByLabelText("Current word: Castle")).toHaveTextContent(
      "C a s t l e",
    );
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

    expect(screen.getByLabelText("Masked word: ______")).toHaveTextContent(
      "_ _ _ _ _ _",
    );
    expect(screen.queryByText("Castle")).not.toBeInTheDocument();
  });
});
