# Quasselstrippe 🦜

Eine moderne, didaktisch durchdachte Vokabel-Lernapp für Schüler (Englisch & Latein) mit Leitner-5-Fächer-System, Sprachausgabe, KI-gestütztem Arbeitsblatt-Scanner (Gemini Vision) und SQLite-Persistenz.

Die Anwendung ist in **Client** (React 19 + TypeScript + Vite) und **Server** (Node.js + Express + SQLite) aufgeteilt und kann sowohl lokal im Entwicklungsmodus als auch gemeinsam in einem einzigen **Docker-Container** betrieben werden.

---

## 🏗️ Architektur

```
quasselstrippe/
├── client/                     # Frontend (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── components/         # Learner Dashboard, Flashcards, Quiz, Admin, etc.
│   │   ├── services/
│   │   │   ├── api.ts          # Typed REST API Client für Backend
│   │   │   ├── storage.ts      # SQLite-Integration mit IndexedDB-Offline-Cache
│   │   │   ├── gemini.ts       # Arbeitsblatt-Analyse (Server-Proxy & Client-Fallback)
│   │   │   └── speech.ts       # Text-to-Speech Engine
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts          # Proxy für /api -> http://localhost:3001 im Dev-Modus
│
├── server/                     # Backend (Node.js + Express + SQLite)
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts     # SQLite Verbindung (node:sqlite WAL-Modus) & Abfragen
│   │   │   └── seed.ts         # Automatische Initialdaten (Englisch & Latein)
│   │   ├── routes/
│   │   │   ├── words.ts        # REST API für Vokabeln, Review, Leitner-Boxen
│   │   │   ├── settings.ts     # REST API für App-Einstellungen
│   │   │   └── ai.ts           # Gemini Vision Proxy für Arbeitsblatt-Uploads
│   │   └── index.ts            # Express Server: bedient /api & statische Client-Dateien
│   ├── package.json
│   └── tsconfig.json
│
├── data/                       # Host-Verzeichnis für die SQLite-Datenbank (wird per Volume gemountet)
│   └── quasselstrippe.db       # SQLite Datenbankdatei
│
├── Dockerfile                  # Multi-Stage Build: baut Client & Server in einen Container
├── docker-compose.yml          # Container-Konfiguration mit Port 3000 & SQLite-Volume
└── package.json                # Root NPM Workspaces (Orchestrierung)
```

---

## 🚀 Schnelleinstieg mit Docker (Empfohlen)

### 1. Starten mit Docker Compose
```bash
docker compose up -d --build
```
Die Anwendung ist sofort erreichbar unter:
👉 **http://localhost:3000**

Die SQLite-Datenbank wird im lokalen Ordner `./data/quasselstrippe.db` gespeichert und bleibt auch bei Container-Neustarts dauerhaft erhalten.

### 2. Optional: Gemini API-Schlüssel als Umgebungsvariable
Du kannst deinen Gemini-API-Key entweder in der Web-Oberfläche unter *Einstellungen* eintragen oder direkt als Umgebungsvariable im Container übergeben:
```bash
GEMINI_API_KEY="dein-gemini-key" docker compose up -d
```

### 3. Einzelner Docker-Befehl (ohne Compose)
```bash
# Image bauen
docker build -t quasselstrippe .

# Container ausführen mit persistentem SQLite-Volume
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  -e GEMINI_API_KEY="dein-gemini-key" \
  --name quasselstrippe \
  quasselstrippe
```

---

## 💻 Lokale Entwicklung

Voraussetzung: Node.js >= 22 (enthält die native `node:sqlite` Engine).

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Entwicklungsmodus starten
```bash
npm run dev
```
Dies startet parallel:
- **Server:** Express auf `http://localhost:3001` (mit Auto-Reload via `tsx watch`)
- **Client:** Vite Dev-Server auf `http://localhost:5173` (mit HMR und automatischem Proxy für `/api`)

### 3. Einzelne Komponenten starten
- Nur Client: `npm run dev:client`
- Nur Server: `npm run dev:server`

### 4. Produktions-Build lokal testen
```bash
# Client und Server bauen
npm run build

# Produktions-Server starten (bedient Client und API auf Port 3001)
npm start
```

---

## 🗄️ SQLite Datenbank & REST API

Die SQLite-Datenbank verwendet den schnellen **WAL-Modus** (`PRAGMA journal_mode = WAL;`) und wird beim allerersten Start automatisch mit Beispieldaten für Englisch und Latein initialisiert.

### Wichtigste API-Endpunkte:
| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/health` | Status- & Health-Check |
| `GET` | `/api/words` | Liste aller Vokabeln (Filter: `?language=en` oder `?language=la`) |
| `POST` | `/api/words` | Neue Vokabel anlegen |
| `PUT` | `/api/words/:id` | Vokabel bearbeiten |
| `DELETE` | `/api/words/:id` | Vokabel löschen |
| `POST` | `/api/words/delete-lesson` | Gesamte Lektion mit allen Wörtern löschen |
| `POST` | `/api/words/batch` | Mehrere Vokabeln importieren / speichern |
| `POST` | `/api/words/:id/review` | Abfrageergebnis protokollieren (`{ wasCorrect: boolean }`) |
| `POST` | `/api/words/reset-progress` | Leitner-Lernfortschritt (Boxen) zurücksetzen |
| `POST` | `/api/words/reset-defaults` | Auf Standard-Vokabeln zurücksetzen |
| `GET` | `/api/settings` | Einstellungen abrufen |
| `PUT` | `/api/settings` | Einstellungen speichern |
| `POST` | `/api/ai/analyze-worksheet` | Schul-Arbeitsblatt per Gemini Vision analysieren |

---

## ⚙️ Umgebungsvariablen

| Variable | Standardwert | Beschreibung |
|---|---|---|
| `PORT` | `3001` (lokal) / `3000` (Docker) | Port für den Web- & API-Server |
| `DATABASE_PATH` | `./data/quasselstrippe.db` (lokal) / `/data/quasselstrippe.db` (Docker) | Speicherort der SQLite-Datei |
| `CLIENT_DIST_PATH` | `./client/dist` (lokal) / `/app/client/dist` (Docker) | Pfad zum gebauten Client-Frontend |
| `GEMINI_API_KEY` | *(leer)* | Optionaler Server-API-Schlüssel für Gemini Vision |
