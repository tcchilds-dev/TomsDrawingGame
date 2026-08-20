import { useEffect, useRef, useState } from "react";
import Game from "./components/Game";
import Home from "./components/Home";
import { GameConnection } from "./game/GameConnection";
import type { GameState, RoomEntry } from "./game/types";

function App() {
  const [gameConnection] = useState(() => new GameConnection());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRoomPromise = useRef<Promise<RoomEntry | null> | null>(null);

  useEffect(() => {
    let isActive = true;
    const stopListeningForState = gameConnection.onGameStateChanged(setGameState);
    const stopListeningForExpiry = gameConnection.onSessionExpired((reason) => {
      setGameState(null);
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

  if (gameState) {
    return (
      <Game
        currentPlayerId={playerId}
        error={error}
        isSubmitting={isSubmitting}
        onLeaveRoom={leaveRoom}
        onStartGame={startGame}
        state={gameState}
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
