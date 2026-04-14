# Cassini Hackathons Architecture

## Index

1. [Setup and Initialization](#1-setup-and-initialization)
2. [Core Container](#2-core-container)
3. [Map Engine](#3-map-engine)
4. [Routing and Deployment](#4-routing-and-deployment)
5. [Next steps](#5-next-steps)

---

## 1 Setup and Initialization

- ***Instruction***: Scaffold pure Vite + Svelte (TypeScript).
- ***File References***:
    - Root directory: [006_cassini_hackathons/](../006_cassini_hackathons/)
    - App config: [vite.config.ts](../006_cassini_hackathons/vite.config.ts)

[←Index](#index)

## 2 Core Container

- ***Instruction***: Multi-stage Docker build to wrap static files in Nginx Alpine.
- ***File References***:
    - Edit [Dockerfile](../006_cassini_hackathons/Dockerfile)
    - Compile `npm run build` directly to Nginx root.

[←Index](#index)

## 3 Map Engine

- ***Instruction***: Render WebGL canvas via MapLibre GL JS focused on Catalonia.
- ***File References***:
    - Edit [App.svelte](../006_cassini_hackathons/src/App.svelte)
    - Map style: Standalone Object using `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
    - CSS styles: [app.css](../006_cassini_hackathons/src/app.css)

[←Index](#index)

## 4 Routing and Deployment

- ***Instruction***: Link container dynamically to Traefik Reverse Proxy enforcing localized `.localhost` bindings or Secure Production domains.
- ***File References***:
    - Route definition: [docker-compose.yml](../docker-compose.yml)
    - Env development: [.env.development](../.env.development)
    - CI/CD Action: [production-deploy.yml](../.github/workflows/production-deploy.yml)

[←Index](#index)

## 5 Next steps

- Explore [000_tips](./000_tips.md)

