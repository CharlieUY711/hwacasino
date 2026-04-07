import { useState } from "react";
import RouletteWheel from "./RouletteWheel";
import ChipsBar from "./ChipsBar";
import ActionBar from "./ActionBar";
import BettingBoard from "./BettingBoard";

export default function RouletteLayout() {

  const [rotation,setRotation] = useState(0);

  const spin = () => {
    const extra = 360 * (5 + Math.random()*3);
    setRotation(r => r + extra);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      
      <RouletteWheel rotation={rotation} />

      <ChipsBar onSelect={(c)=>console.log("chip",c)} />

      <ActionBar onSpin={spin} />

      <BettingBoard onBet={(n)=>console.log("bet",n)} />

    </div>
  );
}

