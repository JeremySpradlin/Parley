#!/bin/bash

# Simple deployment script for Parley

echo "🚀 Deploying Parley..."

# Apply configurations
echo "📋 Applying configurations..."
kubectl apply -f secret.yaml
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To check status:"
echo "  kubectl get pods -l app=parley"
echo "  kubectl get svc parley"
echo ""
echo "To get the external IP:"
echo "  kubectl get svc parley -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
echo ""
echo "Access the app at: http://<EXTERNAL-IP>"