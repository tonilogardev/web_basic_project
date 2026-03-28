
# 1. Parar contenedores actuales si existen
echo "Stopping containers..."
docker-compose --env-file .env.development down --remove-orphans

# 2. Limpieza de temporales y basura de Docker
# -f para no pedir confirmación, --volumes para limpiar volúmenes anónimos
echo "Cleaning Docker artifacts..."
docker system prune -f
docker image prune -f

# 3. Construir las imágenes (asegurando que lean el .env de desarrollo)
echo "Building images..."
docker-compose --env-file .env.development build

# 4. Levantar la herramienta en segundo plano (detached)
echo "Launching services on localhost..."
docker-compose --env-file .env.development up -d

echo "Entorno listo. Accede a través de localhost."