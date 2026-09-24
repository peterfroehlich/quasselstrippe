# Quasselstrippe 🦜

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Eine moderne, didaktisch durchdachte Vokabel-Lernapp für Schüler (Englisch & Latein) mit Leitner-5-Fächer-System, Sprachausgabe, KI-gestütztem Arbeitsblatt-Scanner (Gemini Vision) und SQLite-Persistenz.

Die Anwendung ist in **Frontend** (React 19 + TypeScript + Vite + Nginx) und **Backend** (Node.js 22 + Express + SQLite) aufgeteilt und vollständig für den Betrieb in **Kubernetes (K8s)** sowie **Docker Compose** ausgelegt.

---

## 🏗️ Architektur & Container

```
quasselstrippe/
├── client/                     # Frontend (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── components/         # Learner Dashboard, Flashcards, Quiz, Admin, etc.
│   │   ├── services/
│   │   │   ├── api.ts          # REST API Client für Backend
│   │   │   ├── storage.ts      # SQLite-Integration mit IndexedDB-Offline-Cache
│   │   │   ├── gemini.ts       # Arbeitsblatt-Analyse (Server-Proxy & Fallback)
│   │   │   └── speech.ts       # Text-to-Speech Engine
│   │   └── types/
│   ├── nginx.conf.template     # Nginx-Konfiguration mit /healthz & /api/ Reverse-Proxy
│   ├── docker-entrypoint.sh    # Nginx Entrypoint-Hook zur BACKEND_URL Konfiguration
│   └── package.json
│
├── server/                     # Backend (Node.js 22 + Express + SQLite)
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts     # SQLite (node:sqlite WAL), Healthcheck & Graceful Close
│   │   │   └── seed.ts         # Automatische Initialdaten (Englisch & Latein)
│   │   ├── routes/
│   │   │   ├── words.ts        # REST API für Vokabeln, Review, Leitner-Boxen
│   │   │   ├── settings.ts     # REST API für App-Einstellungen
│   │   │   └── ai.ts           # Gemini Vision Proxy für Arbeitsblatt-Uploads
│   │   └── index.ts            # Express Server mit /healthz, /readyz & SIGTERM-Handler
│   ├── package.json
│   └── tsconfig.json
│
├── k8s/                        # Vollständige Kubernetes-Manifeste (Kustomize-kompatibel)
│   ├── namespace.yaml          # Namespace 'quasselstrippe'
│   ├── pvc.yaml                # PersistentVolumeClaim für SQLite-Datenbank
│   ├── configmap.yaml          # Environment-Konfiguration (BACKEND_URL, PORT, etc.)
│   ├── secret.example.yaml     # Template für Gemini API-Key
│   ├── backend-deployment.yaml # Backend Pod mit Liveness-, Readiness- & Startup-Probes
│   ├── backend-service.yaml    # Backend ClusterIP Service (Port 3001)
│   ├── frontend-deployment.yaml# Frontend Pods (2 Replikate, Nginx, RollingUpdate)
│   ├── frontend-service.yaml   # Frontend ClusterIP Service (Port 80)
│   ├── ingress.yaml            # Ingress mit Routing für / und /api
│   └── kustomization.yaml      # Bundle für `kubectl apply -k ./k8s`
│
├── Dockerfile.frontend         # Multi-Stage Build: Node Builder -> Nginx Alpine
├── Dockerfile.backend          # Multi-Stage Build: Node Builder -> Node 22 Alpine (Non-Root)
├── docker-compose.yml          # Lokales 2-Container-Setup (Frontend :3000 -> Backend :3001)
└── package.json                # Root Workspaces & Build-Skripte
```

---

## ☸️ Betrieb in Kubernetes (K8s)

Das Repository enthält produktionsreife Kubernetes-Manifeste im Verzeichnis [`k8s/`](file:///Users/tarwin/Code/quasselstrippe/k8s).

### 1. K8s-Architektur & Best Practices

| Merkmal | Backend (`quasselstrippe-backend`) | Frontend (`quasselstrippe-frontend`) |
|---|---|---|
| **Base Image** | `node:22-alpine` (Non-Root User `node`) | `nginx:alpine` |
| **Port** | `3001` | `80` |
| **Replikate** | `1` (Stateful via SQLite) | `2` (Stateless, horizontal skalierbar) |
| **Update-Strategie**| `Recreate` *(verhindert Multi-Mount-Locks auf RWO-PVC)* | `RollingUpdate` *(Zero-Downtime)* |
| **Storage** | PVC `quasselstrippe-data-pvc` gemountet auf `/data` | Keine persistenten Volumes nötig |
| **Liveness Probe** | `GET /healthz` (Port 3001) | `GET /healthz` (Port 80) |
| **Readiness Probe**| `GET /readyz` (Port 3001, prüft DB & Shutdown-Status) | `GET /healthz` (Port 80) |
| **Startup Probe**  | `GET /readyz` (Port 3001, 30s Puffer für DB-Init) | – |
| **Shutdown** | Graceful (`SIGTERM` -> 503 auf `/readyz` -> WAL Checkpoint -> DB Close) | Nginx Shutdown |

### 2. Container-Images bauen
```bash
# Backend Image bauen
npm run docker:build:backend
# oder: docker build -f Dockerfile.backend -t quasselstrippe-backend:latest .

# Frontend Image bauen
npm run docker:build:frontend
# oder: docker build -f Dockerfile.frontend -t quasselstrippe-frontend:latest .
```

### 3. In Kubernetes deployen
```bash
# 1. Geheimes Secret vorbereiten (optional für Gemini API-Key)
cp k8s/secret.example.yaml k8s/secret.yaml
# Füge deinen GEMINI_API_KEY in k8s/secret.yaml ein

# 2. Alle Ressourcen per Kustomize ausrollen:
kubectl apply -k ./k8s
```

### 4. Status und Probes überprüfen
```bash
# Pods überprüfen
kubectl get pods -n quasselstrippe

# Backend-Logs (inkl. Health- & Readiness-Probes) ansehen
kubectl logs -n quasselstrippe -l app=quasselstrippe-backend -f

# Lokales Port-Forwarding zum Testen
kubectl port-forward -n quasselstrippe svc/quasselstrippe-frontend 8080:80
# Jetzt erreichbar unter: http://localhost:8080
```

---

## 🩺 Health & Readiness Endpunkte

### Backend (`:3001`)

- **`GET /healthz` (oder `/health`, `/api/healthz`)**:
  - **Zweck:** K8s Liveness Probe.
  - **Verhalten:** Bestätigt, dass der Node.js-Prozess und die Event-Loop aktiv und reaktionsfähig sind.
  - **Antwort:** HTTP 200 mit Uptime, Timestamp und Speicherauslastung.

- **`GET /readyz` (oder `/ready`, `/api/readyz`)**:
  - **Zweck:** K8s Readiness Probe & Startup Probe.
  - **Verhalten:** Führt einen aktiven SQL-Ping (`SELECT 1;`) gegen die SQLite-Datenbank aus.
  - **Status 200:** Server ist bereit und nimmt Anfragen entgegen.
  - **Status 503:** Datenbank nicht erreichbar ODER Server befindet sich im Graceful Shutdown (`SIGTERM` empfangen), sodass K8s den Pod sofort aus den Service-Endpoints entfernt.

- **`GET /api/info`**:
  - Gibt Versionsinformationen, Node-Version und Umgebung (`production`/`development`) zurück.

### Frontend (`:80`)

- **`GET /healthz`**:
  - Liefert direkt HTTP 200 `healthy` von Nginx ohne Backend-Abhängigkeit.

### Graceful Shutdown (Signal Handling)
Wenn Kubernetes einen Pod beendet, sendet Kubelet `SIGTERM`. Das Backend:
1. Setzt intern `isShuttingDown = true` (wodurch `/readyz` sofort HTTP 503 liefert).
2. Schließt den HTTP-Listener für neue Verbindungen (`server.close()`).
3. Wartet auf aktive In-Flight-Requests.
4. Führt ein SQLite WAL-Checkpointing durch (`PRAGMA wal_checkpoint(TRUNCATE);`) und schließt die Datenbankdatei sauber.
5. Beendet den Prozess mit Code 0.

---

## 🚀 Lokaler Start mit Docker Compose

Docker Compose startet das vollständige 2-Container-Setup (Frontend + Backend) mit automatischer Abhängigkeitsprüfung über Healthchecks:

```bash
docker compose up -d --build
```
Die Anwendung ist sofort erreichbar unter:
👉 **http://localhost:3000**

- **Frontend:** Läuft auf Port 3000 (leitet `/api/` intern an das Backend weiter)
- **Backend:** Läuft auf Port 3001 mit persistenter SQLite-Datenbank unter `./data/quasselstrippe.db`

---

## 💻 Lokale Entwicklung (ohne Docker)

Voraussetzung: Node.js >= 22 (enthält die native `node:sqlite` Engine).

```bash
# Abhängigkeiten installieren
npm install

# Client & Server parallel im Dev-Modus starten
npm run dev
```
- **Backend:** `http://localhost:3001` (mit Auto-Reload via `tsx watch`)
- **Frontend:** `http://localhost:5173` (Vite Dev-Server mit HMR & Proxy nach `:3001`)

---

## 🗄️ REST API Übersicht

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/healthz`, `/api/healthz` | K8s Liveness Probe |
| `GET` | `/readyz`, `/api/readyz` | K8s Readiness Probe (prüft DB-Konnektivität) |
| `GET` | `/api/info` | Server- und Umgebungs-Info |
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

## 📄 Lizenz

Dieses Projekt ist als freie Software unter der **[GNU Affero General Public License v3 (AGPL-3.0)](LICENSE)** lizenziert.

