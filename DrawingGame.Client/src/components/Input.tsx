import { useEffect, useRef } from "react";

export default function Input() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
  }, []);

  return (
    <input
      className="input input-neutral focus:outline-none"
      placeholder="Guessage"
      ref={inputRef}
      type="text"
    />
  );
}
