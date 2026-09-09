# Script de Sincronización a Producción (subir_imagenes.sh)

## Index

1. [Despliegue Rsync](#1-despliegue-rsync)
2. [Autenticación SSH](#2-autenticación-ssh)
3. [Next steps](#3-next-steps)

---

## 1 Despliegue Rsync

- ***Instrucción***: Ejecutar el script bash desde la terminal para subir los datos del mapa.
- ***Descripción***: Sincroniza eficientemente solo los archivos `.pmtiles` y `.json` nuevos o modificados al VPS de producción usando `rsync`, excluyendo todos los gigabytes de archivos temporales TIFF/JP2.
- ***File References***:
    - Editar el script de despliegue en [../scripts/subir_imagenes.sh](../scripts/subir_imagenes.sh)
    - Archivos de mapa de origen en [../visualizations/SCL_UNET_catalonia/](../visualizations/SCL_UNET_catalonia/)

[←Index](#index)

## 2 Autenticación SSH

- ***Instrucción***: Verificar que la clave privada SSH esté en su sitio y tenga los permisos correctos.
- ***Descripción***: El script utiliza una clave privada RSA/ECDSA para autenticarse de forma segura con el usuario root en el VPS remoto de Hetzner sin pedir contraseñas.
- ***File References***:
    - Clave privada SSH guardada en [../../002_ssh_key/ssh_vps_hetzner](../../002_ssh_key/ssh_vps_hetzner)

[←Index](#index)

## 3 Next steps

- [000_entrega_03_antonio_lopez_015.md](./000_entrega_03_antonio_lopez_015.md)
