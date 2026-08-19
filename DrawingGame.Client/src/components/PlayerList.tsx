import type { Player } from "../game/types";

export default function PlayerList({ players }: { players: Player[] }) {
  return (
    <>
      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table">
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id}>
                <th>{index + 1}</th>
                <td>{player.username}</td>
                <td>{player.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
