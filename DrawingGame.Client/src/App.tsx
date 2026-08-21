import { useCallback, useEffect, useRef, useState } from "react";
import Game from "./components/Game";
import Home from "./components/Home";
import { GameConnection } from "./game/GameConnection";
import { applyCanvasUpdate, emptyCanvasState } from "./game/canvasState";
import { applyReceivedMessage } from "./game/chatState";
import type { CanvasState, GameState, Point, RoomEntry } from "./game/types";

function App() {
  const [gameConnection] = useState(() => new GameConnection());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [canvasState, setCanvasState] =
    useState<CanvasState>(emptyCanvasState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [artistWord, setArtistWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRoomPromise = useRef<Promise<RoomEntry | null> | null>(null);

  useEffect(() => {
    let isActive = true;
    const stopListeningForState = gameConnection.onGameStateChanged(setGameState);
    const stopListeningForCanvas = gameConnection.onCanvasUpdated((update) => {
      setCanvasState((state) => applyCanvasUpdate(state, update));
    });
    const stopListeningForMessages = gameConnection.onMessageReceived(
      (message) => {
        setGameState((state) =>
          state ? applyReceivedMessage(state, message) : state,
        );
      },
    );
    const stopListeningForExpiry = gameConnection.onSessionExpired((reason) => {
      setGameState(null);
      setCanvasState(emptyCanvasState);
      setPlayerId(null);
      setError(getErrorMessage(reason));
    });

    initialRoomPromise.current ??= (async () => {
      await gameConnection.start();
      return gameConnection.rejoinRoom();
    })();

    void initialRoomPromise.current
      .then((entry) => {
        if (isActive && entry) {
          setGameState(entry.state);
          setPlayerId(entry.session.playerId);
        }
      })
      .catch((reason: unknown) => {
        if (isActive) {
          setError(getErrorMessage(reason));
        }
      });

    return () => {
      isActive = false;
      stopListeningForState();
      stopListeningForCanvas();
      stopListeningForMessages();
      stopListeningForExpiry();
    };
  }, [gameConnection]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => setError(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const roomId = gameState?.roomId;
  const phase = gameState?.phase;
  const currentArtistId = gameState?.currentArtistId;

  useEffect(() => {
    let isActive = true;
    setCanvasState(emptyCanvasState);

    if (!roomId) {
      return;
    }

    void gameConnection
      .getCanvasState()
      .then((state) => {
        if (isActive) {
          setCanvasState(state);
        }
      })
      .catch((reason: unknown) => {
        if (isActive) {
          setError(getErrorMessage(reason));
        }
      });

    return () => {
      isActive = false;
    };
  }, [gameConnection, roomId]);

  useEffect(() => {
    let isActive = true;

    setWordChoices([]);
    setArtistWord(null);

    if (!playerId || playerId !== currentArtistId) {
      return;
    }

    const loadPrivateArtistState = async () => {
      try {
        if (phase === "WordChoice") {
          const choices = await gameConnection.getWordChoices();
          if (isActive) {
            setWordChoices(choices);
          }
        } else if (phase === "Playing") {
          const word = await gameConnection.getCurrentWord();
          if (isActive) {
            setArtistWord(word);
          }
        }
      } catch (reason) {
        if (isActive) {
          setError(getErrorMessage(reason));
        }
      }
    };

    void loadPrivateArtistState();

    return () => {
      isActive = false;
    };
  }, [currentArtistId, gameConnection, phase, playerId, roomId]);

  const enterRoom = async (request: () => Promise<RoomEntry>) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const entry = await request();
      setGameState(entry.state);
      setPlayerId(entry.session.playerId);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveRoom = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await gameConnection.leaveRoom();
      setGameState(null);
      setCanvasState(emptyCanvasState);
      setPlayerId(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGame = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await gameConnection.startGame();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  const chooseWord = async (word: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await gameConnection.chooseWord(word);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  const runDrawingCommand = useCallback((request: () => Promise<void>) => {
    void request().catch((reason: unknown) => {
      setError(getErrorMessage(reason));
    });
  }, []);

  const beginStroke = useCallback(
    (colour: string, width: number, firstPoint: Point) => {
      runDrawingCommand(() =>
        gameConnection.beginStroke(colour, width, firstPoint),
      );
    },
    [gameConnection, runDrawingCommand],
  );

  const addStrokePoints = useCallback(
    (points: Point[]) => {
      runDrawingCommand(() => gameConnection.addStrokePoints(points));
    },
    [gameConnection, runDrawingCommand],
  );

  const endStroke = useCallback(() => {
    runDrawingCommand(() => gameConnection.endStroke());
  }, [gameConnection, runDrawingCommand]);

  const undoStroke = useCallback(() => {
    runDrawingCommand(() => gameConnection.undoStroke());
  }, [gameConnection, runDrawingCommand]);

  const clearCanvas = useCallback(() => {
    runDrawingCommand(() => gameConnection.clearCanvas());
  }, [gameConnection, runDrawingCommand]);

  const sendMessage = async (message: string) => {
    setError(null);

    try {
      await gameConnection.sendMessage(message);
    } catch (reason) {
      setError(getErrorMessage(reason));
      throw reason;
    }
  };

  if (gameState) {
    return (
      <Game
        artistWord={artistWord}
        canvasState={canvasState}
        currentPlayerId={playerId}
        error={error}
        isSubmitting={isSubmitting}
        onAddStrokePoints={addStrokePoints}
        onBeginStroke={beginStroke}
        onClearCanvas={clearCanvas}
        onChooseWord={chooseWord}
        onEndStroke={endStroke}
        onLeaveRoom={leaveRoom}
        onSendMessage={sendMessage}
        onStartGame={startGame}
        onUndoStroke={undoStroke}
        state={gameState}
        wordChoices={wordChoices}
      />
    );
  }

  return (
    <Home
      error={error}
      isSubmitting={isSubmitting}
      onCreateRoom={(username) =>
        enterRoom(() => gameConnection.createRoom(username))
      }
      onJoinRoom={(username, roomCode) =>
        enterRoom(() => gameConnection.joinRoom(username, roomCode))
      }
    />
  );
}

function getErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "Something went wrong.";
  const hubExceptionMessage = message.match(/HubException:\s*(.+)$/)?.[1];
  return hubExceptionMessage ?? message;
}

export default App;
