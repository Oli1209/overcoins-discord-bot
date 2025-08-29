# Migracja Discord Bota na Railway

## Instrukcje krok po kroku

### 1. Przygotowanie Railway

1. Zarejestruj się na [Railway.app](https://railway.app)
2. Utwórz nowy projekt
3. Połącz swoje repozytorium GitHub z Railway

### 2. Konfiguracja bazy danych

1. W Railway dashboard, dodaj PostgreSQL database do swojego projektu:
   - Kliknij "New" → "Database" → "PostgreSQL"
   - Railway automatycznie utworzy zmienną środowiskową `DATABASE_URL`

### 3. Ustawienie zmiennych środowiskowych

W Railway dashboard, przejdź do zakładki "Variables" i dodaj:

```
DISCORD_TOKEN=twój_token_discord_bota
CLIENT_ID=id_twojego_bota_discord
NODE_ENV=production
LOG_LEVEL=info
OWNER_ID=twój_discord_user_id (opcjonalne)
```

**Uwaga:** `DATABASE_URL` jest automatycznie dostarczany przez Railway po podłączeniu bazy danych PostgreSQL.

### 4. Migracja bazy danych

Po pierwszym uruchomieniu na Railway, uruchom migrację bazy danych:

1. W Railway dashboard, przejdź do zakładki "Deployments"
2. Po udanym deploymencie, otwórz terminal/console w Railway
3. Uruchom: `npm run db:push`

Lub jeśli wystąpią problemy z migracją:
```bash
npm run db:push:force
```

### 5. Weryfikacja

Po udanej migracji:

1. Sprawdź logi aplikacji w Railway dashboard
2. Sprawdź czy bot jest online na Discord
3. Przetestuj podstawowe komendy ekonomiczne

### 6. Domain i SSL

Railway automatycznie zapewnia:
- Darmową subdomenę (.railway.app)
- Automatyczny SSL
- Load balancing

### Różnice z Replit

1. **Baza danych**: Railway używa prawdziwego PostgreSQL zamiast Neon (ale kompatybilnego)
2. **Keep-alive**: Nie potrzebujesz systemu keep-alive - Railway nie usypia aplikacji
3. **Environment**: Zmienne środowiskowe są zarządzane przez Railway dashboard
4. **Deployment**: Automatyczny deploy przy każdym push do GitHub

### Rozwiązywanie problemów

1. **Bot nie startuje**: Sprawdź zmienne środowiskowe w Railway dashboard
2. **Database errors**: Upewnij się że PostgreSQL jest podłączony i DATABASE_URL jest dostępny
3. **Command errors**: Sprawdź logi w Railway dashboard dla szczegółów

### Useful Railway Commands

- Zobacz logi: Railway dashboard → "Deployments" → wybierz deployment → "View Logs"
- Restart aplikacji: Railway dashboard → "Deployments" → "Redeploy"
- Database studio: `npm run db:studio` (w lokalnym terminalu z ustawionym DATABASE_URL)