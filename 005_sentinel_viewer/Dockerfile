FROM node:22-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

# --------- Fase 2: Producción Nginx ---------
FROM nginx:alpine

# Copiar el output de compilación
COPY --from=build /app/dist /usr/share/nginx/html

RUN echo $'server { \n\
    listen 80; \n\
    location / { \n\
        root /usr/share/nginx/html; \n\
        index index.html index.htm; \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
