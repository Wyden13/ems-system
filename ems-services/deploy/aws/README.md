# AWS development deployment

This deployment uses account `353747665772`, region `us-east-2`, the existing
`ems-dev-cluster` Fargate cluster, and the private `ems-db` PostgreSQL instance.
The supported applications are Auth, People, Workforce, and Gateway.
Notification scaffolding is excluded from the supported Maven reactor.

API: https://d2z6z22jatofwt.cloudfront.net

Initial deployment on October 5, 2026 used image tag `20261005-deploy`,
CloudFront distribution `E3D7SYMSKNAHGU`, and load balancer `ems-dev-api`.
The full Maven build passed 183 tests. The RDS backup snapshot is
`ems-before-services-20261005`.

HTTPS smoke checks returned `200` with `{"status":"UP"}` for readiness,
`401` for an unauthenticated employee request, and `400` for an empty login
request after obtaining and submitting a valid CSRF token and cookie.

Each service runs as an ECS service with one x86-64 Fargate task (1 vCPU,
3 GiB memory). ECS Service Connect provides HTTP and mutually authenticated
gRPC connections. Only Gateway is connected to the load balancer. CloudFront
provides an AWS default HTTPS domain; API caching is disabled, and cookies,
authorization headers, and query strings are forwarded. The load balancer accepts
connections only from CloudFront's origin-facing prefix list.

Application passwords and TLS identities are stored in Secrets Manager. ECS
references the correct keys in existing JSON secrets. The RDS administrator
credential is used only by the one-off provisioning task; service tasks use
dedicated database roles. Provisioning synchronizes those roles with the configured
service secrets, preserves databases, and transfers administrator-owned tables
only inside each service's dedicated database. Take an RDS snapshot before reruns.
Internal TLS certificates require renewal after one year. The CA private key stays
in the ignored `.local/aws-deploy/certs` directory and is never uploaded.

Set `ALLOWED_ORIGINS` on each service's `app` container to the browser's HTTPS
origin (`https://d2z6z22jatofwt.cloudfront.net`, without a trailing slash).
The deployment script supplies this value; override it with `FRONTEND_ORIGIN`
when changing the website address. Setting it only on Gateway is insufficient:
Auth and the other backends also validate browser origins. A missing Auth setting
causes the frontend's session restore to fail with `403 Invalid CORS request`.

## Deploy an update

Use a current AWS CLI with ECS Service Connect support, Java 17 or newer,
and Docker. The preinstalled AWS CLI 2.0.30 lacks the required APIs. This run
used an isolated CLI at `/tmp/ems-aws-tools/bin/aws`; that directory is temporary.

1. Run `./mvnw -B test package` with access to Docker for integration tests.
2. Set a new, unique `IMAGE_TAG` and run `scripts/push-ecr.sh`. ECR tags are immutable.
3. Build the provisioning utility:

   ```sh
   mkdir -p .local/aws-provision-image
   javac --release 17 -d .local/aws-provision-image deploy/aws/Provision.java
   cp ~/.m2/repository/org/postgresql/postgresql/42.7.13/postgresql-42.7.13.jar .local/aws-provision-image/driver.jar
   docker buildx build --platform linux/amd64 --file deploy/aws/Dockerfile.provision \
     --tag "353747665772.dkr.ecr.us-east-2.amazonaws.com/ems/auth-service:provision-${IMAGE_TAG}-v2" \
     --push .local/aws-provision-image
   ```

4. Run `python3 deploy/aws/deploy.py`, then `python3 deploy/aws/edge.py`.
5. Wait for all four ECS services to stabilize and the CloudFront distribution
   to finish deploying. Verify `/actuator/health/readiness` over HTTPS and check
   load balancer target health. Review CloudWatch logs in `/ecs/ems-*` on failure.

Task definitions, endpoint metadata, and distribution configuration are saved
under `.local/aws-deploy`. They contain secret references, not secret values.
The `push-oci.py` fallback uploads an OCI archive through ECR APIs when Docker
registry connections time out; it needs botocore or the current AWS CLI's bundled
botocore. Export archives with `--provenance=false` for a single platform manifest.

AWS resources remain running and incur normal account charges. This is a
development deployment with one task per service; it does not provide service
redundancy. The frontend is a separate deployment.

## First administrator

Run `python3 deploy/aws/bootstrap-admin.py admin@ems.ca` with the current AWS CLI
on `PATH`. It runs the existing Auth bootstrap profile in a one-off private ECS
task, using a generated password supplied through Secrets Manager. The profile
does not overwrite an existing account or add another admin when an active admin
already exists.

The script verifies login and the ADMIN role through HTTPS, logs out the test
session, stops the bootstrap task, and deregisters its task definition. Successful
credentials are stored in the ignored `.local/aws-admin-credentials.txt` file
with permissions `0600`. Change the temporary password from the application's
profile after signing in. The bootstrap secret is `ems/dev/bootstrap/initial-admin`.
