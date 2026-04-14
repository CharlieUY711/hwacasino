// /components/roulette/SplitAndCornerOverlay.tsx
import { useEffect, useState } from 'react';

export default function SplitAndCornerOverlay({ tableRef, onBet }) {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    if (!tableRef.current) return;

    const table = tableRef.current;
    const cells = table.querySelectorAll('[data-number-cell]');
    const tableRect = table.getBoundingClientRect();

    const boxes = {};
    cells.forEach(cell => {
      const num = cell.getAttribute('data-number');
      const rect = cell.getBoundingClientRect();
      boxes[num] = {
        x: rect.left - tableRect.left,
        y: rect.top - tableRect.top,
        w: rect.width,
        h: rect.height,
      };
    });

    const generated = [];
    const nums = Object.keys(boxes).map(n => parseInt(n));

    nums.forEach(n => {
      const b = boxes[n];
      if (!b) return;

      // SPLIT VERTICAL (n - n+3)
      const right = n + 3;
      if (boxes[right]) {
        generated.push({
          id: `${n}-${right}`,
          type: 'split2',
          x: b.x + b.w - 5,
          y: b.y,
          w: 10,
          h: b.h,
        });
      }

      // SPLIT HORIZONTAL (n - n+1)
      const down = n + 1;
      if (boxes[down] && n % 3 !== 0) {
        generated.push({
          id: `${n}-${down}`,
          type: 'split2',
          x: b.x,
          y: b.y + b.h - 5,
          w: b.w,
          h: 10,
        });
      }

      // CORNER (n, n+1, n+3, n+4)
      const diag = n + 4;
      if (boxes[diag]) {
        generated.push({
          id: `${n}-${n + 1}-${n + 3}-${n + 4}`,
          type: 'split4',
          x: b.x + b.w - 5,
          y: b.y + b.h - 5,
          w: 10,
          h: 10,
        });
      }

      // STREET (fila de 3)
      if (n % 3 === 1) {
        const s1 = n;
        const s2 = n + 1;
        const s3 = n + 2;
        if (boxes[s1] && boxes[s2] && boxes[s3]) {
          const top = boxes[s1].y;
          const left = boxes[s1].x;
          const width = boxes[s1].w * 3;
          const height = 12;

          generated.push({
            id: `${s1}-${s2}-${s3}`,
            type: 'street3',
            x: left,
            y: top - 6,
            w: width,
            h: height,
          });
        }
      }

      // SIX-LINE (fila doble de 6)
      if (n % 3 === 1) {
        const row1 = [n, n + 1, n + 2];
        const row2 = [n + 3, n + 4, n + 5];

        if (boxes[row1[0]] && boxes[row2[0]]) {
          const top = boxes[row1[0]].y;
          const left = boxes[row1[0]].x;
          const width = boxes[row1[0]].w * 3;
          const height = boxes[row1[0]].h * 2;

          generated.push({
            id: `${row1.join('-')}-${row2.join('-')}`,
            type: 'sixline6',
            x: left,
            y: top + boxes[row1[0]].h - 6,
            w: width,
            h: 12,
          });
        }
      }
    });

    setAreas(generated);
  }, [tableRef]);

  return (
    <>
      {areas.map(a => (
        <div
          key={a.id}
          onClick={e => onBet(a.type, a.id, e)}
          style={{
            position: 'absolute',
            left: a.x,
            top: a.y,
            width: a.w,
            height: a.h,
            cursor: 'pointer',
            background: 'rgba(0,0,0,0)',
            zIndex: 15,
          }}
        />
      ))}
    </>
  );
}
