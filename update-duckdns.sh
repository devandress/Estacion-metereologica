#!/bin/sh

# Duck DNS Auto-update
# Token y dominio deben venir de variables de entorno (.env)
if [ -z "$DUCKDNS_TOKEN" ] || [ -z "$DUCKDNS_DOMAIN" ]; then
    echo "ERROR: DUCKDNS_TOKEN y DUCKDNS_DOMAIN son requeridos"
    exit 1
fi

LOG_FILE="/tmp/duckdns.log"

echo "[$(date)] Duck DNS Update Service iniciado para ${DUCKDNS_DOMAIN}.duckdns.org" >> $LOG_FILE

while true; do
    CURRENT_IP=$(wget -qO- https://api.ipify.org)
    RESPONSE=$(wget -qO- "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=${CURRENT_IP}")
    echo "[$(date)] IP: ${CURRENT_IP} | Response: ${RESPONSE}" >> $LOG_FILE
    sleep 300
done
