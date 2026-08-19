import { useRef, useState } from "react";
import Button from "./Button";
import Canvas from "./Canvas";
import type { CanvasHandle } from "./Canvas";
import Chat from "./Chat";
import Input from "./Input";
import PaintSelection from "./PaintSelection";
import PlayerList from "./PlayerList";
import Timer from "./Timer";
import Word from "./Word";

export default function Game() {
  const canvasRef = useRef<CanvasHandle>(null);
  const [selectedColour, setSelectedColour] = useState("#111827");
  const [brushWidth, setBrushWidth] = useState(8);

  return (
    <main className="grid h-screen grid-cols-6 grid-rows-24 gap-2 p-2">
      <aside className="col-start-1 row-start-1 text-center">Round: 3</aside>
      <aside className="col-start-1 row-start-2 row-span-19">
        <PlayerList></PlayerList>
      </aside>
      <aside className="col-start-1 row-start-22 row-span-4 content-center text-center">
        <Button></Button>
      </aside>

      <header className="col-start-2 col-span-4 row-start-1 content-center text-center">
        <Word></Word>
      </header>

      <section className="col-start-2 col-span-4 row-start-2 row-span-20">
        <Canvas brushWidth={brushWidth} colour={selectedColour} ref={canvasRef} />
      </section>

      <section className="col-start-2 col-span-4 row-start-22 row-span-4">
        <PaintSelection
          brushWidth={brushWidth}
          onBrushWidthChange={setBrushWidth}
          onClear={() => canvasRef.current?.clear()}
          onColourChange={setSelectedColour}
          onUndo={() => canvasRef.current?.undo()}
          selectedColour={selectedColour}
        />
      </section>

      <aside className="col-start-6 row-start-1 content-center text-center">
        <Timer />
      </aside>
      <aside className="col-start-6 row-start-2 row-span-20">
        <Chat></Chat>
      </aside>
      <aside className="col-start-6 row-start-23 row-span-4">
        <Input />
      </aside>
    </main>
  );
}
