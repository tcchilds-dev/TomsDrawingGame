import type { GamePhase } from "../game/types";

type WordProps = {
  artistName: string | null;
  artistWord: string | null;
  choices: string[];
  displayWord: string | null;
  isArtist: boolean;
  isSubmitting: boolean;
  onChooseWord: (word: string) => Promise<void> | void;
  phase: GamePhase;
};

export default function Word({
  artistName,
  artistWord,
  choices,
  displayWord,
  isArtist,
  isSubmitting,
  onChooseWord,
  phase,
}: WordProps) {
  if (phase === "WordChoice") {
    if (!isArtist) {
      return <h1>{artistName ?? "The artist"} is choosing a word</h1>;
    }

    if (choices.length === 0) {
      return <h1>Loading word choices...</h1>;
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <span>Choose a word:</span>
        {choices.map((word) => (
          <button
            className="btn btn-sm btn-primary"
            disabled={isSubmitting}
            key={word}
            onClick={() => void onChooseWord(word)}
            type="button"
          >
            {word}
          </button>
        ))}
      </div>
    );
  }

  if (phase === "Playing") {
    const word = isArtist ? artistWord : displayWord;

    if (!word) {
      return <h1>Loading word...</h1>;
    }

    return (
      <h1
        aria-label={`${isArtist ? "Current word" : "Masked word"}: ${word}`}
      >
        {spaceCharacters(word)}
      </h1>
    );
  }

  return <h1>WORD</h1>;
}

function spaceCharacters(word: string) {
  return Array.from(word).join(" ");
}
