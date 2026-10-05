# Script de Sincronización a Producción (subir_imagenes.sh)

## Index

1. [Despliegue Rsync](#1-despliegue-rsync)
2. [Autenticación SSH](#2-autenticación-ssh)
3. [Next steps](#3-next-steps)

---

## 1 Despliegue Rsync

- ***Instrucción***: Ejecución del script bash para la transferencia e inyección de datos espaciales.
- ***Descripción***: Se sincronizan de manera diferencial los archivos `.pmtiles` y `.json` actualizados hacia el entorno de producción (VPS) mediante el protocolo `rsync`, excluyendo sistemáticamente los volúmenes de datos temporales (TIFF/JP2).
- ***File References***:
    - Editar el script de despliegue en [../scripts/subir_imagenes.sh](../scripts/subir_imagenes.sh)
    - Archivos de mapa de origen en [../visualizations/SCL_UNET_catalonia/](../visualizations/SCL_UNET_catalonia/)

[←Index](#index)

## 2 Autenticación SSH

- ***Instrucción***: Verificación de integridad y perfiles de acceso sobre la clave privada SSH.
- ***Descripción***: La rutina criptográfica emplea un par de claves asimétricas (RSA/ECDSA) para establecer sesiones autenticadas contra el entorno de producción sin dependencia de esquemas interactivos de contraseñas.
- ***File References***:
    - Clave privada SSH guardada en [../../002_ssh_key/ssh_vps_hetzner](../../002_ssh_key/ssh_vps_hetzner)

[←Index](#index)


