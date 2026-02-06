#!/bin/bash

# Duck DNS Auto-update
TOKEN="a64240d0-87b0-4173-a0ca-26b2117c7061"
DOMAIN="weathermx"
LOG_FILE="/tmp/duckdns.log"

echo "[$(date)] Duck DNS Update Service iniciado" >> $LOG_FILE

while true; do
    # Obtener IP actual
    CURRENT_IP=$(curl -s https://api.ipify.org)
    
    # Actualizar en Duck DNS
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$CURRENT_IP")
    
    # Log
    echo "[$(date)] IP: $CURRENT_IP | Response: $RESPONSE" >> $LOG_FILE
    
    # Esperar 5 minutos
    sleep 300
done
