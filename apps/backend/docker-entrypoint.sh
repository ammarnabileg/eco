#!/bin/sh
set -e

# Run migrations from the server instance only, so a scaled-out set of workers
# does not race on schema changes.
if [ "${MEDUSA_WORKER_MODE:-shared}" != "worker" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx medusa db:migrate
fi

exec npx medusa start
