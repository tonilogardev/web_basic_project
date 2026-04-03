# basic_server
basic_server
## Index

1.  [Requirements](#1-requirements)
2.  [Goals](#2-goals)
3.  [Tech Stack](#3-tech-stack)

---

## 1 Requirements

-   **OS**: Linux (Tested on Linux Mint 22 / Ubuntu 24.04).
-   **Docker**: v24.0+ (Engine) & Docker Compose v2.0+.
-   **Node.js**: v20.0+ (LTS) & npm v10.0+.
-   **Git**: v2.0+.

[←Index](#index)

## 2 Goals

-   Use only [docker-compose.yml](./docker-compose.yml).
-   Configure behavior via [.env.development](./.env.development) and [.env.production](./.env.production).
-   Parameterize all variables.
-   Adhere to "Less is more".
-   Maintain only `main` and `main_dev_pro` branches.
-   Follow step-by-step documentation in `001_documentation/`.

[←Index](#index)

## 3 Tech Stack

-   **App**: Node.js (Express) & Vite (React/Vue).
-   **Containerization**: Docker & Docker Compose.
-   **Routing & SSL**: Traefik (Auto HTTPS).
-   **CI/CD**: Jenkins (Pipeline as Code).
-   **Infrastructure**: Terraform (Hetzner Cloud).

[←Index](#index)

## Next Steps

-   **Skills**: Proceed to [001_Hetzner_login_domain_tokens.md](./001_documentation/001_Hetzner_login_domain_tokens.md)


