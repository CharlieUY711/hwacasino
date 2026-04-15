export default function BettingBoard({ onBet }) {
  const numbers = Array.from({length:36},(_,i)=>i+1);

  return (
    <div className="grid grid-cols-6 gap-1">
      {numbers.map(n=>(
        <div key={n}
          onPointerDown={()=>onBet(n)}
          className="bet-cell h-10">
          {n}
        </div>
      ))}
    </div>
  );
}


