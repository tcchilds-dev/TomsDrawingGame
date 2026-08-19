export type Player = {
  id: string;
  username: string;
  score: number;
  isOwner: boolean;
  isArtist: boolean;
  hasCorrectlyGuess: boolean;
};

export type ChatMessageType = "Chat" | "CorrectGuess" | "System";

export type ChatMessage = {
  playerId: string | null;
  username: string | null;
  message: string;
  timeStamp: string;
  kind: ChatMessageType;
};

export type GameConfig = {
  maxPlayers: number;
  wordSelectionSize: number;
  wordChoiceTimerSeconds: number;
  drawTimerSeconds: number;
  numberOfRounds: number;
};

export type GamePhase = "Lobby" | "WordChoice" | "Playing" | "Results";

export type GameState = {
  roomId: string;
  ownerId: string;
  config: GameConfig;
  phase: GamePhase;
  currentRound: number | null;
  currentArtistId: string | null;
  displayWord: string | null;
  phaseEndsAt: string | null;
  players: Player[];
  chatHistory: ChatMessage[];
};

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  colour: string;
  width: number;
  points: Point[];
  isComplete: boolean;
};

export type CanvasState = {
  strokes: Stroke[];
};
