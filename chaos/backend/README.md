## Develop backend

```bash
# Replace the backend with a blank java image that can be ssh'd into and a volume to access host
k patch deployment crylic-backend --type='json' --patch "$(get-content backend-dev-patch.json -raw)"

# Forward the ssh server to localhost
k port-forward $(k get pods --selector='app=crylic-backend' -o name) 2222:22

# Restore old backend image (this doesn't delete the volume)
k apply -f ../backend.yaml
```

## Initialize dev container

```bash
wget -qO - https://adoptopenjdk.jfrog.io/adoptopenjdk/api/gpg/key/public | apt-key add -
apt-get install -y software-properties-common
add-apt-repository --yes https://adoptopenjdk.jfrog.io/adoptopenjdk/deb/
apt-get update
apt-get install -y adoptopenjdk-11-hotspot
```
