#!/bin/sh
set -eu

export BACKEND_URL="${BACKEND_URL:-http://quasselstrippe-backend:3001}"
export RUM_LOCATION=''
printf 'window.__QUASSELSTRIPPE_RUM__ = false;\n' > /usr/share/nginx/html/runtime-config.js

# Both settings are required. The endpoint is runtime-only, never browser config.
if [ "${RUM_ENABLED:-false}" = true ] && [ -n "${RUM_COLLECTOR_URL:-}" ]; then
    if ! printf '%s' "$RUM_COLLECTOR_URL" | grep -Eq '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?/?$'; then
        echo 'Invalid RUM_COLLECTOR_URL: expected an HTTP(S) origin' >&2
        exit 1
    fi
    RUM_COLLECTOR_URL=${RUM_COLLECTOR_URL%/}
    RUM_LOCATION=$(cat <<EOF
    location ~ ^/telemetry/v1/(traces|logs)$ {
        if (\$request_method != POST) { return 405; }
        limit_req zone=telemetry burst=20 nodelay;
        limit_req_status 429;
        client_max_body_size 512k;
        rewrite ^/telemetry(/v1/(traces|logs))\$ \$1 break;
        proxy_pass ${RUM_COLLECTOR_URL};
        proxy_set_header Authorization "";
        proxy_set_header Cookie "";
        proxy_set_header X-Forwarded-For "";
        proxy_set_header X-Real-IP "";
        proxy_set_header Origin "";
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
        access_log off;
    }
EOF
)
    export RUM_LOCATION
    printf 'window.__QUASSELSTRIPPE_RUM__ = true;\n' > /usr/share/nginx/html/runtime-config.js
fi

envsubst '${BACKEND_URL} ${RUM_LOCATION}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
