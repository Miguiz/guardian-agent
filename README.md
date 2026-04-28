# Guardian DeFi Agent

Backend NestJS pour un **agent DeFi** orienté hackathon (ex. ETHGlobal Open Agent) : orchestration de swaps, **moteur de risque** multicritère (simulation on-chain, signaux sécurité / social / Telegram), puis relayage optionnel via **KeeperHub**. Aucune transaction n’est relayée sans verdict `PASS` du `RiskEngine`.

## Stack

- **NestJS** 11, TypeScript strict  
- **Viem** — simulation `eth_call` / `estimateGas` quand un RPC est configuré  
- **Uniswap Labs Trade API** — `POST /v1/quote` puis `POST /v1/swap` ([documentation](https://api-docs.uniswap.org/))  
- **Swagger** — UI OpenAPI sur `/docs`

## Prérequis

- Node.js 18+ (recommandé 20+)
- npm

## Installation et exécution

```bash
npm install
# optionnel : crée un fichier .env à la racine (voir tableau des variables)
npm run start:dev
```

- API : `http://localhost:3000` (ou la valeur de `PORT`)  
- **Swagger** : `http://localhost:3000/docs`  
- Schéma OpenAPI JSON : `http://localhost:3000/docs/json`

### Scripts

| Commande        | Description        |
|-----------------|--------------------|
| `npm run build` | Compilation Nest   |
| `npm run start:dev` | Serveur watch  |
| `npm run start:prod` | `node dist/main` |
| `npm test`      | Tests Jest         |
| `npm run test:cov` | Couverture    |

## Endpoints HTTP

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET`   | `/health` | Santé du service |
| `POST`  | `/v1/agent/swap` | Quote Uniswap → évaluation risque → relay KeeperHub si `PASS` |

Le corps de `/v1/agent/swap` est validé par `class-validator` ; voir les exemples dans Swagger.

## Variables d’environnement

| Variable | Rôle |
|----------|------|
| `PORT` | Port HTTP (défaut `3000`) |
| `RISK_MIN_AGGREGATE_SCORE` | Seuil agrégé du risk engine (défaut `60`) |
| `RPC_URL_ETHEREUM` | RPC pour `chainId` 1 (simulation viem + contrôle bytecode tokens) |
| `RPC_URL_BASE` | RPC pour `8453` |
| `RPC_URL_ARBITRUM` | RPC pour `42161` |
| `RPC_URL_POLYGON` | RPC pour `137` |
| `SIMULATION_FROM_ADDRESS` | Adresse `from` pour les `eth_call` de simulation + défaut `swapper` Uniswap |
| `UNISWAP_API_KEY` | Clé Uniswap Labs (header `x-api-key` vers le Trade API) |
| `UNISWAP_API_BASE_URL` | Base URL (défaut `https://trade-api.gateway.uniswap.org`) |
| `UNISWAP_SWAPPER_ADDRESS` | Wallet `swapper` par défaut si absent du JSON |
| `UNISWAP_ALLOW_STUB_FALLBACK` | `true` / `1` / `yes` — autorise un stub de quote **non réaliste** sans clé (démo uniquement) |
| `KEEPERHUB_RELAY_ENDPOINT` | URL `POST` pour relay réel ; absent = hash stub en logs |
| `TELEGRAM_BOT_TOKEN` | Bot Telegram pour ingérer les `channel_post` |
| `TELEGRAM_POLL_INTERVAL_MS` | Intervalle de poll `getUpdates` (ms) ; `0` = pas de poll |
| `TELEGRAM_ALERT_CHAT_IDS` | IDs de canaux autorisés, séparés par des virgules |
| `TELEGRAM_RISK_ADDRESSES` | Liste statique d’adresses signalées (comma-separated) |

## Architecture (`src/`)

- **`agent`** — Orchestration : quote adapter → `RiskEngine` → `ExecutionHub`  
- **`risk-engine`** — `SimulationService` (viem), evaluateurs (sécurité, social, Telegram), agrégation des scores  
- **`protocol-adapters`** — Uniswap (`UniswapRoutingService` + registry)  
- **`execution-hub`** — Garde pré-relay + client KeeperHub  
- **`config`** / **`common`** — Configuration typée, utilitaires (`viem-chain`, erreurs)

Flux simplifié :

```mermaid
flowchart LR
  Client --> AgentController
  AgentController --> AgentService
  AgentService --> UniswapRouting
  AgentService --> RiskEngine
  AgentService --> ExecutionHub
  ExecutionHub --> RiskEngine
  ExecutionHub --> KeeperHub
```

## Uniswap — erreurs fréquentes

- **`No quotes available` (404)** : montant trop faible, paire non routée, ou paramètres incompatibles. Le backend renvoie désormais une **422** avec un message explicite plutôt qu’un 502 générique.  
- **Clé API** : obligatoire pour des quotes réelles, sauf mode `UNISWAP_ALLOW_STUB_FALLBACK` (déconseillé hors démo).  
- **`swapper`** : champ optionnel dans le body, sinon `UNISWAP_SWAPPER_ADDRESS`, sinon `SIMULATION_FROM_ADDRESS`.

## Tests

```bash
npm test
```

Les tests couvrent notamment le refus d’exécution lorsque le risque bloque et les cas de blocklist Telegram statique.

## Licence

Projet privé / hackathon — précise la licence si tu publies le dépôt.
