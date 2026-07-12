# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:alpine
# Copiar configuración personalizada para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copiar archivos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["sh", "-c", "echo 'Antonio Lopez desarrollo web' && nginx -g 'daemon off;'"]
