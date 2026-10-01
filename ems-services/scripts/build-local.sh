#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
./mvnw -B -Dmaven.test.skip=true package
for service in auth people workforce gateway; do
  image_context=".local/images/${service}"
  mkdir -p "$image_context"
  cp "ems-${service}-service/target/ems-${service}-service-0.0.1-SNAPSHOT.jar" "$image_context/app.jar"
  if [[ -n "${EMS_RUNTIME_IMAGE:-}" ]]; then
    cp docker/Dockerfile.runtime-cached "$image_context/Dockerfile"
    docker build --build-arg "RUNTIME_IMAGE=$EMS_RUNTIME_IMAGE" -t "ems/${service}-service:local" "$image_context"
  else
    cp docker/Dockerfile.runtime "$image_context/Dockerfile"
    docker build -t "ems/${service}-service:local" "$image_context"
  fi
done
