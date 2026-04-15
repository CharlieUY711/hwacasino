export default function ChipsBar({ onSelect }) {
  const chips = [10,50,100,250,500,1000];

  return (
    <div className="flex gap-2">
      {chips.map(c=>(
        <div key={c} onPointerDown={()=>onSelect(c)}
          className="coin w-10 h-10 text-black">
          {c}
        </div>
      ))}
    </div>
  );
}


