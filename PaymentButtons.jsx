"use client";
import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const USDT_WALLET = "TU_DIRECCION_ERC20_AQUI"; // ← reemplazá con tu wallet ERC20

const CHIP_PACKAGES = [
  { chips: 500,  usd: "5.00" },
  { chips: 1000, usd: "10.00" },
  { chips: 2500, usd: "25.00" },
  { chips: 5000, usd: "50.00" },
];

export default function PaymentButtons() {
  const [tab, setTab]               = useState("buy");      // "buy" | "deposit" | "withdraw"
  const [selectedPkg, setSelectedPkg] = useState(CHIP_PACKAGES[1]);
  const [depositAmt, setDepositAmt]   = useState("");
  const [showAddr, setShowAddr]       = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt]   = useState("");
  const [withdrawSent, setWithdrawSent] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [ppSuccess, setPpSuccess]     = useState(false);

  function copyWallet() {
    navigator.clipboard.writeText(USDT_WALLET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDeposit() {
    if (!depositAmt || parseFloat(depositAmt) <= 0) return;
    setShowAddr(true);
  }

  function handleWithdraw() {
    if (!withdrawAddr || withdrawAddr.length < 10) return;
    if (!withdrawAmt || parseFloat(withdrawAmt) <= 0) return;
    setWithdrawSent(true);
    setTimeout(() => setWithdrawSent(false), 5000);
  }

  return (
    <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
      <div style={styles.wrapper}>

        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { key: "buy",      label: "🪙 Comprar" },
            { key: "deposit",  label: "⬇ Depositar" },
            { key: "withdraw", label: "⬆ Retirar" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── BUY CHIPS ── */}
        {tab === "buy" && (
          <div style={styles.panel}>
            <p style={styles.label}>Seleccioná tu paquete</p>
            <div style={styles.pkgGrid}>
              {CHIP_PACKAGES.map(pkg => (
                <button
                  key={pkg.chips}
                  onClick={() => { setSelectedPkg(pkg); setPpSuccess(false); }}
                  style={{
                    ...styles.pkgBtn,
                    ...(selectedPkg.chips === pkg.chips ? styles.pkgBtnActive : {})
                  }}
                >
                  <span style={styles.pkgChips}>{pkg.chips.toLocaleString()}</span>
                  <span style={styles.pkgLabel}>chips</span>
                  <span style={styles.pkgPrice}>${pkg.usd}</span>
                </button>
              ))}
            </div>

            {ppSuccess ? (
              <div style={styles.successBox}>
                ✅ Pago aprobado — {selectedPkg.chips.toLocaleString()} chips acreditados
              </div>
            ) : (
              <div style={styles.ppWrap}>
                <PayPalButtons
                  style={{ layout: "vertical", color: "gold", shape: "rect", height: 50 }}
                  createOrder={(data, actions) =>
                    actions.order.create({
                      purchase_units: [{
                        amount: { value: selectedPkg.usd, currency_code: "USD" },
                        description: `${selectedPkg.chips} chips HWA Casino`,
                      }],
                    })
                  }
                  onApprove={(data, actions) =>
                    actions.order.capture().then(() => setPpSuccess(true))
                  }
                  onError={(err) => console.error("PayPal error:", err)}
                />
              </div>
            )}
          </div>
        )}

        {/* ── DEPOSIT ── */}
        {tab === "deposit" && (
          <div style={styles.panel}>
            <p style={styles.label}>Monto a depositar (USDT ERC20)</p>
            <input
              type="number"
              min="1"
              placeholder="Ej: 20"
              value={depositAmt}
              onChange={e => { setDepositAmt(e.target.value); setShowAddr(false); }}
              style={styles.input}
            />
            <button onClick={handleDeposit} style={styles.btnBlue}>
              Ver dirección de depósito
            </button>

            {showAddr && (
              <div style={styles.addrBox}>
                <p style={styles.addrLabel}>Enviá exactamente <strong>{parseFloat(depositAmt).toFixed(2)} USDT</strong> a:</p>
                <p style={styles.addrText}>{USDT_WALLET}</p>
                <button onClick={copyWallet} style={styles.copyBtn}>
                  {copied ? "✅ Copiado" : "Copiar dirección"}
                </button>
                <p style={styles.addrNote}>Red: ERC20 (Ethereum) · No envíes otro token</p>
              </div>
            )}
          </div>
        )}

        {/* ── WITHDRAW ── */}
        {tab === "withdraw" && (
          <div style={styles.panel}>
            <p style={styles.label}>Tu dirección ERC20</p>
            <input
              type="text"
              placeholder="0x..."
              value={withdrawAddr}
              onChange={e => setWithdrawAddr(e.target.value)}
              style={styles.input}
            />
            <p style={styles.label}>Monto a retirar (USDT)</p>
            <input
              type="number"
              min="1"
              placeholder="Ej: 10"
              value={withdrawAmt}
              onChange={e => setWithdrawAmt(e.target.value)}
              style={styles.input}
            />
            <button onClick={handleWithdraw} style={styles.btnOrange}>
              Solicitar retiro
            </button>
            {withdrawSent && (
              <div style={styles.successBox}>
                ✅ Solicitud enviada — procesamos en 24hs hábiles
              </div>
            )}
          </div>
        )}

      </div>
    </PayPalScriptProvider>
  );
}

/* ── Estilos mobile-first ── */
const styles = {
  wrapper: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    background: "#0f1923",
    borderRadius: 16,
    overflow: "hidden",
    color: "#fff",
  },
  tabs: {
    display: "flex",
  },
  tab: {
    flex: 1,
    padding: "14px 4px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    background: "#1a2535",
    color: "#7a8fa6",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all .2s",
  },
  tabActive: {
    background: "#0f1923",
    color: "#fff",
    borderBottom: "2px solid #f5a623",
  },
  panel: {
    padding: "20px 16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    margin: 0,
    fontSize: 13,
    color: "#7a8fa6",
    fontWeight: 500,
  },
  pkgGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  pkgBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "14px 8px",
    borderRadius: 12,
    border: "1.5px solid #1e2e42",
    background: "#1a2535",
    cursor: "pointer",
    transition: "all .18s",
    gap: 2,
  },
  pkgBtnActive: {
    border: "1.5px solid #f5a623",
    background: "#1e2c1a",
  },
  pkgChips: {
    fontSize: 22,
    fontWeight: 700,
    color: "#f5a623",
  },
  pkgLabel: {
    fontSize: 11,
    color: "#7a8fa6",
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    marginTop: 4,
  },
  ppWrap: {
    marginTop: 4,
  },
  successBox: {
    background: "#0d2b1a",
    border: "1px solid #1a5c2e",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    color: "#4ade80",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1.5px solid #1e2e42",
    background: "#1a2535",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  btnBlue: {
    width: "100%",
    padding: "15px",
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    letterSpacing: ".3px",
  },
  btnOrange: {
    width: "100%",
    padding: "15px",
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 12,
    border: "none",
    background: "#f5a623",
    color: "#0f1923",
    cursor: "pointer",
    letterSpacing: ".3px",
    marginTop: 4,
  },
  addrBox: {
    background: "#1a2535",
    border: "1px solid #1e2e42",
    borderRadius: 12,
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  addrLabel: {
    margin: 0,
    fontSize: 13,
    color: "#c0cdd9",
  },
  addrText: {
    margin: 0,
    fontSize: 12,
    color: "#f5a623",
    wordBreak: "break-all",
    fontFamily: "monospace",
  },
  copyBtn: {
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "transparent",
    color: "#60a5fa",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 500,
  },
  addrNote: {
    margin: 0,
    fontSize: 11,
    color: "#4a5e72",
  },
};
