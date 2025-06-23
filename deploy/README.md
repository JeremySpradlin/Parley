# Parley - Simple Deployment

## Quick Deploy

1. **Create secret.yaml from example**:
   ```bash
   cp secret.yaml.example secret.yaml
   ```
   Then update API Keys in `secret.yaml`:
   - Replace `your-anthropic-api-key-here`
   - Replace `your-openai-api-key-here`

2. **Build and Push Images**:
   ```bash
   cd deploy
   ./build.sh
   ```

3. **Deploy**:
   ```bash
   ./deploy.sh
   ```

4. **Get External IP**:
   ```bash
   kubectl get svc parley
   ```

5. **Access**: `http://<EXTERNAL-IP>`

That's it! 🎉