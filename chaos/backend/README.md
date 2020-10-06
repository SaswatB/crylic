## Develop backend

```bash
# Replace the backend with a blank java image that can be ssh'd into and a volume to access host
k patch deployment crylic-backend --type='json' --patch "$(get-content backend-dev-patch.json -raw)"

# Forward the ssh server to localhost
k port-forward $(k get pods --selector='app=crylic-backend' -o name) 2222:22
# Run the backend within the host path volume (should be at /opt/run/desktop/mnt/host/c/ for wsl2)
./gradlew bootRun

# Restore old backend image (this doesn't delete the volume)
k apply -f ../backend.yaml
```
