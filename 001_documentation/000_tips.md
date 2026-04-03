Dejar puertos despejados:
CONTAINER ID   IMAGE                                          COMMAND                  CREATED       STATUS       PORTS      NAMES
c1802b6f49f3   web_project_base_antigravity_agents_frontend   "docker-entrypoint.s…"   3 hours ago   Up 3 hours   5173/tcp   my-app-dev-frontend

docker stop c1802b6f49f3
docker rm c1802b6f49f3

-----------------------------
ver logs en consola:
docker compose logs -f
docker compose logs -f backend
