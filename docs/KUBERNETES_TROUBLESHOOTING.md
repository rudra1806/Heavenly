# Heavenly Kubernetes Troubleshooting

## Pod Stuck Pending

Check capacity and PVCs:

```bash
kubectl describe pod -n heavenly <pod>
kubectl get pvc -n heavenly
```

Minikube should be started with `make k8s-start` so the cluster has 6 CPUs and 10GB RAM.

## ImagePullBackOff

The manifests use local images with `imagePullPolicy: IfNotPresent`. Rebuild into Minikube's Docker daemon:

```bash
eval "$(minikube docker-env)"
make k8s-deploy
```

## CreateContainerConfigError

Usually a missing ConfigMap or Secret:

```bash
kubectl get configmap heavenly-config -n heavenly
kubectl get secret heavenly-secrets -n heavenly
scripts/create-secret.sh .env
```

## CrashLoopBackOff

Read logs and events:

```bash
kubectl logs -n heavenly deploy/auth-service --previous
kubectl describe pod -n heavenly <pod>
```

Common causes are invalid credentials, MongoDB/RabbitMQ still starting, or missing third-party keys.

## Ingress Not Working

Check the addon, ingress object, and hosts entry:

```bash
minikube addons list | grep ingress
kubectl get ingress -n heavenly
minikube ip
```

`/etc/hosts` needs `<minikube-ip> heavenly.local`.

## HPA Shows Unknown

The metrics-server may still be starting:

```bash
kubectl top pods -n heavenly
kubectl get apiservice v1beta1.metrics.k8s.io
```

Run `minikube addons enable metrics-server` if metrics are unavailable.

## Prometheus or Loki Missing Data

Check pod annotations and monitoring pods:

```bash
kubectl get pods -n heavenly -o jsonpath="{range .items[*]}{.metadata.name}{' '}{.metadata.annotations}{'\n'}{end}"
kubectl get pods -n monitoring
```

Application pods expose `/metrics`; Promtail collects container stdout/stderr from the `heavenly` namespace.
