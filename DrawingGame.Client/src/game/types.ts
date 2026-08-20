export type Player = {
  id: string;
  username: string;
  score: number;
  isOwner: boolean;
  isArtist: boolean;
  hasCorrectlyGuessed: boolean;
};

export type ChatMessageType = "Chat" | "CorrectGuess" | "System";

export type ChatMessage = {
  playerId: string | null;
  username: string | null;
  message: string;
  timeStamp: string;
  messageType: ChatMessageType;
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

export type RoomSession = {
  roomId: string;
  playerId: string;
};

export type RoomEntry = {
  session: RoomSession;
  state: GameState;
};

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  colour: string;
  width: number;
  points: Point[];
};

export type CanvasState = {
  completedStrokes: Stroke[];
  activeStroke: Stroke | null;
};

export type CanvasUpdate =
  | { type: "synced"; state: CanvasState }
  | { type: "strokeStarted"; stroke: Stroke }
  | { type: "strokePointsAdded"; points: Point[] }
  | { type: "strokeEnded" };
