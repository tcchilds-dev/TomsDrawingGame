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
    <main className="grid h-screen grid-cols-12 grid-rows-11 gap-2 p-2 bg-base-200">
      <section className="col-start-6 col-span-2 row-start-5 content-center text-center">
        <Input
          disabled={isSubmitting}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="input name"
          value={username}
        />
      </section>
      <section className="col-start-6 col-span-2 row-start-6 content-center text-center">
        <Input
          disabled={isSubmitting}
          focusOnTyping={false}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="room code"
          value={roomCode}
        />
      </section>
      <section className="col-start-6 col-span-1 row-start-7 content-center text-center">
        <Button
          disabled={isSubmitting}
          onClick={() => void onCreateRoom(username)}
          type="CreateRoom"
        />
      </section>
      <section className="col-start-7 col-span-1 row-start-7 content-center text-center">
        <Button
          disabled={isSubmitting}
          onClick={() => void onJoinRoom(username, roomCode)}
          type="JoinRoom"
        />
      </section>
      {error && (
        <p
          className="col-start-6 col-span-2 row-start-8 text-center text-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </main>
  );
}
