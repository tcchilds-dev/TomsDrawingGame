import { useState } from "react";
import Button from "./Button";
import Input from "./Input";

type HomeProps = {
  error: string | null;
  isSubmitting: boolean;
  onCreateRoom: (username: string) => Promise<void> | void;
  onJoinRoom: (username: string, roomCode: string) => Promise<void> | void;
};

export default function Home({
  error,
  isSubmitting,
  onCreateRoom,
  onJoinRoom,
}: HomeProps) {
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");

  return (
    <main className="flex h-screen items-center justify-center bg-base-200 p-2">
      <section
        aria-label="Room entry"
        className="flex w-fit flex-col gap-2 text-center"
      >
        <Input
          disabled={isSubmitting}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="input name"
          value={username}
        />
        <Input
          disabled={isSubmitting}
          focusOnTyping={false}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="room code"
          value={roomCode}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={isSubmitting}
            onClick={() => void onCreateRoom(username)}
            type="CreateRoom"
          />
          <Button
            disabled={isSubmitting}
            onClick={() => void onJoinRoom(username, roomCode)}
            type="JoinRoom"
          />
        </div>
        {error && (
          <p className="text-center text-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
