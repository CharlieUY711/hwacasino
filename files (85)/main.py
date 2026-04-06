"""
HWA Casino — Telegram Bot v2
Stack: python-telegram-bot v20+ | httpx (HTTP al backend Next.js) | PayPal
SIN SDK de Supabase — toda la DB pasa por el backend web.

Variables de entorno (.env):
  TELEGRAM_BOT_TOKEN
  BACKEND_URL=https://hwacasino.com
  TELEGRAM_BOT_SECRET=hwa_tg_secret_2026
  PAYPAL_CLIENT_ID
  PAYPAL_CLIENT_SECRET
  PAYPAL_MODE=sandbox
  MINIAPP_URL=https://hwacasino.com
"""

import os
import logging
import struct
import httpx
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ConversationHandler, ContextTypes, filters,
)

load_dotenv()
logging.basicConfig(
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════════════

BOT_TOKEN            = os.getenv("TELEGRAM_BOT_TOKEN")
BACKEND_URL          = os.getenv("BACKEND_URL", "https://hwacasino.com").rstrip("/")
BOT_SECRET           = os.getenv("TELEGRAM_BOT_SECRET", "")
PAYPAL_CLIENT_ID     = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE          = os.getenv("PAYPAL_MODE", "sandbox")
MINIAPP_URL          = os.getenv("MINIAPP_URL", "https://hwacasino.com")

ROULETTE_URL = f"{MINIAPP_URL}/roulette/play?room=vip-2"
BJ_URL       = f"{MINIAPP_URL}/blackjack/play?room=vip-2"

PAYPAL_BASE = (
    "https://api-m.paypal.com"
    if PAYPAL_MODE == "live"
    else "https://api-m.sandbox.paypal.com"
)

# Ruleta
RED_NUMBERS   = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
BLACK_NUMBERS = {2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35}

NECTAR_PER_USD  = 1000
MIN_DEPOSIT_USD = 10
MAX_DEPOSIT_USD = 1000
WELCOME_NECTAR  = 1000
PRESET_DEPOSIT_USD = [10, 25, 50, 100, 250, 500]

# Estados ConversationHandler
VIP_WAITING = 0

# ══════════════════════════════════════════════════════════════════════════════
# BACKEND HTTP CLIENT
# ══════════════════════════════════════════════════════════════════════════════

def _headers() -> dict:
    return {
        "Content-Type":    "application/json",
        "x-telegram-secret": BOT_SECRET,
    }


async def api_register(telegram_id: int, username: str, invite_code: str) -> dict:
    """POST /api/telegram/register"""
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{BACKEND_URL}/api/telegram/register",
            headers=_headers(),
            json={"telegram_id": telegram_id, "username": username, "invite_code": invite_code},
        )
    res.raise_for_status()
    return res.json()


async def api_balance(telegram_id: int) -> dict | None:
    """GET /api/telegram/balance?telegram_id=X — None si no existe"""
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            f"{BACKEND_URL}/api/telegram/balance",
            headers=_headers(),
            params={"telegram_id": telegram_id},
        )
    if res.status_code == 404:
        return None
    res.raise_for_status()
    return res.json()


async def api_bet(
    telegram_id: int,
    bet_amount: int,
    bet_type: str,
    bet_value: str | None,
    result_number: int,
    won: bool,
    payout: int,
) -> dict:
    """POST /api/telegram/bet — debita, acredita y registra"""
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{BACKEND_URL}/api/telegram/bet",
            headers=_headers(),
            json={
                "telegram_id":   telegram_id,
                "bet_amount":    bet_amount,
                "bet_type":      bet_type,
                "bet_value":     bet_value,
                "result_number": result_number,
                "won":           won,
                "payout":        payout,
            },
        )
    res.raise_for_status()
    return res.json()

async def api_get_token(telegram_id: int) -> str:
    """POST /api/telegram/token — genera token de sesion para WebApp"""
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{BACKEND_URL}/api/telegram/token",
            headers=_headers(),
            json={"telegram_id": telegram_id},
        )
    res.raise_for_status()
    return res.json()["token"]


# ══════════════════════════════════════════════════════════════════════════════
# PAYPAL (llamadas directas — no involucra Supabase)
# ══════════════════════════════════════════════════════════════════════════════

async def paypal_get_token() -> str:
    credentials = httpx.BasicAuth(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            auth=credentials,
            data={"grant_type": "client_credentials"},
        )
    res.raise_for_status()
    return res.json()["access_token"]


async def paypal_create_order(user_id: str, amount_usd: float) -> dict:
    token   = await paypal_get_token()
    nectar  = int(amount_usd * NECTAR_PER_USD)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {"currency_code": "USD", "value": f"{amount_usd:.2f}"},
            "description": f"HWA Casino — {nectar:,} Nectar".replace(",", "."),
            "custom_id": user_id,
        }],
        "application_context": {
            "brand_name":  "HWA Casino",
            "user_action": "PAY_NOW",
            "return_url":  f"{MINIAPP_URL}/deposit/success",
            "cancel_url":  f"{MINIAPP_URL}/deposit",
        },
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{PAYPAL_BASE}/v2/checkout/orders", json=body, headers=headers)
    res.raise_for_status()
    data = res.json()
    approve_url = next((l["href"] for l in data["links"] if l["rel"] == "approve"), None)
    return {"order_id": data["id"], "approve_url": approve_url, "nectar": nectar}


async def paypal_capture_order(order_id: str) -> dict:
    token   = await paypal_get_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{PAYPAL_BASE}/v2/checkout/orders/{order_id}/capture",
            headers=headers,
            json={},
        )
    data = res.json()
    if data.get("status") != "COMPLETED":
        raise ValueError(f"Pago no completado: {data.get('status')}")
    unit    = data["purchase_units"][0]
    paid    = float(unit["payments"]["captures"][0]["amount"]["value"])
    user_id = unit.get("custom_id") or unit["payments"]["captures"][0].get("custom_id")
    return {"paid_usd": paid, "user_id": user_id}


async def api_register_deposit_and_capture(
    telegram_id: int, user_id: str, order_id: str, amount_usd: float
) -> dict:
    """
    Registra y captura el deposito via el backend web.
    Llama a /api/paypal/capture que ya existe en la web.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            f"{BACKEND_URL}/api/paypal/capture",
            headers=_headers(),
            json={"orderId": order_id, "telegram_id": telegram_id},
        )
    if res.status_code == 200:
        return res.json()
    raise ValueError(f"Capture failed: {res.text}")

# ══════════════════════════════════════════════════════════════════════════════
# RULETA ENGINE (server-side RNG — nunca cliente)
# ══════════════════════════════════════════════════════════════════════════════

def secure_spin() -> int:
    """RNG criptografico con rejection sampling. Retorna 0-36."""
    max_val = (0xFFFFFFFF // 37) * 37
    while True:
        val = struct.unpack(">I", os.urandom(4))[0]
        if val < max_val:
            return val % 37


def get_color(n: int) -> str:
    if n == 0:             return "green"
    if n in RED_NUMBERS:   return "red"
    return "black"


def color_emoji(n: int) -> str:
    return {"red": "🔴", "black": "⚫", "green": "🟢"}[get_color(n)]


def evaluate_roulette(bet_type: str, bet_value: str | None, result: int) -> tuple[bool, int]:
    """Retorna (gano, multiplicador). payout = apuesta * mult."""
    mapping = {
        "red":    lambda r: r in RED_NUMBERS,
        "black":  lambda r: r in BLACK_NUMBERS,
        "odd":    lambda r: r != 0 and r % 2 != 0,
        "even":   lambda r: r != 0 and r % 2 == 0,
        "low":    lambda r: 1 <= r <= 18,
        "high":   lambda r: 19 <= r <= 36,
        "dozen1": lambda r: 1 <= r <= 12,
        "dozen2": lambda r: 13 <= r <= 24,
        "dozen3": lambda r: 25 <= r <= 36,
        "col1":   lambda r: r != 0 and r % 3 == 1,
        "col2":   lambda r: r != 0 and r % 3 == 2,
        "col3":   lambda r: r != 0 and r % 3 == 0,
    }
    mult_map = {
        "red": 2, "black": 2, "odd": 2, "even": 2, "low": 2, "high": 2,
        "dozen1": 3, "dozen2": 3, "dozen3": 3,
        "col1": 3, "col2": 3, "col3": 3,
        "number": 36,
    }
    if bet_type == "number":
        won = result == int(bet_value)
    else:
        fn  = mapping.get(bet_type)
        won = fn(result) if fn else False

    mult = mult_map.get(bet_type, 0)
    return won, (mult if won else 0)

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS UI
# ══════════════════════════════════════════════════════════════════════════════

def fmt_nectar(n: int) -> str:
    return f"{n:,} Nectar".replace(",", ".")


def main_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f3a1 Ruleta",    callback_data="menu_roulette"),
         InlineKeyboardButton("\U0001f0cf Blackjack", callback_data="menu_blackjack")],
        [InlineKeyboardButton("\U0001f4b3 Depositar", callback_data="menu_deposit"),
         InlineKeyboardButton("\U0001f4b0 Balance",   callback_data="menu_balance")],
    ])

# ══════════════════════════════════════════════════════════════════════════════
# HANDLERS — INICIO Y VIP
# ══════════════════════════════════════════════════════════════════════════════

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id   = update.effective_user.id
    tg_name = update.effective_user.username or update.effective_user.first_name

    user = await api_balance(tg_id)

    if user:
        await update.message.reply_text(
            f"\u2660\ufe0f *Bienvenido de vuelta, {user['username']}*\n\n"
            f"\U0001f4b0 Balance: *{fmt_nectar(user['balance'])}*\n\n"
            f"\u00bfQu\u00e9 quer\u00e9s hacer?",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "\u2660\ufe0f *HWA Casino*\n\n"
        "_Plataforma privada. Solo por invitaci\u00f3n._\n\n"
        "Ingres\u00e1 tu c\u00f3digo VIP para continuar:",
        parse_mode="Markdown",
    )
    return VIP_WAITING


async def vip_code_handler(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id   = update.effective_user.id
    tg_name = update.effective_user.username or update.effective_user.first_name
    code    = update.message.text.strip()

    try:
        result = await api_register(tg_id, tg_name, code)
    except httpx.HTTPStatusError as e:
        try:
            body = e.response.json()
        except Exception:
            body = {}
        err  = body.get("error", "Error desconocido")

        if "invalid" in err.lower() or "used" in err.lower():
            await update.message.reply_text(
                "\u274c C\u00f3digo inv\u00e1lido o ya utilizado.\n"
                "Verific\u00e1 el c\u00f3digo e intent\u00e1 de nuevo."
            )
            return VIP_WAITING

        logger.error(f"Error registrando {tg_id}: {e}")
        await update.message.reply_text("\u274c Error al registrar tu cuenta. Contact\u00e1 soporte.")
        return ConversationHandler.END
    except Exception as e:
        logger.error(f"Error inesperado registrando {tg_id}: {e}")
        await update.message.reply_text("\u274c Error de conexi\u00f3n. Intent\u00e1 m\u00e1s tarde.")
        return ConversationHandler.END

    username = result.get("username", tg_name)
    balance  = result.get("balance", WELCOME_NECTAR)

    await update.message.reply_text(
        f"\u2705 *Bienvenido a HWA Casino, {username}*\n\n"
        f"\U0001f381 Recibiste *{fmt_nectar(WELCOME_NECTAR)}* de bienvenida.\n\n"
        f"\u00bfQu\u00e9 quer\u00e9s hacer?",
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )
    return ConversationHandler.END

# ══════════════════════════════════════════════════════════════════════════════
# HANDLERS — MENU
# ══════════════════════════════════════════════════════════════════════════════

async def cmd_menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id   = update.effective_user.id
    user    = await api_balance(tg_id)
    if not user:
        await update.message.reply_text("\u274c Us\u00e1 /start para registrarte primero.")
        return
    await update.message.reply_text(
        f"\u2660\ufe0f *HWA Casino*\n\U0001f4b0 {fmt_nectar(user['balance'])}",
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )


async def cmd_balance(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    user  = await api_balance(tg_id)
    if not user:
        await update.message.reply_text("\u274c Us\u00e1 /start para registrarte primero.")
        return
    await update.message.reply_text(
        f"\U0001f4b0 *Tu balance*\n\n*{fmt_nectar(user['balance'])}*",
        parse_mode="Markdown",
    )


async def cmd_depositar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    user  = await api_balance(tg_id)
    if not user:
        await update.message.reply_text("\u274c Us\u00e1 /start para registrarte primero.")
        return
    await _send_deposit_menu_msg(update.message.reply_text, user["balance"])


async def menu_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data
    tg_id = update.effective_user.id

    user = await api_balance(tg_id)
    if not user:
        await query.edit_message_text("\u274c Sesi\u00f3n expirada. Us\u00e1 /start.")
        return

    if data == "menu_balance":
        await query.edit_message_text(
            f"\U0001f4b0 *Tu balance*\n\n*{fmt_nectar(user['balance'])}*\n\n"
            f"1 USD = {NECTAR_PER_USD:,} Nectar".replace(",", "."),
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("\U0001f4b3 Depositar", callback_data="menu_deposit"),
                 InlineKeyboardButton("\u25c0\ufe0f Menu",    callback_data="menu_back")],
            ]),
        )
    elif data == "menu_roulette":
        try:
            token = await api_get_token(tg_id)
            roulette_url = f"{ROULETTE_URL}&tg_token={token}"
        except Exception:
            roulette_url = ROULETTE_URL
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("\U0001f3a1 Abrir Ruleta", web_app=WebAppInfo(url=roulette_url))],
            [InlineKeyboardButton("\u25c0\ufe0f Menu", callback_data="menu_back")],
        ])
        await query.edit_message_text(
            f"\U0001f3a1 *Ruleta*\n\U0001f4b0 {fmt_nectar(user['balance'])}\n\nToc\u00e1 el bot\u00f3n para jugar:",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    elif data == "menu_deposit":
        await show_deposit_menu(query, user)
    elif data == "menu_back":
        await query.edit_message_text(
            f"\u2660\ufe0f *HWA Casino*\n\U0001f4b0 {fmt_nectar(user['balance'])}",
            parse_mode="Markdown",
            reply_markup=main_menu_keyboard(),
        )

# ══════════════════════════════════════════════════════════════════════════════
# HANDLERS — RULETA
# ══════════════════════════════════════════════════════════════════════════════

async def show_roulette_menu(query, user: dict):
    balance = user["balance"]
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f534 Rojo",     callback_data="rt_red"),
         InlineKeyboardButton("\u26ab Negro",         callback_data="rt_black"),
         InlineKeyboardButton("\U0001f7e2 Cero",      callback_data="rt_number_0")],
        [InlineKeyboardButton("Impar",               callback_data="rt_odd"),
         InlineKeyboardButton("Par",                 callback_data="rt_even")],
        [InlineKeyboardButton("1-18",                callback_data="rt_low"),
         InlineKeyboardButton("19-36",               callback_data="rt_high")],
        [InlineKeyboardButton("1a Docena",           callback_data="rt_dozen1"),
         InlineKeyboardButton("2a Docena",           callback_data="rt_dozen2"),
         InlineKeyboardButton("3a Docena",           callback_data="rt_dozen3")],
        [InlineKeyboardButton("Col 1 (2:1)",         callback_data="rt_col1"),
         InlineKeyboardButton("Col 2 (2:1)",         callback_data="rt_col2"),
         InlineKeyboardButton("Col 3 (2:1)",         callback_data="rt_col3")],
        [InlineKeyboardButton("\u25c0\ufe0f Menu",   callback_data="menu_back")],
    ])
    await query.edit_message_text(
        f"\U0001f3a1 *RULETA*\n"
        f"\U0001f4b0 Balance: *{fmt_nectar(balance)}*\n\n"
        f"Eleg\u00ed tu tipo de apuesta:",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def roulette_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data
    tg_id = update.effective_user.id

    user = await api_balance(tg_id)
    if not user:
        await query.edit_message_text("\u274c Sesi\u00f3n expirada. Us\u00e1 /start.")
        return

    # Seleccion de tipo de apuesta
    if not data.startswith("rt_amt_"):
        parts     = data[3:].split("_")
        bet_type  = parts[0]
        bet_value = parts[1] if len(parts) > 1 else None

        ctx.user_data["rt_type"]  = bet_type
        ctx.user_data["rt_value"] = bet_value

        payout_info = {
            "red": "1:1", "black": "1:1", "odd": "1:1", "even": "1:1",
            "low": "1:1", "high": "1:1",
            "dozen1": "2:1", "dozen2": "2:1", "dozen3": "2:1",
            "col1": "2:1", "col2": "2:1", "col3": "2:1",
            "number": "35:1",
        }.get(bet_type, "?")

        label_map = {
            "red": "Rojo", "black": "Negro", "odd": "Impar", "even": "Par",
            "low": "1-18", "high": "19-36",
            "dozen1": "1a Docena", "dozen2": "2a Docena", "dozen3": "3a Docena",
            "col1": "Col 1", "col2": "Col 2", "col3": "Col 3",
            "number": f"N\u00famero {bet_value}",
        }
        label   = label_map.get(bet_type, bet_type)
        balance = user["balance"]

        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("10 N",     callback_data="rt_amt_10"),
             InlineKeyboardButton("50 N",     callback_data="rt_amt_50"),
             InlineKeyboardButton("100 N",    callback_data="rt_amt_100")],
            [InlineKeyboardButton("250 N",    callback_data="rt_amt_250"),
             InlineKeyboardButton("500 N",    callback_data="rt_amt_500"),
             InlineKeyboardButton("1.000 N",  callback_data="rt_amt_1000")],
            [InlineKeyboardButton("5.000 N",  callback_data="rt_amt_5000"),
             InlineKeyboardButton("10.000 N", callback_data="rt_amt_10000")],
            [InlineKeyboardButton("\u25c0\ufe0f Volver", callback_data="menu_roulette")],
        ])
        await query.edit_message_text(
            f"\U0001f3a1 *RULETA \u2014 {label}* ({payout_info})\n"
            f"\U0001f4b0 Balance: *{fmt_nectar(balance)}*\n\n"
            f"Eleg\u00ed cu\u00e1nto apostar:",
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
        return

    # Apuesta con monto seleccionado
    bet_amount = int(data.split("_")[-1])
    bet_type   = ctx.user_data.get("rt_type")
    bet_value  = ctx.user_data.get("rt_value")

    if not bet_type:
        await query.edit_message_text("\u274c Error. Us\u00e1 /menu para volver.")
        return

    if user["balance"] < bet_amount:
        await query.answer(
            f"Saldo insuficiente. Ten\u00e9s {fmt_nectar(user['balance'])}.",
            show_alert=True,
        )
        return

    await query.edit_message_text("\U0001f3a1 La ruleta est\u00e1 girando...\n\n\U0001f504")

    result      = secure_spin()
    won, mult   = evaluate_roulette(bet_type, bet_value, result)
    payout      = bet_amount * mult if won else 0

    try:
        resp        = await api_bet(tg_id, bet_amount, bet_type, bet_value, result, won, payout)
        new_balance = resp["new_balance"]
    except httpx.HTTPStatusError as e:
        try:
            body = e.response.json()
        except Exception:
            body = {}
        if "insufficient" in body.get("error", "").lower():
            await query.edit_message_text(
                "\u274c Saldo insuficiente.\n"
                "Us\u00e1 \U0001f4b3 Depositar para recargar.",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("\U0001f4b3 Depositar", callback_data="menu_deposit"),
                     InlineKeyboardButton("\u25c0\ufe0f Menu",    callback_data="menu_back")],
                ]),
            )
        else:
            logger.error(f"Error registrando apuesta: {e}")
            await query.edit_message_text("\u274c Error al registrar la apuesta. Contact\u00e1 soporte.")
        return
    except Exception as e:
        logger.error(f"Error inesperado en apuesta: {e}")
        await query.edit_message_text("\u274c Error de conexi\u00f3n. Intent\u00e1 de nuevo.")
        return

    emoji_num  = f"{color_emoji(result)} {result}"
    color_text = {"red": "Rojo", "black": "Negro", "green": "Verde"}[get_color(result)]

    if won:
        net_win = payout - bet_amount
        msg = (
            f"\U0001f3b0 *RULETA \u2014 RESULTADO*\n\n"
            f"\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n"
            f"\u2551   {emoji_num}  {color_text}\n"
            f"\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n\n"
            f"\u2705 *GANASTE*\n"
            f"Apostaste: {fmt_nectar(bet_amount)}\n"
            f"Ganancia: +{fmt_nectar(net_win)}\n\n"
            f"\U0001f4b0 Balance: *{fmt_nectar(new_balance)}*"
        )
    else:
        msg = (
            f"\U0001f3b0 *RULETA \u2014 RESULTADO*\n\n"
            f"\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n"
            f"\u2551   {emoji_num}  {color_text}\n"
            f"\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n\n"
            f"\u274c *Perdiste*\n"
            f"Apostaste: {fmt_nectar(bet_amount)}\n\n"
            f"\U0001f4b0 Balance: *{fmt_nectar(new_balance)}*"
        )

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("\U0001f504 Girar de nuevo", callback_data=f"rt_amt_{bet_amount}"),
         InlineKeyboardButton("\u25c0\ufe0f Men\u00fa",   callback_data="menu_back")],
    ])
    await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=keyboard)

# ══════════════════════════════════════════════════════════════════════════════
# HANDLERS — DEPOSITO PAYPAL
# ══════════════════════════════════════════════════════════════════════════════

async def _send_deposit_menu_msg(reply_fn, balance: int):
    keyboard_rows = []
    row = []
    for usd in PRESET_DEPOSIT_USD:
        nectar = usd * NECTAR_PER_USD
        row.append(InlineKeyboardButton(
            f"${usd} = {nectar // 1000}K N",
            callback_data=f"dep_amt_{usd}",
        ))
        if len(row) == 3:
            keyboard_rows.append(row)
            row = []
    if row:
        keyboard_rows.append(row)
    keyboard_rows.append([InlineKeyboardButton("\u25c0\ufe0f Men\u00fa", callback_data="menu_back")])

    await reply_fn(
        f"\U0001f4b3 *DEPOSITAR NECTAR*\n"
        f"Balance actual: *{fmt_nectar(balance)}*\n\n"
        f"1 USD = 1.000 Nectar\n"
        f"M\u00ednimo: ${MIN_DEPOSIT_USD} | M\u00e1ximo: ${MAX_DEPOSIT_USD}\n\n"
        f"Eleg\u00ed el monto:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard_rows),
    )


async def show_deposit_menu(query, user: dict):
    await _send_deposit_menu_msg(query.edit_message_text, user["balance"])


async def deposit_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data
    tg_id = update.effective_user.id

    user = await api_balance(tg_id)
    if not user:
        await query.edit_message_text("\u274c Sesi\u00f3n expirada. Us\u00e1 /start.")
        return

    if data.startswith("dep_amt_"):
        usd    = int(data.split("_")[-1])
        nectar = usd * NECTAR_PER_USD
        ctx.user_data["dep_usd"]    = usd
        ctx.user_data["dep_nectar"] = nectar

        await query.edit_message_text(
            f"\U0001f4b3 *Resumen del dep\u00f3sito*\n\n"
            f"Pag\u00e1s: *${usd:.2f} USD*\n"
            f"Recib\u00eds: *{fmt_nectar(nectar)}*\n\n"
            f"Pago procesado por PayPal.",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("\u2705 Confirmar y pagar con PayPal", callback_data="dep_confirm")],
                [InlineKeyboardButton("\u25c0\ufe0f Cambiar monto",          callback_data="menu_deposit")],
            ]),
        )

    elif data == "dep_confirm":
        usd    = ctx.user_data.get("dep_usd")
        nectar = ctx.user_data.get("dep_nectar")
        if not usd:
            await query.edit_message_text("\u274c Error. Us\u00e1 /menu para volver.")
            return

        await query.edit_message_text("\u23f3 Generando link de pago PayPal...")

        try:
            order = await paypal_create_order(user["user_id"], usd)
            ctx.user_data["dep_order_id"] = order["order_id"]

            await query.edit_message_text(
                f"\u2705 *Link de pago generado*\n\n"
                f"Monto: *${usd:.2f} USD*\n"
                f"Nectar a acreditar: *{fmt_nectar(nectar)}*\n\n"
                f"1. Pres\u00edona *Pagar con PayPal*\n"
                f"2. Complet\u00e1 el pago en el navegador\n"
                f"3. Volv\u00e9 y pres\u00edona *Ya pagu\u00e9 \u2014 verificar*\n\n"
                f"_El link expira en 3 horas._",
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("\U0001f4b3 Pagar con PayPal", url=order["approve_url"])],
                    [InlineKeyboardButton("\u2705 Ya pagu\u00e9 \u2014 verificar",
                                         callback_data=f"dep_capture_{order['order_id']}")],
                    [InlineKeyboardButton("\u274c Cancelar", callback_data="menu_back")],
                ]),
            )
        except Exception as e:
            logger.error(f"Error creando orden PayPal: {e}")
            await query.edit_message_text(
                "\u274c Error generando el link de pago.\n"
                "Intent\u00e1 de nuevo o contact\u00e1 soporte."
            )

    elif data.startswith("dep_capture_"):
        order_id = data.split("dep_capture_")[-1]
        await query.edit_message_text("\u23f3 Verificando pago...")

        try:
            capture = await paypal_capture_order(order_id)
            nectar  = int(capture["paid_usd"] * NECTAR_PER_USD)

            # Acreditar via ruta del backend (reutiliza /api/paypal/capture si acepta telegram_id)
            # Por ahora llamamos directamente al backend con el order_id
            result = await api_register_deposit_and_capture(tg_id, user["user_id"], order_id, capture["paid_usd"])

            fresh = await api_balance(tg_id)
            new_bal = fresh["balance"] if fresh else user["balance"] + nectar

            await query.edit_message_text(
                f"\u2705 *Dep\u00f3sito confirmado*\n\n"
                f"Se acreditaron *{fmt_nectar(nectar)}*\n"
                f"Balance nuevo: *{fmt_nectar(new_bal)}*\n\n"
                f"Buena suerte!",
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("\U0001f3a1 Jugar Ruleta", callback_data="menu_roulette"),
                     InlineKeyboardButton("\u25c0\ufe0f Men\u00fa",  callback_data="menu_back")],
                ]),
            )
        except ValueError:
            await query.edit_message_text(
                "\u23f3 *Pago pendiente*\n\n"
                "El pago a\u00fan no fue confirmado por PayPal.\n"
                "Si ya pagaste, esper\u00e1 unos segundos e intent\u00e1 de nuevo.",
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("\U0001f504 Verificar de nuevo",
                                         callback_data=f"dep_capture_{order_id}")],
                    [InlineKeyboardButton("\u274c Cancelar", callback_data="menu_back")],
                ]),
            )
        except Exception as e:
            logger.error(f"Error capturando orden {order_id}: {e}")
            await query.edit_message_text(
                "\u274c Error verificando el pago.\n"
                "Si ya pagaste, contact\u00e1 soporte con tu comprobante."
            )

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    if not BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no configurado")
    if not BOT_SECRET:
        raise ValueError("TELEGRAM_BOT_SECRET no configurado")
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise ValueError("PayPal no configurado")

    app = Application.builder().token(BOT_TOKEN).build()

    vip_conv = ConversationHandler(
        entry_points=[CommandHandler("start", cmd_start)],
        states={
            VIP_WAITING: [MessageHandler(filters.TEXT & ~filters.COMMAND, vip_code_handler)],
        },
        fallbacks=[CommandHandler("start", cmd_start)],
        per_message=False,
    )

    app.add_handler(vip_conv)
    app.add_handler(CommandHandler("menu",      cmd_menu))
    app.add_handler(CommandHandler("balance",   cmd_balance))
    app.add_handler(CommandHandler("depositar", cmd_depositar))
    app.add_handler(CallbackQueryHandler(menu_callback,     pattern=r"^menu_"))
    app.add_handler(CallbackQueryHandler(roulette_callback, pattern=r"^rt_"))
    app.add_handler(CallbackQueryHandler(deposit_callback,  pattern=r"^dep_"))

    logger.info("HWA Casino Bot v2 iniciado — HTTP mode")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()

