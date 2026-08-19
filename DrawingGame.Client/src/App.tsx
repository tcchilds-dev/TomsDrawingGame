import Game from "./components/Game";
import Home from "./components/Home";
import { useState } from "react";
import { GameConnection } from "./game/GameConnection";

function App() {
  const gameConnection = new GameConnection();
  gameConnection.start();

  const [screen, setScreen] = useState<"Home" | "Game">("Home");

  return (
    <>
      {screen === "Home" && <Home setScreen={setScreen} />}
      {screen === "Game" && <Game setScreen={setScreen} />}
    </>
  );
}

export default App;
