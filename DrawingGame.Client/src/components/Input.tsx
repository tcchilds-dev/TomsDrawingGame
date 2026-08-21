import { useEffect, useRef } from "react";

type InputProps = {
  ariaLabel?: string;
  disabled?: boolean;
  focusOnTyping?: boolean;
  maxLength?: number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  value?: string;
};

export default function Input({
  ariaLabel,
  disabled = false,
  focusOnTyping = true,
  maxLength,
  onChange,
  placeholder,
  value,
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusOnTyping) {
      return;
    }

    const focusInputOnTyping = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement);

      if (
        event.defaultPrevented ||
        isEditableTarget ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return;
      }

      inputRef.current?.focus();
    };

    window.addEventListener("keydown", focusInputOnTyping);
    return () => window.removeEventListener("keydown", focusInputOnTyping);
  }, [focusOnTyping]);

  return (
    <input
      aria-label={ariaLabel}
      className="input w-full bg-white text-center focus:input-primary focus:outline-none"
      disabled={disabled}
      maxLength={maxLength}
      onChange={onChange}
      placeholder={placeholder}
      ref={inputRef}
      type="text"
      value={value}
    />
  );
}
