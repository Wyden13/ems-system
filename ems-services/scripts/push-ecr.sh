#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Compile on the host so Docker does not need access to Maven Central.
region="${AWS_REGION:-us-east-2}"
platform="${EMS_IMAGE_PLATFORM:-linux/amd64}"
java_base_image="${EMS_JAVA_BASE_IMAGE:-docker.io/library/eclipse-temurin:17-jre-jammy}"
tag="${IMAGE_TAG:-$(date -u +%Y%m%dT%H%M%SZ)}"
account_id="$(aws sts get-caller-identity --query Account --output text)"
registry="${account_id}.dkr.ecr.${region}.amazonaws.com"

# Fail early if the builder cannot reach the base-image registry.
docker buildx imagetools inspect "$java_base_image" >/dev/null

./mvnw -B -Dmaven.test.skip=true clean package

# Check repositories before uploading any images. Create missing repositories separately.
for service in auth people workforce gateway; do
  aws ecr describe-repositories --region "$region" \
    --repository-names "ems/${service}-service" >/dev/null
done

aws ecr get-login-password --region "$region" |
  docker login --username AWS --password-stdin "$registry"

for service in auth people workforce gateway; do
  image_context=".local/images/${service}"
  mkdir -p "$image_context"
  cp "ems-${service}-service/target/ems-${service}-service-0.0.1-SNAPSHOT.jar" "$image_context/app.jar"
  cp docker/Dockerfile.runtime "$image_context/Dockerfile"
  image="${registry}/ems/${service}-service:${tag}"
  printf 'Building and pushing %s with Dockerfile.runtime (%s)\n' "$image" "$platform"
  docker buildx build --platform "$platform" \
    --build-arg "JAVA_BASE_IMAGE=$java_base_image" \
    --file "$image_context/Dockerfile" --tag "$image" --push "$image_context"
done
