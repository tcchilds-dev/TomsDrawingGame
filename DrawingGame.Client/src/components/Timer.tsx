import { useEffect, useState, type CSSProperties } from "react";

type TimerProps = {
  phaseEndsAt: string | null;
};

export default function Timer({ phaseEndsAt }: TimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getSecondsRemaining(phaseEndsAt),
  );

  useEffect(() => {
    const updateCountdown = () => {
      setSecondsRemaining(getSecondsRemaining(phaseEndsAt));
    };

    updateCountdown();

    if (!phaseEndsAt) {
      return;
    }

    const intervalId = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [phaseEndsAt]);

  if (secondsRemaining === null) {
    return null;
  }

  return (
    <span className="countdown font-mono text-xl">
      <span
        style={{ "--value": secondsRemaining } as CSSProperties}
        aria-live="polite"
        aria-label={`${secondsRemaining} seconds remaining`}
      >
        {secondsRemaining}
      </span>
    </span>
  );
}

function getSecondsRemaining(phaseEndsAt: string | null) {
  if (!phaseEndsAt) {
    return null;
  }

  const deadline = Date.parse(phaseEndsAt);

  if (Number.isNaN(deadline)) {
    return null;
  }

  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}
