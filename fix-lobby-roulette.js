const fs = require('fs');

let content = fs.readFileSync('src/app/lobby/page.tsx', 'utf8');

const old = `            <button className="play-btn" style={{ background: 'rgba(212,175,55,0.12)', border: \`1px solid rgba(212,175,55,0.3)\`, borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'absolute', bottom: '20px', right: '20px' }}>
              <span style={{ color: GOLD, fontSize: '0.9rem', marginLeft: '2px' }}>▶</span>
            </button>`;

const nuevo = `            <button className="play-btn" onClick={() => router.push('/roulette')} style={{ background: 'rgba(212,175,55,0.12)', border: \`1px solid rgba(212,175,55,0.3)\`, borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'absolute', bottom: '20px', right: '20px' }}>
              <span style={{ color: GOLD, fontSize: '0.9rem', marginLeft: '2px' }}>▶</span>
            </button>`;

if (content.includes(old)) {
  content = content.replace(old, nuevo);
  fs.writeFileSync('src/app/lobby/page.tsx', content, 'utf8');
  console.log('✅ Botón ruleta conectado');
} else {
  console.log('❌ No se encontró el bloque — revisá el archivo manualmente');
}

