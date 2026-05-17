# Heavenly Kubernetes Runbook

## Start Cluster

```bash
make k8s-start
```

This starts Minikube with 6 CPUs and 10GB RAM, then enables `ingress` and `metrics-server`.

## Deploy

```bash
make k8s-deploy
```

The deploy script applies manifests, creates the Kubernetes Secret from `.env`, builds local images, deploys apps, installs monitoring with Helm, and prints the hosts entry for `heavenly.local`.

Add the printed entry to `/etc/hosts`:

```text
<minikube-ip> heavenly.local
```

## Check Status

```bash
make k8s-status
make k8s-verify
kubectl get pods -n heavenly
kubectl get hpa -n heavenly
```

## Logs

```bash
make k8s-logs SERVICE=bff
kubectl logs -n heavenly deploy/auth-service -f
```

## Restart

```bash
make k8s-restart
make k8s-restart SERVICE=auth-service
```

## Grafana

```bash
make k8s-grafana
```

Open `http://localhost:3000`. The default kube-prometheus-stack username is usually `admin`; get the password with:

```bash
kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d
```

## Cleanup

```bash
make k8s-cleanup
DELETE_PVCS=true make k8s-cleanup
```

The default cleanup keeps PVCs. Set `DELETE_PVCS=true` when you intentionally want local app data removed.
