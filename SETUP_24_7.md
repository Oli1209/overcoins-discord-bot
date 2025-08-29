# Konfiguracja hostingu 24/7 dla Discord bota

## Problem
Darmowy hosting Replita może usypiać aplikacje przy braku aktywności. Bot został ulepszony o agresywny system keep-alive, ale dla **prawdziwego 24/7** potrzebujesz zewnętrznego monitorowania.

## Rozwiązanie: UptimeRobot (DARMOWY)

### Krok 1: Pobierz URL swojego bota
1. Twój bot działa na porcie 5000
2. URL to: `https://TWOJA-NAZWA-REPL.TWOJ-USERNAME.repl.co/ping`
3. Przykład: `https://discord-bot.john123.repl.co/ping`

### Krok 2: Załóż konto UptimeRobot
1. Idź na: https://uptimerobot.com/
2. Załóż darmowe konto (50 monitorów gratis)
3. Zweryfikuj email

### Krok 3: Dodaj monitor
1. Kliknij **"+ Add New Monitor"**
2. Wypełnij dane:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Discord Bot OverCoins
   - **URL**: `https://TWOJA-NAZWA-REPL.TWOJ-USERNAME.repl.co/ping`
   - **Monitoring Interval**: 5 minutes (minimum dla darmowego)
3. Kliknij **"Create Monitor"**

### Krok 4: Sprawdź działanie
- UptimeRobot będzie pingować Twojego bota co 5 minut
- Bot będzie odpowiadał statusem JSON
- To zapobiegnie usypianiu przez Replita

## Dodatkowe endpointy

Twój bot ma 3 endpointy do monitorowania:

### `/ping` - Podstawowy status
```json
{
  "status": "alive",
  "timestamp": "2025-08-29T...",
  "uptime": 3600,
  "bot": {
    "ready": true,
    "guilds": 2,
    "ping": 45
  }
}
```

### `/status` - Szczegółowe statystyki
```json
{
  "status": "ok",
  "system": {
    "uptime": 3600,
    "memory": {"used": 150, "total": 512}
  },
  "discord": {
    "guilds": 2,
    "users": 1250,
    "ping": 45
  }
}
```

### `/health` - Health check
```json
{
  "healthy": true,
  "checks": {
    "bot_ready": true,
    "websocket_ok": true,
    "guilds_connected": true
  }
}
```

## System Keep-Alive (Ulepszony)

Bot ma teraz **agresywny system keep-alive**:

- ✅ **Heartbeat co 2 minuty** (wcześniej 5)
- ✅ **Self-ping co 10 minut** - pinguje sam siebie
- ✅ **Zmiana statusu co 2-4 minuty** (wcześniej 3-5)
- ✅ **Discord API ping co 90 sekund** - małe żądania API
- ✅ **Cache refresh co 3 minuty** (wcześniej 6)
- ✅ **Background tasks co 5 minut** (wcześniej 8)

## Alternatywne rozwiązania

### 1. Reserved VM (PŁATNE)
- Gwarancja 24/7 uptime
- Koszt: ~$7/miesiąc
- Konfiguracja: Deploy → Reserved VM

### 2. Inne darmowe serwisy
- **Railway.app** - 500h/miesiąc darmowo
- **Render.com** - 750h/miesiąc darmowo
- **Heroku** - już nie ma darmowego planu

## Monitorowanie działania

Sprawdź logi bota, powinieneś widzieć:
```
[SELF-PING] Internal ping successful - bot staying active
[DISCORD-PING] API activity ping | Guilds: 2 | WS: 45ms
[KEEP-ALIVE] Activity changed to: Playing blackjack 🎰
```

Jeśli widzisz te komunikaty - system działa poprawnie!

## Troubleshooting

### Bot nadal się wyłącza?
1. Sprawdź czy UptimeRobot pinguje poprawny URL
2. Upewnij się, że bot jest `deployed` a nie tylko `running`
3. Rozważ Reserved VM ($7/miesiąc) dla 100% gwarancji

### Błędy w logach?
- `[SELF-PING] Internal ping failed` - sprawdź port 5000
- `[DISCORD-PING] Discord API ping error` - problem z tokenem
- `[HTTP] Server error` - sprawdź konfigurację HTTP serwera

---

**Pamiętaj**: Darmowy hosting ma ograniczenia. UptimeRobot + agresywny keep-alive powinny dramatycznie poprawić uptime, ale Reserved VM to jedyna gwarancja 100% dostępności.