import type { ChatMessage, GameState } from "./types";

export function applyReceivedMessage(
  state: GameState,
  message: ChatMessage,
): GameState {
  return {
    ...state,
    chatHistory: [...state.chatHistory, message],
    players:
      message.messageType === "CorrectGuess" && message.playerId
        ? state.players.map((player) =>
            player.id === message.playerId
              ? { ...player, hasCorrectlyGuessed: true }
              : player,
          )
        : state.players,
  };
}
