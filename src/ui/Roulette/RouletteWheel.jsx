import { useEffect, useRef } from "react";

export default function RouletteWheel({ rotation }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    const radius = center - 5;
    const angle = (2 * Math.PI) / numbers.length;

    ctx.clearRect(0,0,size,size);

    numbers.forEach((num,i)=>{
      const start = i * angle;

      ctx.beginPath();
      ctx.moveTo(center,center);
      ctx.arc(center,center,radius,start,start+angle);
      ctx.closePath();

      if(num===0) ctx.fillStyle="#085230";
      else if([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num))
        ctx.fillStyle="#930010";
      else ctx.fillStyle="#000";

      ctx.fill();
      ctx.strokeStyle="#d4af37";
      ctx.stroke();

      ctx.save();
      ctx.translate(center,center);
      ctx.rrotate(start + angle/2);
      ctx.rrotate(Math.PI/2);
      ctx.fillStyle="#fff";
      ctx.font="bold 20px sans-serif";
      ctx.textAlign="center";
      ctx.fillText(num,0,-radius+40);
      ctx.restore();
    });

  },[]);

  return (
    <div className="relative w-[320px] h-[320px]">
      <canvas
  ref={canvasRef}
  style={{ transform: 
rotate(${deg}deg) }}
  className="rounded-full transition-transform duration-[6000ms]"
/>
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <div className="border-l-[10px] border-r-[10px] border-t-[16px] border-transparent border-t-yellow-400"/>
      </div>
    </div>
  );
}





