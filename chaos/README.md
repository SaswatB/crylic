# K8s deployment

## Build containers

```bash
cd ..

# build backend
pushd backend
./gradlew.bat bootBuildImage --imageName=crylic/backend
popd

# build frontend (yarn build may need to be run first in this directory)
pushd web
docker build . -t crylic/web
popd

# build dev container (optional)
pushd chaos/routing
docker build . -t crylic/routing
popd
```

## Deploy K8s

```bash
# Create the namespace and set it as the default
kubectl apply -f ./crylic-namespace.yaml
kubectl config set-context --current --namespace=crylic

# Install Istio
istioctl install --set profile=demo --set meshConfig.accessLogFile=/dev/stdout
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.7/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.7/samples/addons/jaeger.yaml
helm install --namespace istio-system --set auth.strategy="anonymous" --repo https://kiali.org/helm-charts kiali-server kiali-server
kubectl label namespace crylic istio-injection=enabled

# Run all the services
k apply -f ./
```

## Istio extras

```bash
# Check if the config is valid for Istio
istioctl analyze

# Access Istio dashboard
istioctl dashboard kiali

# Get istio external ip
kubectl get svc istio-ingressgateway -n istio-system
```
