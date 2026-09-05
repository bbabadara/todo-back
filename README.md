# todo-back

Backend de l'application Todo (TP infra DevOps). API Express (CRUD) + stockage Supabase, métriques Prometheus (`/metrics`), traces OpenTelemetry (OTLP gRPC -> OTel Collector -> Tempo).

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `PORT` | Port d'écoute (défaut `3000`) |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon/publishable Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service `sb_secret_*` (optionnelle : sinon la clé anon est utilisée + RLS) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP gRPC (défaut `http://otel-collector:4317`) |
| `OTEL_SERVICE_NAME` | Nom du service (défaut `todo-back`) |
| `OTEL_RESOURCE_ATTRIBUTES` | Attributs, ex. `deployment.environment=development` |

Sans configuration Supabase valide, un store en mémoire est utilisé (`backend=memory`).

## Image Docker

- `ghcr.io/bbabadara/todo-back:latest` (dev/prod)
- Déployée sur le serveur par Ansible (`/opt/todo/app/docker-compose.yml`) puis les workflows GitHub Actions.