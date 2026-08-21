import { useEffect, useRef, useState } from "react";

export default function RoomCodeButton({ roomCode }: { roomCode: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      return;
    }

    setIsCopied(true);

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setIsCopied(false);
      resetTimeoutRef.current = null;
    }, 1000);
  };

  return (
    <button
      aria-label={`${isCopied ? "Copied" : "Copy"} room code ${roomCode}`}
      className={`btn w-full text-white transition-colors ${
        isCopied ? "btn-primary" : "btn-neutral"
      }`}
      onClick={() => void copyRoomCode()}
      type="button"
    >
      Room Code: {roomCode}
    </button>
  );
}
