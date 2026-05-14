# Requirements Document

## Introduction

This document specifies the requirements for implementing Kubernetes infrastructure with auto-scaling and monitoring capabilities for the Heavenly microservices project. The system will enable local Kubernetes deployment using Minikube, provide horizontal auto-scaling for stateless services, implement comprehensive monitoring and observability through Prometheus and Grafana, centralize logs using Loki and Promtail, and expose services through NGINX Ingress. This implementation serves as a learning platform for Kubernetes concepts while providing production-ready patterns that can later be migrated to cloud platforms like GKE.

## Glossary

- **K8s_Cluster**: The Kubernetes cluster running on Minikube for local development
- **HPA**: Horizontal Pod Autoscaler that automatically scales pods based on resource metrics
- **Stateless_Service**: Backend microservices (auth, listing, review, booking, media, search, admin) and edge services (gateway, bff) that can be scaled horizontally
- **Stateful_Service**: Infrastructure services (MongoDB, Redis, RabbitMQ) that require persistent storage and stable network identities
- **Prometheus**: Metrics collection and storage system for monitoring resource usage
- **Grafana**: Visualization platform for displaying metrics dashboards
- **Loki**: Log aggregation system for centralized log storage
- **Promtail**: Log collection agent that ships logs to Loki
- **Ingress_Controller**: NGINX Ingress controller that routes external traffic to services
- **ConfigMap**: Kubernetes resource for storing non-sensitive configuration data
- **Secret**: Kubernetes resource for storing sensitive data like credentials and API keys
- **PersistentVolume**: Storage resource for stateful services that persists beyond pod lifecycle
- **Deployment**: Kubernetes resource for managing stateless application replicas
- **StatefulSet**: Kubernetes resource for managing stateful applications with stable identities
- **Service**: Kubernetes resource that provides stable networking for pods
- **Resource_Request**: Minimum CPU and memory guaranteed to a container
- **Resource_Limit**: Maximum CPU and memory a container can consume
- **Liveness_Probe**: Health check that restarts unhealthy containers
- **Readiness_Probe**: Health check that determines if a pod can receive traffic
- **Helm**: Package manager for Kubernetes used to install monitoring stack
- **Namespace**: Kubernetes logical isolation boundary for resources

## Requirements

### Requirement 1: Local Kubernetes Cluster Setup

**User Story:** As a developer, I want to deploy the Heavenly microservices on a local Kubernetes cluster using Minikube, so that I can learn Kubernetes concepts in a safe local environment before moving to cloud platforms.

#### Acceptance Criteria

1. THE K8s_Cluster SHALL run on Minikube with 6 CPUs and 10GB RAM allocated (to accommodate both application services and the monitoring stack)
2. THE K8s_Cluster SHALL have the NGINX Ingress addon enabled
3. THE K8s_Cluster SHALL have metrics-server enabled for HPA functionality
4. THE K8s_Cluster SHALL use a dedicated namespace called "heavenly" for all application resources
5. WHEN the cluster is started, THE K8s_Cluster SHALL be accessible via kubectl commands
6. THE K8s_Cluster SHALL support local Docker image loading without requiring external registry

### Requirement 2: Stateless Service Deployment

**User Story:** As a developer, I want to deploy all stateless microservices as Kubernetes Deployments, so that they can be scaled horizontally and managed declaratively.

#### Acceptance Criteria

1. FOR ALL Stateless_Service instances, THE Deployment SHALL specify container image, port, and environment variables
2. FOR ALL Stateless_Service instances, THE Deployment SHALL define Resource_Request matching docker-compose.prod.yml specifications
3. FOR ALL Stateless_Service instances, THE Deployment SHALL define Resource_Limit matching docker-compose.prod.yml specifications
4. FOR ALL Stateless_Service instances, THE Deployment SHALL configure Liveness_Probe using the existing /health endpoint
5. FOR ALL Stateless_Service instances, THE Deployment SHALL configure Readiness_Probe using the existing /health endpoint
6. FOR ALL Stateless_Service instances, THE Deployment SHALL start with 1 replica as the initial count
7. THE Deployment SHALL include labels for service identification and monitoring integration
8. WHEN a Stateless_Service pod fails health checks, THE K8s_Cluster SHALL automatically restart the pod

### Requirement 3: Stateful Service Deployment

**User Story:** As a developer, I want to deploy MongoDB, Redis, and RabbitMQ as StatefulSets with persistent storage, so that data persists across pod restarts and services maintain stable network identities.

#### Acceptance Criteria

1. FOR ALL Stateful_Service instances, THE StatefulSet SHALL provide stable pod identities with predictable names
2. FOR ALL Stateful_Service instances, THE StatefulSet SHALL attach PersistentVolume claims for data persistence
3. THE MongoDB StatefulSet SHALL use a PersistentVolume with at least 10Gi storage capacity
4. THE Redis StatefulSet SHALL use a PersistentVolume with at least 1Gi storage capacity
5. THE RabbitMQ StatefulSet SHALL use a PersistentVolume with at least 5Gi storage capacity
6. FOR ALL Stateful_Service instances, THE StatefulSet SHALL configure appropriate health checks
7. FOR ALL Stateful_Service instances, THE Service SHALL use ClusterIP type for internal cluster communication
8. WHEN a Stateful_Service pod restarts, THE K8s_Cluster SHALL reattach the same PersistentVolume to preserve data

### Requirement 4: Horizontal Pod Autoscaling

**User Story:** As a developer, I want stateless services to automatically scale based on CPU usage, so that the system can handle variable traffic loads efficiently.

#### Acceptance Criteria

1. FOR ALL Stateless_Service instances, THE HPA SHALL monitor CPU utilization metrics
2. FOR ALL Stateless_Service instances, THE HPA SHALL trigger scale-up when average CPU usage exceeds 70%
3. FOR ALL Stateless_Service instances, THE HPA SHALL trigger scale-down when average CPU usage falls below 70%
4. THE HPA SHALL define minimum replica count of 1 for all Stateless_Service instances
5. THE HPA SHALL define maximum replica count of 5 for backend services (auth, listing, review, booking, media, search, admin)
6. THE HPA SHALL define maximum replica count of 3 for edge services (gateway, bff)
7. THE HPA SHALL wait 30 seconds stabilization period before scaling up
8. THE HPA SHALL wait 60 seconds stabilization period before scaling down
9. WHEN CPU metrics are unavailable, THE HPA SHALL maintain current replica count without scaling

### Requirement 5: Configuration Management

**User Story:** As a developer, I want to externalize configuration using ConfigMaps and Secrets, so that I can manage environment-specific settings without rebuilding container images.

#### Acceptance Criteria

1. THE ConfigMap SHALL store non-sensitive configuration including service URLs, port numbers, and feature flags
2. THE Secret SHALL store sensitive data including JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET, CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET, RABBITMQ_USER, RABBITMQ_PASS, RAZORPAY_KEY_ID, and RAZORPAY_KEY_SECRET
3. FOR ALL Secret values, THE Secret SHALL encode data in base64 format
4. THE Deployment SHALL inject ConfigMap values as environment variables into containers
5. THE Deployment SHALL inject Secret values as environment variables into containers
6. WHEN a ConfigMap is updated, THE K8s_Cluster SHALL allow rolling restart of affected pods
7. WHEN a Secret is updated, THE K8s_Cluster SHALL allow rolling restart of affected pods
8. THE ConfigMap SHALL be created before any Deployment that references it
9. THE Secret SHALL be created before any Deployment that references it

### Requirement 6: Service Discovery and Networking

**User Story:** As a developer, I want services to discover and communicate with each other using stable DNS names, so that inter-service communication works reliably.

#### Acceptance Criteria

1. FOR ALL Stateless_Service instances, THE Service SHALL expose pods using ClusterIP type for internal communication
2. FOR ALL Stateless_Service instances, THE Service SHALL use DNS name format {service-name}.heavenly.svc.cluster.local
3. THE Service SHALL route traffic to healthy pods based on Readiness_Probe status
4. THE Service SHALL use label selectors to identify target pods
5. THE Service SHALL define target port matching the container port
6. WHEN a pod becomes unhealthy, THE Service SHALL stop routing traffic to that pod
7. WHEN a new pod becomes ready, THE Service SHALL automatically include it in the routing pool

### Requirement 7: External Access via Ingress

**User Story:** As a developer, I want to access the BFF service from my browser using a friendly hostname, so that I can test the application locally without using port-forward commands.

#### Acceptance Criteria

1. THE Ingress_Controller SHALL route requests for heavenly.local to the BFF service
2. THE Ingress_Controller SHALL use NGINX as the ingress implementation
3. THE Ingress_Controller SHALL route HTTP traffic on port 80
4. THE Ingress_Controller SHALL include path-based routing rules for the BFF service
5. WHEN a request arrives at heavenly.local, THE Ingress_Controller SHALL forward it to the BFF service on port 8080
6. THE Ingress_Controller SHALL support adding /etc/hosts entry for heavenly.local pointing to Minikube IP
7. THE Ingress_Controller SHALL handle connection timeouts and retries for backend services

### Requirement 8: Metrics Collection and Storage

**User Story:** As a developer, I want to collect CPU, memory, and custom application metrics from all services, so that I can monitor resource usage and application performance.

#### Acceptance Criteria

1. THE Prometheus SHALL scrape metrics from all pods in the heavenly namespace
2. THE Prometheus SHALL collect CPU usage metrics for all containers
3. THE Prometheus SHALL collect memory usage metrics for all containers
4. THE Prometheus SHALL collect pod restart count metrics
5. THE Prometheus SHALL collect HTTP request metrics from services that expose them
6. THE Prometheus SHALL store metrics with 15-day retention period
7. THE Prometheus SHALL scrape metrics every 15 seconds
8. THE Prometheus SHALL be installed using Helm chart (kube-prometheus-stack)
9. WHEN a pod exposes a /metrics endpoint, THE Prometheus SHALL automatically discover and scrape it
10. THE Prometheus SHALL be accessible within the cluster for Grafana queries

### Requirement 9: Metrics Visualization

**User Story:** As a developer, I want to visualize metrics in Grafana dashboards, so that I can understand resource usage patterns and identify performance issues.

#### Acceptance Criteria

1. THE Grafana SHALL provide a web UI accessible via port-forward or Ingress
2. THE Grafana SHALL connect to Prometheus as a data source
3. THE Grafana SHALL include a dashboard showing CPU usage per service
4. THE Grafana SHALL include a dashboard showing memory usage per service
5. THE Grafana SHALL include a dashboard showing pod count and HPA status per service
6. THE Grafana SHALL include a dashboard showing HTTP request rates and latencies where available
7. THE Grafana SHALL include a dashboard showing RabbitMQ queue depths and message rates
8. THE Grafana SHALL allow custom dashboard creation and modification
9. THE Grafana SHALL be installed as part of the kube-prometheus-stack Helm chart
10. THE Grafana SHALL persist dashboard configurations across restarts

### Requirement 10: Log Aggregation

**User Story:** As a developer, I want to collect logs from all services in a centralized location, so that I can troubleshoot issues without accessing individual pods.

#### Acceptance Criteria

1. THE Loki SHALL receive and store logs from all pods in the heavenly namespace
2. THE Promtail SHALL run as a DaemonSet on all cluster nodes
3. THE Promtail SHALL collect stdout and stderr logs from all containers
4. THE Promtail SHALL add metadata labels including pod name, namespace, container name, and service name
5. THE Promtail SHALL ship logs to Loki in real-time
6. THE Loki SHALL store logs with 7-day retention period
7. THE Loki SHALL be installed using Helm chart (loki-stack)
8. THE Loki SHALL compress logs to optimize storage usage
9. WHEN a pod writes to stdout or stderr, THE Promtail SHALL capture and forward the log entry to Loki
10. THE Loki SHALL be queryable from Grafana using LogQL query language

### Requirement 11: Log Visualization and Querying

**User Story:** As a developer, I want to query and view logs in Grafana, so that I can search for specific log entries and correlate logs with metrics.

#### Acceptance Criteria

1. THE Grafana SHALL connect to Loki as a data source
2. THE Grafana SHALL provide a log exploration interface for querying logs
3. THE Grafana SHALL support filtering logs by service name, pod name, and log level
4. THE Grafana SHALL support full-text search across log messages
5. THE Grafana SHALL display log timestamps in local timezone
6. THE Grafana SHALL support tailing live logs from running pods
7. THE Grafana SHALL allow correlating logs with metrics in unified dashboards
8. WHEN a user queries logs for a specific service, THE Grafana SHALL return matching log entries with metadata

### Requirement 12: Resource Requests and Limits

**User Story:** As a developer, I want to define resource requests and limits for all containers, so that the cluster can schedule pods efficiently and prevent resource starvation.

#### Acceptance Criteria

1. THE auth-service Deployment SHALL request 128Mi memory and 0.1 CPU cores
2. THE auth-service Deployment SHALL limit 256Mi memory and 0.25 CPU cores
3. THE listing-service Deployment SHALL request 128Mi memory and 0.1 CPU cores
4. THE listing-service Deployment SHALL limit 256Mi memory and 0.25 CPU cores
5. THE review-service Deployment SHALL request 128Mi memory and 0.1 CPU cores
6. THE review-service Deployment SHALL limit 256Mi memory and 0.25 CPU cores
7. THE booking-service Deployment SHALL request 128Mi memory and 0.1 CPU cores
8. THE booking-service Deployment SHALL limit 256Mi memory and 0.25 CPU cores
9. THE media-service Deployment SHALL request 64Mi memory and 0.05 CPU cores
10. THE media-service Deployment SHALL limit 128Mi memory and 0.15 CPU cores
11. THE search-service Deployment SHALL request 128Mi memory and 0.1 CPU cores
12. THE search-service Deployment SHALL limit 256Mi memory and 0.25 CPU cores
13. THE admin-service Deployment SHALL request 64Mi memory and 0.05 CPU cores
14. THE admin-service Deployment SHALL limit 128Mi memory and 0.15 CPU cores
15. THE gateway Deployment SHALL request 128Mi memory and 0.1 CPU cores
16. THE gateway Deployment SHALL limit 256Mi memory and 0.25 CPU cores
17. THE bff Deployment SHALL request 128Mi memory and 0.1 CPU cores
18. THE bff Deployment SHALL limit 256Mi memory and 0.25 CPU cores
19. THE MongoDB StatefulSet SHALL request 256Mi memory and 0.25 CPU cores
20. THE MongoDB StatefulSet SHALL limit 512Mi memory and 0.5 CPU cores
21. THE Redis StatefulSet SHALL request 64Mi memory and 0.1 CPU cores
22. THE Redis StatefulSet SHALL limit 128Mi memory and 0.25 CPU cores
23. THE RabbitMQ StatefulSet SHALL request 128Mi memory and 0.1 CPU cores
24. THE RabbitMQ StatefulSet SHALL limit 256Mi memory and 0.25 CPU cores

### Requirement 13: Health Check Configuration

**User Story:** As a developer, I want to configure liveness and readiness probes for all services, so that Kubernetes can automatically detect and recover from failures.

#### Acceptance Criteria

1. FOR ALL Stateless_Service instances, THE Liveness_Probe SHALL use HTTP GET request to /health endpoint
2. FOR ALL Stateless_Service instances, THE Liveness_Probe SHALL have initial delay of 30 seconds
3. FOR ALL Stateless_Service instances, THE Liveness_Probe SHALL have period of 10 seconds
4. FOR ALL Stateless_Service instances, THE Liveness_Probe SHALL have timeout of 5 seconds
5. FOR ALL Stateless_Service instances, THE Liveness_Probe SHALL have failure threshold of 3
6. FOR ALL Stateless_Service instances, THE Readiness_Probe SHALL use HTTP GET request to /health endpoint
7. FOR ALL Stateless_Service instances, THE Readiness_Probe SHALL have initial delay of 10 seconds
8. FOR ALL Stateless_Service instances, THE Readiness_Probe SHALL have period of 5 seconds
9. FOR ALL Stateless_Service instances, THE Readiness_Probe SHALL have timeout of 3 seconds
10. FOR ALL Stateless_Service instances, THE Readiness_Probe SHALL have failure threshold of 2
11. FOR ALL Stateful_Service instances, THE Liveness_Probe SHALL use appropriate protocol-specific health checks
12. WHEN a Liveness_Probe fails threshold times, THE K8s_Cluster SHALL restart the container
13. WHEN a Readiness_Probe fails, THE Service SHALL stop routing traffic to the pod until it passes

### Requirement 14: Deployment Strategy

**User Story:** As a developer, I want to perform rolling updates with zero downtime, so that I can deploy new versions without service interruption.

#### Acceptance Criteria

1. FOR ALL Stateless_Service Deployments, THE Deployment SHALL use RollingUpdate strategy
2. FOR ALL Stateless_Service Deployments, THE Deployment SHALL set maxUnavailable to 0
3. FOR ALL Stateless_Service Deployments, THE Deployment SHALL set maxSurge to 1
4. WHEN a Deployment is updated, THE K8s_Cluster SHALL create new pods before terminating old ones
5. WHEN a Deployment is updated, THE K8s_Cluster SHALL wait for new pods to pass Readiness_Probe before terminating old pods
6. THE Deployment SHALL allow rollback to previous version using kubectl rollout undo
7. THE Deployment SHALL maintain revision history for the last 5 revisions

### Requirement 15: Monitoring Stack Installation

**User Story:** As a developer, I want to install Prometheus, Grafana, and Loki using Helm charts, so that I can set up the monitoring stack quickly with best-practice configurations.

#### Acceptance Criteria

1. THE Prometheus SHALL be installed using the kube-prometheus-stack Helm chart
2. THE Loki SHALL be installed using the loki-stack Helm chart
3. THE Helm installation SHALL create a separate namespace called "monitoring" for monitoring components
4. THE Helm installation SHALL configure Prometheus to scrape the heavenly namespace
5. THE Helm installation SHALL configure Promtail to collect logs from the heavenly namespace
6. THE Helm installation SHALL configure Grafana with Prometheus and Loki data sources pre-configured
7. THE Helm installation SHALL persist Prometheus data using PersistentVolume
8. THE Helm installation SHALL persist Grafana data using PersistentVolume
9. THE Helm installation SHALL expose Grafana UI via port-forward or Ingress
10. WHEN Helm charts are installed, THE K8s_Cluster SHALL have all monitoring components running and healthy

### Requirement 16: Environment Variable Injection

**User Story:** As a developer, I want to inject environment variables from ConfigMaps and Secrets into service containers, so that services can access configuration at runtime.

#### Acceptance Criteria

1. THE Deployment SHALL inject MONGO_URL from ConfigMap for services requiring MongoDB
2. THE Deployment SHALL inject REDIS_URL from ConfigMap for services requiring Redis
3. THE Deployment SHALL inject RABBITMQ_URL from ConfigMap for services requiring RabbitMQ
4. THE Deployment SHALL inject service URLs from ConfigMap for inter-service communication
5. THE Deployment SHALL inject JWT_SECRET from Secret for services requiring JWT validation
6. THE Deployment SHALL inject JWT_REFRESH_SECRET from Secret for auth-service
7. THE Deployment SHALL inject SESSION_SECRET from Secret for bff
8. THE Deployment SHALL inject Cloudinary credentials from Secret for media-service
9. THE Deployment SHALL inject RabbitMQ credentials from Secret for all services using RabbitMQ
10. THE Deployment SHALL inject Razorpay credentials from Secret for booking-service
11. THE Deployment SHALL inject NODE_ENV as "production" for all services
12. THE Deployment SHALL inject PORT matching the container port for all services

### Requirement 17: Persistent Volume Management

**User Story:** As a developer, I want to manage persistent storage for stateful services, so that data survives pod restarts and rescheduling.

#### Acceptance Criteria

1. THE PersistentVolume SHALL use local storage class for Minikube deployment
2. THE PersistentVolume SHALL use ReadWriteOnce access mode for single-node access
3. THE MongoDB PersistentVolume SHALL mount at /data/db path
4. THE Redis PersistentVolume SHALL mount at /data path
5. THE RabbitMQ PersistentVolume SHALL mount at /var/lib/rabbitmq path
6. THE Prometheus PersistentVolume SHALL mount at /prometheus path
7. THE Grafana PersistentVolume SHALL mount at /var/lib/grafana path
8. WHEN a StatefulSet pod is deleted, THE K8s_Cluster SHALL retain the PersistentVolume
9. WHEN a StatefulSet pod is recreated, THE K8s_Cluster SHALL reattach the same PersistentVolume
10. THE PersistentVolume SHALL support manual backup and restore operations

### Requirement 18: Namespace Isolation

**User Story:** As a developer, I want to isolate application resources in a dedicated namespace, so that I can manage resources independently from system components.

#### Acceptance Criteria

1. THE K8s_Cluster SHALL create a namespace called "heavenly" for application resources
2. THE K8s_Cluster SHALL create a namespace called "monitoring" for monitoring stack resources
3. FOR ALL application resources, THE K8s_Cluster SHALL deploy them in the heavenly namespace
4. FOR ALL monitoring resources, THE K8s_Cluster SHALL deploy them in the monitoring namespace
5. THE Prometheus SHALL have permissions to scrape metrics from the heavenly namespace
6. THE Promtail SHALL have permissions to collect logs from the heavenly namespace
7. WHEN listing resources, THE kubectl command SHALL filter by namespace for clarity

### Requirement 19: Service Dependency Management

**User Story:** As a developer, I want services to start in the correct order respecting dependencies, so that dependent services don't fail due to missing dependencies.

#### Acceptance Criteria

1. THE MongoDB StatefulSet SHALL be deployed before any service requiring MongoDB
2. THE Redis StatefulSet SHALL be deployed before any service requiring Redis
3. THE RabbitMQ StatefulSet SHALL be deployed before any service requiring RabbitMQ
4. THE auth-service Deployment SHALL be deployed before gateway Deployment
5. THE listing-service Deployment SHALL be deployed before search-service Deployment
6. THE gateway Deployment SHALL be deployed before bff Deployment
7. WHEN a service starts, THE Readiness_Probe SHALL prevent traffic routing until dependencies are available
8. WHEN a dependency is unavailable, THE service SHALL retry connection with exponential backoff

### Requirement 20: Monitoring Dashboard Templates

**User Story:** As a developer, I want pre-configured Grafana dashboards for common monitoring scenarios, so that I can start monitoring immediately without manual dashboard creation.

#### Acceptance Criteria

1. THE Grafana SHALL include a "Heavenly Services Overview" dashboard showing all service health
2. THE Grafana SHALL include a "Resource Usage" dashboard showing CPU and memory per service
3. THE Grafana SHALL include a "HPA Status" dashboard showing autoscaling behavior
4. THE Grafana SHALL include a "RabbitMQ Monitoring" dashboard showing queue metrics
5. THE Grafana SHALL include a "Request Latency" dashboard showing HTTP response times
6. THE Grafana SHALL include a "Pod Status" dashboard showing pod lifecycle events
7. THE Grafana SHALL include a "Logs Explorer" dashboard for log querying
8. FOR ALL dashboards, THE Grafana SHALL support time range selection
9. FOR ALL dashboards, THE Grafana SHALL support auto-refresh at configurable intervals
10. THE Grafana SHALL allow exporting dashboard JSON for version control

### Requirement 21: Local Development Workflow

**User Story:** As a developer, I want a streamlined workflow for building, deploying, and testing changes locally, so that I can iterate quickly during development.

#### Acceptance Criteria

1. THE workflow SHALL support building Docker images locally using Minikube's Docker daemon
2. THE workflow SHALL support loading local images into Minikube without pushing to registry
3. THE workflow SHALL support applying Kubernetes manifests using kubectl apply
4. THE workflow SHALL support viewing logs using kubectl logs command
5. THE workflow SHALL support port-forwarding to access services locally
6. THE workflow SHALL support executing commands in pods using kubectl exec
7. THE workflow SHALL support rolling restart of deployments using kubectl rollout restart
8. THE workflow SHALL support scaling deployments manually using kubectl scale
9. THE workflow SHALL provide Makefile targets for common operations
10. WHEN code changes are made, THE workflow SHALL support rebuilding and redeploying affected services

### Requirement 22: Configuration Validation

**User Story:** As a developer, I want to validate Kubernetes manifests before applying them, so that I can catch configuration errors early.

#### Acceptance Criteria

1. THE workflow SHALL support dry-run validation using kubectl apply --dry-run=client
2. THE workflow SHALL support server-side validation using kubectl apply --dry-run=server
3. THE workflow SHALL validate YAML syntax before applying manifests
4. THE workflow SHALL validate resource references (ConfigMaps, Secrets) exist before deployment
5. THE workflow SHALL validate resource limits are within cluster capacity
6. WHEN validation fails, THE workflow SHALL display clear error messages
7. WHEN validation succeeds, THE workflow SHALL proceed with actual deployment

### Requirement 23: Observability Integration

**User Story:** As a developer, I want services to expose metrics in Prometheus format, so that custom application metrics can be collected alongside system metrics.

#### Acceptance Criteria

1. FOR ALL Stateless_Service instances, THE service SHALL install the prom-client npm package to expose Prometheus-format metrics
2. FOR ALL Stateless_Service instances, THE service SHALL expose a /metrics endpoint serving default Node.js process metrics (CPU, memory, event loop lag, GC)
3. WHERE a service exposes /metrics endpoint, THE Prometheus SHALL automatically discover and scrape it
4. WHERE a service exposes /metrics endpoint, THE service SHALL format metrics in Prometheus exposition format
5. THE Prometheus SHALL collect custom metrics including HTTP request count, request duration, and error rate
6. THE Prometheus SHALL collect custom metrics including RabbitMQ message publish and consume counts
7. THE Prometheus SHALL collect custom metrics including database query duration
8. THE Prometheus SHALL add labels for service name, method, path, and status code to HTTP metrics
9. WHEN custom metrics are available, THE Grafana SHALL display them in relevant dashboards
10. THE /metrics endpoint SHALL be excluded from rate limiting middleware

### Requirement 24: Disaster Recovery

**User Story:** As a developer, I want to backup and restore stateful service data, so that I can recover from data loss scenarios.

#### Acceptance Criteria

1. THE workflow SHALL support creating MongoDB backups using mongodump
2. THE workflow SHALL support restoring MongoDB backups using mongorestore
3. THE workflow SHALL support creating Redis snapshots using SAVE command
4. THE workflow SHALL support restoring Redis snapshots from RDB files
5. THE workflow SHALL support exporting RabbitMQ definitions
6. THE workflow SHALL support importing RabbitMQ definitions
7. THE workflow SHALL store backups outside the cluster for safety
8. THE workflow SHALL include timestamp in backup filenames
9. WHEN a backup is created, THE workflow SHALL verify backup integrity
10. WHEN a restore is performed, THE workflow SHALL stop affected services before restoring data

### Requirement 25: Documentation and Learning Path

**User Story:** As a beginner developer, I want comprehensive documentation explaining each Kubernetes concept used, so that I can learn while implementing the infrastructure.

#### Acceptance Criteria

1. THE documentation SHALL explain Deployment vs StatefulSet differences
2. THE documentation SHALL explain Pod, Service, and Ingress concepts
3. THE documentation SHALL explain ConfigMap and Secret usage patterns
4. THE documentation SHALL explain HPA configuration and behavior
5. THE documentation SHALL explain PersistentVolume and PersistentVolumeClaim concepts
6. THE documentation SHALL explain Liveness and Readiness probe differences
7. THE documentation SHALL explain resource requests and limits impact on scheduling
8. THE documentation SHALL explain namespace isolation benefits
9. THE documentation SHALL provide step-by-step migration guide from Docker Compose
10. THE documentation SHALL include troubleshooting guide for common issues
11. THE documentation SHALL include kubectl command reference for common operations
12. THE documentation SHALL explain monitoring stack architecture and data flow
13. THE documentation SHALL include examples of querying metrics and logs
14. THE documentation SHALL explain cloud migration path from Minikube to GKE

### Requirement 26: Cloud Migration Readiness

**User Story:** As a developer, I want the Kubernetes configuration to be cloud-ready, so that I can migrate from Minikube to GKE with minimal changes.

#### Acceptance Criteria

1. THE Kubernetes manifests SHALL avoid Minikube-specific features where possible
2. THE Kubernetes manifests SHALL use standard Kubernetes APIs compatible with GKE
3. THE PersistentVolume configuration SHALL support switching from local storage to cloud storage classes
4. THE Ingress configuration SHALL support switching from NGINX to GKE Ingress
5. THE Service configuration SHALL support switching from ClusterIP to LoadBalancer for external services
6. THE documentation SHALL identify configuration changes needed for GKE migration
7. THE documentation SHALL explain GKE-specific features like GKE Autopilot and Workload Identity
8. THE documentation SHALL explain cost optimization strategies for cloud deployment

### Requirement 27: Security Configuration

**User Story:** As a developer, I want to follow Kubernetes security best practices, so that the deployment is secure by default.

#### Acceptance Criteria

1. FOR ALL Deployments, THE container SHALL run as non-root user where possible
2. FOR ALL Deployments, THE container SHALL have read-only root filesystem where possible
3. FOR ALL Deployments, THE SecurityContext SHALL drop unnecessary Linux capabilities
4. THE Secret SHALL be referenced by environment variables, not mounted as files
5. THE RBAC configuration SHALL grant minimum necessary permissions to service accounts
6. THE NetworkPolicy SHALL restrict pod-to-pod communication to required paths only
7. THE Ingress SHALL support TLS termination for HTTPS traffic
8. THE Prometheus SHALL require authentication for external access
9. THE Grafana SHALL require authentication with strong password policy
10. WHEN secrets are stored in version control, THE secrets SHALL be encrypted using tools like sealed-secrets or external secret managers

### Requirement 28: Performance Optimization

**User Story:** As a developer, I want to optimize resource usage and performance, so that the cluster runs efficiently on limited local resources.

#### Acceptance Criteria

1. THE Deployment SHALL use imagePullPolicy: Never for local Minikube deployment (switch to IfNotPresent for cloud migration)
2. THE Deployment SHALL configure appropriate resource requests to enable efficient bin-packing
3. THE HPA SHALL use appropriate scaling thresholds to avoid flapping
4. THE Prometheus SHALL use appropriate scrape intervals to balance freshness and overhead
5. THE Loki SHALL compress logs to reduce storage usage
6. THE Service SHALL use appropriate session affinity for stateful connections
7. THE Ingress SHALL configure appropriate timeout values for long-running requests
8. WHEN multiple replicas exist, THE Service SHALL distribute load evenly across healthy pods

### Requirement 29: Operational Readiness

**User Story:** As a developer, I want operational tools and procedures, so that I can manage the cluster effectively in production-like scenarios.

#### Acceptance Criteria

1. THE workflow SHALL support viewing cluster resource usage using kubectl top
2. THE workflow SHALL support describing resources for troubleshooting using kubectl describe
3. THE workflow SHALL support viewing events for debugging using kubectl get events
4. THE workflow SHALL support checking pod logs using kubectl logs with follow mode
5. THE workflow SHALL support executing commands in running pods using kubectl exec
6. THE workflow SHALL support copying files to/from pods using kubectl cp
7. THE workflow SHALL support checking deployment rollout status using kubectl rollout status
8. THE workflow SHALL support viewing HPA status using kubectl get hpa
9. THE workflow SHALL support viewing PersistentVolume status using kubectl get pv
10. THE workflow SHALL include runbook for common operational scenarios

### Requirement 30: Testing and Validation

**User Story:** As a developer, I want to validate that the Kubernetes deployment works correctly, so that I can verify the migration from Docker Compose was successful.

#### Acceptance Criteria

1. THE validation SHALL verify all pods are running and ready
2. THE validation SHALL verify all services have endpoints
3. THE validation SHALL verify Ingress routes traffic correctly to BFF
4. THE validation SHALL verify inter-service communication works through Service DNS
5. THE validation SHALL verify ConfigMaps and Secrets are mounted correctly
6. THE validation SHALL verify health checks are passing
7. THE validation SHALL verify HPA is monitoring metrics correctly
8. THE validation SHALL verify Prometheus is scraping metrics from all services
9. THE validation SHALL verify Loki is receiving logs from all pods
10. THE validation SHALL verify Grafana dashboards display data correctly
11. THE validation SHALL perform smoke test covering critical user workflows
12. WHEN validation fails, THE workflow SHALL provide diagnostic information for troubleshooting
