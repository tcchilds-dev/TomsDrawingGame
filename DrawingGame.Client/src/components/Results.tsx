import type { Player } from "../game/types";

type ResultsProps = {
  isOwner: boolean;
  isSubmitting: boolean;
  onPlayAgain: () => Promise<void> | void;
  players: Player[];
};

export default function Results({
  isOwner,
  isSubmitting,
  onPlayAgain,
  players,
}: ResultsProps) {
  const winningScore = Math.max(...players.map((player) => player.score));
  const winners = players.filter((player) => player.score === winningScore);
  const isDraw = winners.length > 1;
  const resultColour = isDraw ? "text-warning" : "text-success";

  return (
    <div className="flex h-full items-center justify-center">
      <section
        aria-labelledby="results-heading"
        className="card w-full max-w-md bg-base-100 shadow-sm"
      >
        <div className="card-body items-center text-center">
          <h1 className="card-title text-2xl" id="results-heading">
            Results
          </h1>

          <p className={`mt-4 text-lg font-semibold ${resultColour}`}>
            {isDraw ? "It's a draw!" : "Winner"}
          </p>
          <p className={`text-2xl font-semibold ${resultColour}`}>
            {winners.map((player) => player.username).join(" & ")}
          </p>
          <p className="text-lg text-base-content/70">
            {winningScore} {winningScore === 1 ? "point" : "points"}
            {isDraw ? " each" : ""}
          </p>

          <div className="card-actions mt-6">
            {isOwner ? (
              <button
                className="btn btn-primary text-lg"
                disabled={isSubmitting}
                onClick={() => void onPlayAgain()}
                type="button"
              >
                Play Again
              </button>
            ) : (
              <p className="text-lg">Waiting for the owner to play again</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
