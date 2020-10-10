## Develop backend

```bash
# Replace the backend with a blank image that can be ssh'd into
k patch deployment crylic-backend --type='json' --patch "$(get-content backend-dev-patch.json -raw)"

# Run telepresence (as admin)
../routing/telepresence.ps1
# Now run the backend locally

# Restore old backend image
k apply -f ../backend.yaml
```
