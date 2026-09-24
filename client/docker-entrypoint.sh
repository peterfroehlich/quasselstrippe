#!/bin/sh
set -e

# Default backend URL if not set
export BACKEND_URL="${BACKEND_URL:-http://quasselstrippe-backend:3001}"

echo "[Frontend Entrypoint] Configuring Nginx reverse proxy with BACKEND_URL=${BACKEND_URL}"

# Substitute only ${BACKEND_URL} so that Nginx variables ($host, $uri, etc.) remain intact
if command -v envsubst > /dev/null 2>&1; then
    envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
else
    sed "s|\${BACKEND_URL}|${BACKEND_URL}|g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi
