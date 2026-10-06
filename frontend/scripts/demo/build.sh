#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
backend_dir="$(cd ../ems-services && pwd)"
(cd "$backend_dir" && ./mvnw -B -Dmaven.test.skip=true package)
for service in auth people workforce gateway; do
  image_dir=".demo.local/images/${service}"
  mkdir -p "$image_dir"
  cp "$backend_dir/ems-${service}-service/target/ems-${service}-service-0.0.1-SNAPSHOT.jar" "$image_dir/app.jar"
  cp "$backend_dir/docker/Dockerfile.runtime-cached" "$image_dir/Dockerfile"
  docker build -t "ems/${service}-service:retail-demo" "$image_dir"
done
