// ─── CAMBIOS EN page.tsx ───────────────────────────────────────────────────

// 1. Agregar estado del telón (junto a los otros useState)
const [curtain, setCurtain] = useState(false)

// 2. Reemplazar router.push('/lobby') en handleLogin por:
setCurtain(true)
// (el router.push se mueve al onComplete del componente)

// 3. Reemplazar router.push('/lobby') en handleRegister por:
setCurtain(true)

// 4. En el return, envolver todo con CurtainTransition:
return (
  <CurtainTransition
    trigger={curtain}
    onComplete={() => router.push('/lobby')}
  >
    <main ...>
      ...
    </main>
  </CurtainTransition>
)
