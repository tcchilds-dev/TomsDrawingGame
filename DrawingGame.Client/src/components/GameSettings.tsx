import { useCallback, useEffect, useRef, useState } from "react";
import type { GameConfig, GameConfigUpdate } from "../game/types";

type GameSettingsProps = {
  config: GameConfig;
  disabled?: boolean;
  isOwner: boolean;
  onUpdate: (config: GameConfigUpdate) => Promise<void> | void;
};

type SettingKey = keyof GameConfigUpdate;

type Setting = {
  key: SettingKey;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: (value: number) => string;
};

const roundsSetting: Setting = {
  key: "numberOfRounds",
  label: "Rounds",
  min: 1,
  max: 10,
  step: 1,
  suffix: (value) => ` ${value === 1 ? "round" : "rounds"}`,
};

const timerSettings: Setting[] = [
  {
    key: "wordChoiceTimerSeconds",
    label: "Word-choice time",
    min: 10,
    max: 30,
    step: 1,
    suffix: (value) => ` ${value === 1 ? "second" : "seconds"}`,
  },
  {
    key: "drawTimerSeconds",
    label: "Drawing time",
    min: 30,
    max: 120,
    step: 1,
    suffix: (value) => ` ${value === 1 ? "second" : "seconds"}`,
  },
];

export default function GameSettings({
  config,
  disabled = false,
  isOwner,
  onUpdate,
}: GameSettingsProps) {
  const [draftConfig, setDraftConfig] = useState(() => toConfigUpdate(config));
  const configRef = useRef(config);
  const draftConfigRef = useRef(draftConfig);
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingConfigRef = useRef<GameConfigUpdate | null>(null);

  useEffect(() => {
    configRef.current = config;

    if (!isSendingRef.current && pendingConfigRef.current === null) {
      const synchronizedConfig = toConfigUpdate(config);
      draftConfigRef.current = synchronizedConfig;
      setDraftConfig(synchronizedConfig);
    }
  }, [config]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const sendPendingUpdates = useCallback(async () => {
    if (isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;

    while (pendingConfigRef.current) {
      const nextConfig = pendingConfigRef.current;
      pendingConfigRef.current = null;

      try {
        await onUpdate(nextConfig);
      } catch {
        pendingConfigRef.current = null;

        if (isMountedRef.current) {
          const synchronizedConfig = toConfigUpdate(configRef.current);
          draftConfigRef.current = synchronizedConfig;
          setDraftConfig(synchronizedConfig);
        }
      }
    }

    isSendingRef.current = false;
  }, [onUpdate]);

  const updateSetting = (key: SettingKey, value: number) => {
    if (!isOwner) {
      return;
    }

    const nextConfig = { ...draftConfigRef.current, [key]: value };
    draftConfigRef.current = nextConfig;
    pendingConfigRef.current = nextConfig;
    setDraftConfig(nextConfig);
    void sendPendingUpdates();
  };

  const renderSlider = ({ key, label, min, max, step, suffix }: Setting) => {
    const value = draftConfig[key];
    const inputId = `game-setting-${key}`;

    return (
      <div className="grid gap-2" key={key}>
        <label className="font-medium" htmlFor={inputId}>
          {label}
        </label>
        <div className="flex items-center gap-3">
          <input
            className="range range-primary range-sm min-w-0 flex-1"
            disabled={!isOwner || disabled}
            id={inputId}
            max={max}
            min={min}
            onChange={(event) => updateSetting(key, Number(event.target.value))}
            step={step}
            type="range"
            value={value}
          />
          <output className="w-24 shrink-0 text-sm font-medium" htmlFor={inputId}>
            {value}
            {suffix(value)}
          </output>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full items-center justify-center rounded-box bg-base-100 shadow-sm">
      <section
        aria-labelledby="game-settings-heading"
        className="card w-full max-w-xl bg-base-100"
      >
        <div className="card-body gap-6">
          <div className="text-center">
            <h1 className="card-title justify-center text-2xl" id="game-settings-heading">
              Game Settings
            </h1>
            {!isOwner && (
              <p className="mt-1 text-base-content/70">
                The room owner can adjust these settings.
              </p>
            )}
          </div>

          <div className="grid gap-5">
            {renderSlider(roundsSetting)}

            <div className="grid gap-2">
              <span className="font-medium">Word choices</span>
              <div
                aria-label="Word choices"
                className="join grid h-8 grid-cols-2"
                role="group"
              >
                {[3, 5].map((value) => {
                  const isSelected = draftConfig.wordSelectionSize === value;

                  return (
                    <button
                      aria-label={`${value} word choices`}
                      aria-pressed={isSelected}
                      className={`btn btn-sm join-item h-8 min-h-8 ${isSelected ? "btn-primary" : "btn-ghost bg-base-200"}`}
                      disabled={!isOwner || disabled}
                      key={value}
                      onClick={() => updateSetting("wordSelectionSize", value)}
                      type="button"
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            {timerSettings.map(renderSlider)}
          </div>
        </div>
      </section>
    </div>
  );
}

function toConfigUpdate(config: GameConfig): GameConfigUpdate {
  return {
    wordSelectionSize: config.wordSelectionSize,
    wordChoiceTimerSeconds: config.wordChoiceTimerSeconds,
    drawTimerSeconds: config.drawTimerSeconds,
    numberOfRounds: config.numberOfRounds,
  };
}
