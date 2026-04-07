export default function ActionBar({ onSpin }) {
  return (
    <div className="flex gap-2 w-full">
      <button className="flex-1 bg-gray-800 p-2">BORRAR</button>
      <button className="flex-1 bg-gray-800 p-2">DOBLAR</button>
      <button onClick={onSpin} className="flex-1 bg-red-600 p-2">
        GIRAR
      </button>
    </div>
  );
}

