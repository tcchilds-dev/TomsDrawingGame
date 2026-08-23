import { useEffect, useRef } from "react";
import type { ChatMessage } from "../game/types";

type ChatProps = {
  currentPlayerId: string | null;
  messages: ChatMessage[];
};

export default function Chat({ currentPlayerId, messages }: ChatProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      aria-label="Chat messages"
      aria-live="polite"
      className="h-full w-full overflow-y-auto rounded-box bg-white px-2 shadow-sm"
      ref={chatRef}
    >
      {messages.map((message, index) => {
        const key = `${message.timeStamp}-${message.playerId ?? "system"}-${index}`;

        if (message.messageType === "CorrectGuess") {
          return (
            <div className="chat chat-start" key={key}>
              <div className="chat-bubble bg-transparent p-0 text-success shadow-none before:hidden">
                {message.username ?? "A player"} guessed the word!
              </div>
            </div>
          );
        }

        if (message.messageType === "System") {
          return (
            <div className="chat chat-start" key={key}>
              <div className="chat-bubble">{message.message}</div>
            </div>
          );
        }

        const alignment = message.playerId === currentPlayerId ? "chat-end" : "chat-start";

        return (
          <div className={`chat ${alignment}`} key={key}>
            <div className="chat-header">{message.username ?? "Unknown player"}</div>
            <div className="chat-bubble">{message.message}</div>
          </div>
        );
      })}
    </div>
  );
}
