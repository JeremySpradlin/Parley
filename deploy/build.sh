#!/bin/bash

# Build and push images to Azure Container Registry

echo "🔨 Building Parley images..."

# Backend
echo "📦 Building backend..."
cd ../backend
docker build -t kbiregistry.azurecr.io/parley/backend:latest .
docker push kbiregistry.azurecr.io/parley/backend:latest

# Frontend
echo "📦 Building frontend..."
cd ../frontend
docker build --build-arg NEXT_PUBLIC_APP_PASSWORD="Gr82b@kbi!" -t kbiregistry.azurecr.io/parley/frontend:latest .
docker push kbiregistry.azurecr.io/parley/frontend:latest

echo "✅ Build complete!"