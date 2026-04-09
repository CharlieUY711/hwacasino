"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Search,
  ChevronUp, ChevronDown, CreditCard, Building2,
  Smartphone, Banknote, CheckCircle2, Clock, XCircle,
  AlertCircle, ArrowRightLeft, Target, BarChart3,
  Filter, Download, RefreshCw, Eye, ChevronRight,
  Zap,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

// ─── mock data ────────────────────────────────────────────────────────────────
const MOCK_INGRESOS = [
  { id: "1", descripcion: "Cuota marzo - Grupo A", monto: 45000, estado: "confirmado", categoria: "cuota_viaje", fecha_confirmada: "2026-03-10", estudiante: "Lucía Gómez" },
  { id: "2", descripcion: "Cuota marzo - Grupo B", monto: 38000, estado: "confirmado", categoria: "cuota_viaje", fecha_confirmada: "2026-03-11", estudiante: "Mateo Silva" },
  { id: "3", descripcion: "Sponsor Tecno SA", monto: 120000, estado: "confirmado", categoria: "sponsor", fecha_confirmada: "2026-03-05", estudiante: null },
  { id: "4", descripcion: "Inscripción viaje adicional", monto: 25000, estado: "pendiente", categoria: "inscripcion", fecha_confirmada: "2026-03-15", estudiante: "Valentina Ruiz" },
  { id: "5", descripcion: "Cuota abril - Grupo A", monto: 45000, estado: "pendiente", categoria: "cuota_viaje", fecha_confirmada: "2026-04-01", estudiante: "Lucía Gómez" },
  { id: "6", descripcion: "Subsidio municipal", monto: 80000, estado: "confirmado", categoria: "subsidio", fecha_confirmada: "2026-02-28", estudiante: null },
];

const MOCK_EGRESOS = [
  { id: "1", descripcion: "Reserva hotel Bariloche", monto: 180000, estado: "confirmado", categoria: "alojamiento", fecha_confirmada: "2026-03-01", proveedor: "Hotel Nevada" },
  { id: "2", descripcion: "Micros ida y vuelta", monto: 95000, estado: "confirmado", categoria: "transporte", fecha_confirmada: "2026-03-08", proveedor: "TransPatagonia" },
  { id: "3", descripcion: "Seguro de viaje grupal", monto: 42000, estado: "confirmado", categoria: "seguro", fecha_confirmada: "2026-03-03", proveedor: "Aseguradora Plus" },
  { id: "4", descripcion: "Pack actividades aventura", monto: 35000, estado: "pendiente", categoria: "actividad", fecha_confirmada: "2026-04-10", proveedor: "AventuraBRC" },
  { id: "5", descripcion: "Comida durante viaje", monto: 28000, estado: "pendiente", categoria: "alimentacion", fecha_confirmada: "2026-04-12", proveedor: null },
];

const MOCK_INSTRUMENTOS = [
  { id: "1", nombre: "Cuenta Bancaria Principal", tipo: "cuenta_bancaria", estado: "activa", saldo_actual: 353000, es_principal: true, banco: "Banco Nación", alias: "GRUPO.EGRESADOS" },
  { id: "2", nombre: "MercadoPago Grupo", tipo: "mercado_pago", estado: "activa", saldo_actual: 87000, es_principal: false, mp_email: "pagos@egresados2026.com" },
  { id: "3", nombre: "Caja Chica", tipo: "efectivo", estado: "activa", saldo_actual: 15000, es_principal: false },
];

const MOCK_CONCILIACIONES = [
  { id: "1", descripcion: "Pago MP #9823746", monto: 45000, tipo: "ingreso", estado_conc: "conciliado", fecha: "2026-03-10", match: "Cuota marzo - Grupo A", confianza: 1.0 },
  { id: "2", descripcion: "Transferencia recibida", monto: 38000, tipo: "ingreso", estado_conc: "conciliado", fecha: "2026-03-11", match: "Cuota marzo - Grupo B", confianza: 0.85 },
  { id: "3", descripcion: "Débito #445872", monto: 180000, tipo: "egreso", estado_conc: "pendiente", fecha: "2026-03-01", match: null, confianza: null },
  { id: "4", descripcion: "Pago MP #9823891", monto: 25000, tipo: "ingreso", estado_conc: "pendiente", fecha: "2026-03-14", match: null, confianza: null },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: "emerald" | "rose" | "amber" | "orange"; trend?: "up" | "down";
}) {
  const colors = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", value: "text-emerald-700" },
    rose:    { bg: "bg-rose-50",    border: "border-rose-100",    icon: "text-rose-500",    value: "text-rose-600"    },
    amber:   { bg: "bg-amber-50",   border: "border-amber-100",   icon: "text-amber-600",   value: "text-amber-700"   },
    orange:  { bg: "bg-orange-50",  border: "border-orange-100",  icon: "text-orange-600",  value: "text-orange-700"  },
  };
  const c = colors[color];
  return (
    <div className={cn("rounded-2xl p-5 border", c.bg, c.border)}>
      <div className="flex items-start justify-between mb-3">
        <span className={cn("p-2 rounded-xl bg-white/70 shadow-sm", c.icon)}>{icon}</span>
        {trend && (
          <span className={cn("text-xs font-semibold flex items-center gap-0.5",
            trend === "up" ? "text-emerald-600" : "text-rose-500")}>
            {trend === "up" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            +12%
          </span>
        )}
      </div>
      <p className="text-xs text-navy-400 font-medium mb-0.5">{label}</p>
      <p className={cn("text-xl font-black tracking-tight leading-none", c.value)}>{value}</p>
      {sub && <p className="text-xs text-navy-400 mt-1">{sub}</p>}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    confirmado: { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={10} /> },
    pendiente:  { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock size={10} />         },
    rechazado:  { label: "Rechazado",  cls: "bg-rose-50 text-rose-600 border-rose-200",           icon: <XCircle size={10} />       },
    anulado:    { label: "Anulado",    cls: "bg-gray-50 text-gray-500 border-gray-200",           icon: <XCircle size={10} />       },
    conciliado: { label: "Conciliado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200",  icon: <CheckCircle2 size={10} />  },
  };
  const s = map[estado] ?? { label: estado, cls: "bg-gray-50 text-gray-500 border-gray-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border", s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

function InstrumentoIcon({ tipo }: { tipo: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    cuenta_bancaria: { icon: <Building2 size={16} />, color: "bg-blue-100 text-blue-600" },
    mercado_pago:    { icon: <Smartphone size={16} />, color: "bg-sky-100 text-sky-600"  },
    efectivo:        { icon: <Banknote size={16} />,   color: "bg-green-100 text-green-600" },
    otro:            { icon: <CreditCard size={16} />, color: "bg-gray-100 text-gray-600"   },
  };
  const m = map[tipo] ?? map.otro;
  return <span className={cn("p-2 rounded-xl", m.color)}>{m.icon}</span>;
}

// ─── tabs ─────────────────────────────────────────────────────────────────────
type Tab = "resumen" | "ingresos" | "egresos" | "instrumentos" | "conciliacion";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "resumen",       label: "Resumen",       icon: <BarChart3 size={14} />       },
  { key: "ingresos",      label: "Ingresos",      icon: <TrendingUp size={14} />      },
  { key: "egresos",       label: "Egresos",       icon: <TrendingDown size={14} />    },
  { key: "instrumentos",  label: "Instrumentos",  icon: <Wallet size={14} />          },
  { key: "conciliacion",  label: "Conciliación",  icon: <ArrowRightLeft size={14} />  },
];

// ─── modal nueva transacción ──────────────────────────────────────────────────
function ModalNuevaTransaccion({ open, onClose, tipo: tipoInicial }: {
  open: boolean; onClose: () => void; tipo: "ingreso" | "egreso";
}) {
  const [form, setForm] = useState({
    tipo: tipoInicial, monto: "", descripcion: "", categoria: "", fecha: "", notas: "",
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-cream-100">
          <div>
            <h3 className="font-bold text-navy-900">Nuevo {form.tipo === "ingreso" ? "Ingreso" : "Egreso"}</h3>
            <p className="text-xs text-navy-400 mt-0.5">Completá los datos del movimiento</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-cream-50 text-navy-400 transition-colors">
            <XCircle size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {(["ingreso", "egreso"] as const).map(t => (
              <button key={t} onClick={() => setForm({ ...form, tipo: t })}
                className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                  form.tipo === t
                    ? t === "ingreso" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-navy-400 border-cream-200 hover:border-navy-300")}>
                {t === "ingreso" ? "Ingreso" : "Egreso"}
              </button>
            ))}
          </div>
          <div>
            <label className="label-base">Monto *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400 text-sm font-bold">$</span>
              <input type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                className="input-base pl-7" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label-base">Descripción *</label>
            <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="input-base" placeholder="Ej: Cuota viaje grupo A" />
          </div>
          <div>
            <label className="label-base">Categoría</label>
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="input-base">
              <option value="">Seleccionar...</option>
              {form.tipo === "ingreso"
                ? ["cuota_viaje", "inscripcion", "sponsor", "subsidio", "otro_ingreso"].map(c =>
                    <option key={c} value={c}>{c.replace("_", " ")}</option>)
                : ["transporte", "alojamiento", "alimentacion", "seguro", "actividad", "otro_egreso"].map(c =>
                    <option key={c} value={c}>{c.replace("_", " ")}</option>)
              }
            </select>
          </div>
          <div>
            <label className="label-base">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="input-base" />
          </div>
          <div>
            <label className="label-base">Notas</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
              className="input-base min-h-[72px] resize-none" placeholder="Observaciones opcionales..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!form.monto || !form.descripcion}>
              Guardar movimiento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── tab resumen ──────────────────────────────────────────────────────────────
function TabResumen() {
  const totalIngresos = MOCK_INGRESOS.filter(i => i.estado === "confirmado").reduce((s, i) => s + i.monto, 0);
  const totalEgresos  = MOCK_EGRESOS.filter(e => e.estado === "confirmado").reduce((s, e) => s + e.monto, 0);
  const resultado     = totalIngresos - totalEgresos;
  const meta          = 700000;
  const pct           = Math.min(Math.round((totalIngresos / meta) * 100), 100);
  const pendIngresos  = MOCK_INGRESOS.filter(i => i.estado === "pendiente").reduce((s, i) => s + i.monto, 0);
  const saldoTotal    = MOCK_INSTRUMENTOS.reduce((s, i) => s + i.saldo_actual, 0);

  // flujo de caja simplificado (últimos 6 meses mock)
  const meses = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"];
  const ingData = [20000, 45000, 60000, 95000, 200000, 353000];
  const egrData = [10000, 25000, 35000, 50000, 120000, 317000];
  const maxVal  = Math.max(...ingData, ...egrData);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos confirmados" value={fmt(totalIngresos)} icon={<TrendingUp size={18} />} color="emerald" trend="up" />
        <KpiCard label="Egresos confirmados"  value={fmt(totalEgresos)}  icon={<TrendingDown size={18} />} color="rose" />
        <KpiCard label="Resultado neto"       value={fmt(resultado)}     icon={<Target size={18} />} color="amber"
          sub={resultado >= 0 ? "Superávit" : "Déficit"} />
        <KpiCard label="Saldo en instrumentos" value={fmt(saldoTotal)}   icon={<Wallet size={18} />} color="orange" />
      </div>

      {/* Meta de recaudación */}
      <Card>
        <CardHeader
          title="Meta de recaudación"
          subtitle={`${fmt(totalIngresos)} de ${fmt(meta)}`}
          action={<span className="font-black text-2xl text-orange-500">{pct}%</span>}
        />
        <div className="h-3 bg-cream-100 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #f97316, #fb923c)" }} />
        </div>
        <div className="flex items-center justify-between text-xs text-navy-400">
          <span>{fmt(meta - totalIngresos)} restantes</span>
          <span className="text-amber-600 font-semibold flex items-center gap-1">
            <Clock size={11} /> {fmt(pendIngresos)} pendientes de cobro
          </span>
        </div>
      </Card>

      {/* Flujo de caja */}
      <Card>
        <CardHeader title="Flujo de caja" subtitle="Últimos 6 meses" />
        <div className="flex items-end gap-2 h-32">
          {meses.map((mes, i) => (
            <div key={mes} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col-reverse gap-0.5">
                <div className="w-full rounded-t-md bg-rose-200 transition-all duration-500"
                  style={{ height: `${(egrData[i] / maxVal) * 80}px` }} />
                <div className="w-full rounded-t-md bg-emerald-400 transition-all duration-500"
                  style={{ height: `${(ingData[i] / maxVal) * 80}px` }} />
              </div>
              <span className="text-[10px] text-navy-400 font-medium">{mes}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-cream-100">
          <span className="flex items-center gap-1.5 text-xs text-navy-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5 text-xs text-navy-500">
            <span className="w-3 h-3 rounded-sm bg-rose-200 inline-block" /> Egresos
          </span>
        </div>
      </Card>

      {/* Últimos movimientos */}
      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader title="Últimos movimientos" subtitle="Actividad reciente" className="mb-0" />
        </div>
        <div className="divide-y divide-cream-100">
          {[
            ...MOCK_INGRESOS.slice(0, 3).map(i => ({ ...i, _tipo: "ingreso" as const })),
            ...MOCK_EGRESOS.slice(0, 2).map(e => ({ ...e, _tipo: "egreso" as const })),
          ]
            .sort((a, b) => new Date(b.fecha_confirmada).getTime() - new Date(a.fecha_confirmada).getTime())
            .slice(0, 5)
            .map(mov => (
              <div key={mov.id + mov._tipo} className="flex items-center gap-3 px-5 py-3 hover:bg-cream-50 transition-colors">
                <div className={cn("p-2 rounded-xl flex-shrink-0",
                  mov._tipo === "ingreso" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>
                  {mov._tipo === "ingreso" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-800 truncate">{mov.descripcion}</p>
                  <p className="text-xs text-navy-400">{fmtDate(mov.fecha_confirmada)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold", mov._tipo === "ingreso" ? "text-emerald-600" : "text-rose-500")}>
                    {mov._tipo === "ingreso" ? "+" : "-"}{fmt(mov.monto)}
                  </p>
                  <EstadoBadge estado={mov.estado} />
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ─── tab ingresos ─────────────────────────────────────────────────────────────
function TabIngresos({ onAdd }: { onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  const filtered = MOCK_INGRESOS.filter(i => {
    const matchSearch = i.descripcion.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || i.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalFiltrado = filtered.reduce((s, i) => s + i.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["todos", "confirmado", "pendiente"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                filtroEstado === e
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-navy-500 border-cream-200 hover:border-orange-300")}>
              {e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2">
            <Search size={13} className="text-navy-300" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="bg-transparent text-sm text-navy-700 placeholder:text-navy-300 w-28" />
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={onAdd}>Nuevo</Button>
        </div>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 rounded-t-2xl border-b border-emerald-100">
          <span className="text-xs font-semibold text-emerald-700">{filtered.length} movimientos</span>
          <span className="text-sm font-black text-emerald-700">{fmt(totalFiltrado)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-cream-100 bg-cream-50/50">
              <tr>
                <th className="table-th">Descripción</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Estudiante</th>
                <th className="table-th text-right">Monto</th>
                <th className="table-th">Fecha</th>
                <th className="table-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ing => (
                <tr key={ing.id} className="table-row">
                  <td className="table-td font-semibold text-navy-800">{ing.descripcion}</td>
                  <td className="table-td">
                    <span className="text-xs bg-cream-100 text-navy-500 px-2 py-0.5 rounded-lg font-medium">
                      {ing.categoria.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-td text-navy-500">{ing.estudiante ?? <span className="text-navy-300">—</span>}</td>
                  <td className="table-td text-right font-bold text-emerald-700">{fmt(ing.monto)}</td>
                  <td className="table-td text-navy-400">{fmtDate(ing.fecha_confirmada)}</td>
                  <td className="table-td"><EstadoBadge estado={ing.estado} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-navy-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── tab egresos ──────────────────────────────────────────────────────────────
function TabEgresos({ onAdd }: { onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  const filtered = MOCK_EGRESOS.filter(e => {
    const matchSearch = e.descripcion.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || e.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalFiltrado = filtered.reduce((s, e) => s + e.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["todos", "confirmado", "pendiente"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                filtroEstado === e
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-navy-500 border-cream-200 hover:border-orange-300")}>
              {e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-xl px-3 py-2">
            <Search size={13} className="text-navy-300" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="bg-transparent text-sm text-navy-700 placeholder:text-navy-300 w-28" />
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={onAdd}>Nuevo</Button>
        </div>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between px-5 py-3 bg-rose-50 rounded-t-2xl border-b border-rose-100">
          <span className="text-xs font-semibold text-rose-600">{filtered.length} movimientos</span>
          <span className="text-sm font-black text-rose-600">{fmt(totalFiltrado)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-cream-100 bg-cream-50/50">
              <tr>
                <th className="table-th">Descripción</th>
                <th className="table-th">Categoría</th>
                <th className="table-th">Proveedor</th>
                <th className="table-th text-right">Monto</th>
                <th className="table-th">Fecha</th>
                <th className="table-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(egr => (
                <tr key={egr.id} className="table-row">
                  <td className="table-td font-semibold text-navy-800">{egr.descripcion}</td>
                  <td className="table-td">
                    <span className="text-xs bg-cream-100 text-navy-500 px-2 py-0.5 rounded-lg font-medium">
                      {egr.categoria.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-td text-navy-500">{egr.proveedor ?? <span className="text-navy-300">—</span>}</td>
                  <td className="table-td text-right font-bold text-rose-600">{fmt(egr.monto)}</td>
                  <td className="table-td text-navy-400">{fmtDate(egr.fecha_confirmada)}</td>
                  <td className="table-td"><EstadoBadge estado={egr.estado} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-navy-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── tab instrumentos ─────────────────────────────────────────────────────────
function TabInstrumentos() {
  const saldoTotal = MOCK_INSTRUMENTOS.reduce((s, i) => s + i.saldo_actual, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MOCK_INSTRUMENTOS.map(inst => (
          <div key={inst.id}
            className={cn("rounded-2xl p-5 border-2 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
              inst.es_principal ? "border-orange-300 bg-orange-50" : "border-cream-200 bg-white")}>
            <div className="flex items-start justify-between mb-4">
              <InstrumentoIcon tipo={inst.tipo} />
              <div className="flex flex-col items-end gap-1">
                {inst.es_principal && (
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">PRINCIPAL</span>
                )}
                <span className={cn("w-2 h-2 rounded-full",
                  inst.estado === "activa" ? "bg-emerald-500" : "bg-gray-300")} />
              </div>
            </div>
            <p className="font-bold text-navy-800 text-sm leading-tight mb-0.5">{inst.nombre}</p>
            <p className="text-xs text-navy-400 mb-3">
              {inst.tipo === "cuenta_bancaria" && (inst as any).banco}
              {inst.tipo === "mercado_pago" && (inst as any).mp_email}
              {inst.tipo === "efectivo" && "Efectivo en mano"}
            </p>
            <p className="text-2xl font-black text-navy-900 tracking-tight">{fmt(inst.saldo_actual)}</p>
            <p className="text-xs text-navy-400 mt-0.5">{Math.round((inst.saldo_actual / saldoTotal) * 100)}% del total</p>
            <div className="mt-3 h-1.5 bg-cream-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${(inst.saldo_actual / saldoTotal) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Distribución de fondos" subtitle={`Total: ${fmt(saldoTotal)}`} />
        <div className="space-y-3">
          {MOCK_INSTRUMENTOS.map(inst => (
            <div key={inst.id} className="flex items-center gap-3">
              <InstrumentoIcon tipo={inst.tipo} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-navy-700">{inst.nombre}</span>
                  <span className="text-sm font-bold text-navy-900">{fmt(inst.saldo_actual)}</span>
                </div>
                <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(inst.saldo_actual / saldoTotal) * 100}%`,
                      background: inst.tipo === "cuenta_bancaria" ? "#3b82f6"
                        : inst.tipo === "mercado_pago" ? "#0ea5e9" : "#22c55e"
                    }} />
                </div>
              </div>
              <span className="text-xs text-navy-400 w-10 text-right font-medium">
                {Math.round((inst.saldo_actual / saldoTotal) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── tab conciliacion ─────────────────────────────────────────────────────────
function TabConciliacion() {
  const pendientes = MOCK_CONCILIACIONES.filter(c => c.estado_conc === "pendiente");
  const conciliados = MOCK_CONCILIACIONES.filter(c => c.estado_conc === "conciliado");

  return (
    <div className="space-y-4">
      {/* Banner estado */}
      <div className={cn("rounded-2xl p-4 flex items-center gap-3 border",
        pendientes.length > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
        {pendientes.length > 0
          ? <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
          : <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />}
        <div>
          <p className={cn("text-sm font-bold", pendientes.length > 0 ? "text-amber-800" : "text-emerald-800")}>
            {pendientes.length > 0
              ? `${pendientes.length} movimiento${pendientes.length > 1 ? "s" : ""} sin conciliar`
              : "Todo conciliado"}
          </p>
          <p className={cn("text-xs", pendientes.length > 0 ? "text-amber-600" : "text-emerald-600")}>
            {pendientes.length > 0
              ? "Revisá los movimientos pendientes y asignalos manualmente"
              : "Todos los movimientos están reconciliados"}
          </p>
        </div>
        {pendientes.length > 0 && (
          <Button size="sm" className="ml-auto flex-shrink-0" icon={<Zap size={13} />}>
            Auto-conciliar
          </Button>
        )}
      </div>

      {/* Movimientos pendientes */}
      {pendientes.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-3 border-b border-cream-100">
            <h4 className="font-semibold text-navy-800 text-sm">Pendientes de conciliación</h4>
          </div>
          <div className="divide-y divide-cream-100">
            {pendientes.map(mov => (
              <div key={mov.id} className="flex items-center gap-3 p-4 hover:bg-cream-50 transition-colors">
                <div className={cn("p-2 rounded-xl flex-shrink-0",
                  mov.tipo === "ingreso" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>
                  {mov.tipo === "ingreso" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-800">{mov.descripcion}</p>
                  <p className="text-xs text-navy-400">{fmtDate(mov.fecha)}</p>
                </div>
                <p className={cn("text-sm font-bold flex-shrink-0",
                  mov.tipo === "ingreso" ? "text-emerald-700" : "text-rose-600")}>
                  {fmt(mov.monto)}
                </p>
                <Button size="sm" variant="outline" icon={<ArrowRightLeft size={12} />}>
                  Asignar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Conciliados */}
      <Card padding="none">
        <div className="p-5 pb-3 border-b border-cream-100">
          <h4 className="font-semibold text-navy-800 text-sm">Conciliados recientemente</h4>
        </div>
        <div className="divide-y divide-cream-100">
          {conciliados.map(mov => (
            <div key={mov.id} className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-700">{mov.descripcion}</p>
                <p className="text-xs text-navy-400 flex items-center gap-1 mt-0.5">
                  <ChevronRight size={10} />
                  <span className="text-emerald-700 font-medium">{mov.match}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-navy-800">{fmt(mov.monto)}</p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <span className="text-[10px] text-navy-400">confianza</span>
                  <span className={cn("text-[11px] font-bold",
                    (mov.confianza ?? 0) >= 0.9 ? "text-emerald-600" : "text-amber-600")}>
                    {Math.round((mov.confianza ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── page principal ───────────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState<"ingreso" | "egreso">("ingreso");

  const openModal = (tipo: "ingreso" | "egreso") => {
    setModalTipo(tipo);
    setModalOpen(true);
  };

  const pendientesConciliacion = MOCK_CONCILIACIONES.filter(c => c.estado_conc === "pendiente").length;

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-navy-900 leading-tight">Finanzas</h1>
          <p className="text-xs text-navy-400 mt-0.5">Gestión financiera del viaje</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<Download size={13} />} className="hidden sm:flex">
            Exportar
          </Button>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => openModal("ingreso")}>
            Agregar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-50 border border-cream-200 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap relative",
              tab === t.key
                ? "bg-white text-navy-800 shadow-sm"
                : "text-navy-400 hover:text-navy-600"
            )}>
            {t.icon}
            {t.label}
            {t.key === "conciliacion" && pendientesConciliacion > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {pendientesConciliacion}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "resumen"      && <TabResumen />}
      {tab === "ingresos"     && <TabIngresos onAdd={() => openModal("ingreso")} />}
      {tab === "egresos"      && <TabEgresos onAdd={() => openModal("egreso")} />}
      {tab === "instrumentos" && <TabInstrumentos />}
      {tab === "conciliacion" && <TabConciliacion />}

      {/* Modal */}
      <ModalNuevaTransaccion open={modalOpen} onClose={() => setModalOpen(false)} tipo={modalTipo} />
    </div>
  );
}
