"""
Módulo 4 — Mini App: servidor y configuración para Telegram Web App.

La Mini App se sirve como HTML estático y se abre desde el bot con un botón.
Telegram la muestra como ventana nativa dentro de la app.
"""

# ══════════════════════════════════════════════════════════════
# OPCIÓN A — Servidor simple con Python (desarrollo local)
# ══════════════════════════════════════════════════════════════
# Desde la carpeta miniapp/:
#   python -m http.server 8080
# Luego exponerlo con ngrok para pruebas:
#   ngrok http 8080
# La URL de ngrok es la que configurás en el bot.

# ══════════════════════════════════════════════════════════════
# OPCIÓN B — GitHub Pages (gratis, para producción)
# ══════════════════════════════════════════════════════════════
# 1. Creá un repo en GitHub
# 2. Subí index.html a la raíz
# 3. Settings → Pages → Deploy from branch → main
# URL: https://tuusuario.github.io/hwa-casino/
# 100% gratis, HTTPS incluido (Telegram requiere HTTPS)

# ══════════════════════════════════════════════════════════════
# INTEGRACIÓN CON EL BOT
# ══════════════════════════════════════════════════════════════

MINIAPP_INTEGRATION = """
Agregá esto a tu bot/main_v3.py para abrir la Mini App:
"""

BOT_CODE = '''
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes, CommandHandler

MINIAPP_URL = os.getenv("MINIAPP_URL", "https://tuusuario.github.io/hwa-casino/")

async def open_casino(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Abre la Mini App dentro de Telegram."""
    from database.db import Database
    db = Database()
    user = db.get_user(update.effective_user.id)
    
    if not user:
        await update.message.reply_text("❌ No estás registrado. Usá /start.")
        return

    # Construir URL con el balance del usuario como parámetro
    # (En producción, el balance se carga desde tu API backend)
    url = f"{MINIAPP_URL}?balance={user['balance']}&uid={update.effective_user.id}"
    
    keyboard = [[
        InlineKeyboardButton(
            "🎰 Abrir Casino",
            web_app=WebAppInfo(url=url)
        )
    ]]
    
    await update.message.reply_text(
        f"🎰 *Hwa Casino*\\n\\nBalance: *${user['balance']:.2f}*\\n\\nTocá para abrir:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# Agregar en main():
# app.add_handler(CommandHandler("casino", open_casino))
# app.add_handler(CommandHandler("app", open_casino))  # alias

# También podés configurarlo como menú button del bot:
# @BotFather → /mybots → tu bot → Bot Settings → Menu Button → URL de la mini app
'''

# ══════════════════════════════════════════════════════════════
# RECIBIR DATOS DE LA MINI APP EN EL BOT
# ══════════════════════════════════════════════════════════════

WEBAPP_DATA_HANDLER = '''
from telegram.ext import MessageHandler, filters

async def handle_webapp_data(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """
    Recibe datos que la Mini App envía con TG.sendData().
    Útil para procesar depósitos/retiros iniciados desde la app.
    """
    import json
    data = json.loads(update.effective_message.web_app_data.data)
    action = data.get("action")
    user_id = update.effective_user.id
    
    if action == "deposit":
        # Redirigir al flujo de depósito del bot
        await update.message.reply_text("💳 Para depositar, usá /depositar")
    
    elif action == "withdraw":
        await update.message.reply_text("💸 Para retirar, usá /retirar")
    
    elif action == "bet_result":
        # La mini app reporta resultado de apuesta para sincronizar BD
        game = data.get("game")
        amount = data.get("amount", 0)
        won = data.get("won", False)
        net = data.get("net", 0)
        
        from database.db import Database
        db = Database()
        db.update_balance(user_id, net)
        db.record_bet(user_id, game, amount, amount + net if won else 0, data)

# Agregar en main():
# app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))
'''

print(MINIAPP_INTEGRATION)
print(BOT_CODE)
print("\n" + "═"*60)
print("WEBAPP_DATA_HANDLER:")
print(WEBAPP_DATA_HANDLER)
