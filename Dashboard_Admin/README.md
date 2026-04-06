# HWA Casino — Admin Dashboard

## Archivos generados

```
src/app/admin/dashboard/page.tsx        <- Frontend completo
src/app/api/admin/stats/route.ts        <- GET /api/admin/stats
src/app/api/admin/invites/route.ts      <- POST/DELETE /api/admin/invites
src/app/api/admin/deposits/route.ts     <- POST /api/admin/deposits
admin_migration.sql                     <- SQL para Supabase
```

## Integracion rapida

### 1. Copiar archivos al proyecto
```
C:\Carlos\HWA\hwacasino\src\app\admin\dashboard\page.tsx
C:\Carlos\HWA\hwacasino\src\app\api\admin\stats\route.ts
C:\Carlos\HWA\hwacasino\src\app\api\admin\invites\route.ts
C:\Carlos\HWA\hwacasino\src\app\api\admin\deposits\route.ts
```

### 2. Ejecutar SQL en Supabase
Ir a Supabase > SQL Editor > pegar admin_migration.sql
Cambiar el email en la primera query por el tuyo.

### 3. Acceder al dashboard
```
https://hwacasino.com/admin/dashboard
```
Solo usuarios con role=admin o role=superadmin pueden acceder.

## Funcionalidades incluidas

| Seccion         | Que hace |
|-----------------|----------|
| Overview        | Metricas clave, actividad en vivo, estado de mesas |
| Usuarios        | Lista completa con balance y apuestas |
| Depositos       | PayPal pendientes, completar manualmente |
| Invitaciones    | Generar y revocar codigos VIP |
| Transacciones   | Historial completo |
| Ruleta Stats    | Rondas, house edge, numeros calientes |
| Configuracion   | Variables de plataforma, estado del sistema |

## Proximas funcionalidades (pendientes)

- Retiros manuales (cuando se implemente)
- Blackjack stats (Bloque 5)
- Ajuste de balance manual por usuario
- Ban/unban de usuarios
- Logs de seguridad
- Exportar CSV de transacciones

## Seguridad

La verificacion de rol admin esta en cada route de API.
El frontend hace la verificacion en el useEffect del componente.
Para produccion: activar `verifyAdmin()` en las API routes.
