# Fase 1: Entorno de compilación Node Ultra-veloz
FROM node:22-alpine AS builder

WORKDIR /app

# Bloqueo de memoria caché Docker
COPY package*.json ./
RUN npm ci

COPY . .
# Transpilación de Vanilla TS y Empaquetado de Asssets Vite
RUN npm run build

# Fase 2: Ejecución Asíncrona Pura
FROM nginx:alpine

# Limpiar Nginx default UI
RUN rm -rf /usr/share/nginx/html/*

# Traspasar el compilado (Menos es Más: El nodo backend muere aquí)
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA Routing: En caso de refresco en sub-rutas, Nginx debe apuntar a index.html
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
