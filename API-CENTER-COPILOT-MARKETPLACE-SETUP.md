# Connect GitHub Copilot CLI to an Entra-Protected API Center Marketplace

Follow these steps from beginning to end.

This walkthrough starts with an API Center that already has:

- Microsoft Entra authentication configured.
- The plugin marketplace endpoint enabled.
- At least one plugin in the marketplace.
- A working marketplace Git repository.

Replace these placeholders with the customer environment values:

```text
API Center name: <API_CENTER_NAME>
API Center data API hostname: <API_CENTER_DATA_API_HOSTNAME>
Marketplace name: <MARKETPLACE_NAME>
Plugin name: <PLUGIN_NAME>
```

The marketplace URL has this format:

```text
https://<API_CENTER_DATA_API_HOSTNAME>/workspaces/default/plugins/marketplace.git
```

> [!IMPORTANT]
> Microsoft currently documents the API Center plugin marketplace for anonymous access. The authenticated Git behavior used in this walkthrough must be tested with your API Center before sharing it with developers.

## Part 1: Prepare the Azure identity

Complete Part 1 once as an Azure administrator.

If the application used to configure Entra authentication on the API Center already has a client secret, use that application and skip step 5.

### 1. Open a terminal

The terminal must have:

- Azure CLI
- `curl`
- `jq`

Check each command:

```bash
az version
curl --version
jq --version
```

Install anything that is missing before continuing.

### 2. Sign in to Azure

```bash
az login
```

Select the subscription containing the API Center:

```bash
az account set --subscription "<SUBSCRIPTION_ID_OR_NAME>"
```

Confirm the selected subscription:

```bash
az account show \
  --query '{subscription:name,subscriptionId:id,tenantId:tenantId}' \
  --output table
```

Do not continue until the correct subscription is displayed.

### 3. Set the API Center values

Replace the placeholders with the customer environment values:

> [!IMPORTANT]
> Complete the remaining steps in this same terminal window. The `export` commands below set variables only for the current shell session. If the terminal is closed, start again from this step before continuing.

```bash
export SUBSCRIPTION_ID=$(az account show --query id --output tsv)
export TENANT_ID=$(az account show --query tenantId --output tsv)
export RESOURCE_GROUP="<API_CENTER_RESOURCE_GROUP>"
export API_CENTER_NAME="<API_CENTER_NAME>"
export APICENTER_ENDPOINT="<API_CENTER_DATA_API_HOSTNAME>"
export MARKETPLACE_NAME="<MARKETPLACE_NAME>"
export PLUGIN_NAME="<PLUGIN_NAME>"
```

Build the API Center resource ID and marketplace URL:

```bash
export API_CENTER_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ApiCenter/services/${API_CENTER_NAME}"
export MARKETPLACE_BASE="https://${APICENTER_ENDPOINT}/workspaces/default/plugins/"
export MARKETPLACE_URL="${MARKETPLACE_BASE}marketplace.git"
```

Confirm that the API Center exists:

```bash
az resource show \
  --ids "${API_CENTER_RESOURCE_ID}" \
  --query '{name:name,location:location,resourceGroup:resourceGroup}' \
  --output table
```

### 4. Set the Entra Application client ID

Use the Application (client) ID from the App Registration configured for the API Center's Entra authentication:

```bash
export CLIENT_ID="<APPLICATION_CLIENT_ID>"
```

Verify the App Registration:

```bash
az ad app show \
  --id "${CLIENT_ID}" \
  --query '{displayName:displayName,clientId:appId,applicationObjectId:id}' \
  --output table
```

Verify its Enterprise Application:

```bash
az ad sp show \
  --id "${CLIENT_ID}" \
  --query '{displayName:displayName,clientId:appId,servicePrincipalObjectId:id}' \
  --output table
```

Save the service principal object ID:

```bash
export SERVICE_PRINCIPAL_OBJECT_ID=$(
  az ad sp show \
    --id "${CLIENT_ID}" \
    --query id \
    --output tsv
)
```

### 5. Create a client secret

Skip this step if the App Registration already has a client secret whose value is available through the customer's approved secret-management system.

Create a secret and load it directly into the current terminal:

```bash
CREDENTIAL_RESPONSE=$(
  az ad app credential reset \
    --id "${CLIENT_ID}" \
    --append \
    --display-name "API Center marketplace automation" \
    --years 1 \
    --output json
)
```

Extract the secret:

```bash
export CLIENT_SECRET=$(
  printf '%s' "${CREDENTIAL_RESPONSE}" |
    jq -r '.password // empty'
)
```

Stop if the command did not return a secret:

```bash
if [ -z "${CLIENT_SECRET}" ]; then
  echo "A client secret was not created."
  return 1 2>/dev/null || exit 1
fi
```

Save the secret immediately in the customer's approved password vault or secret-management system.

The secret value cannot be retrieved from Entra after this terminal session ends.

Clear the response object:

```bash
unset CREDENTIAL_RESPONSE
```

### 6. Give the Enterprise Application access to the API Center

Assign Azure API Center Data Reader to the service principal:

```bash
az role assignment create \
  --assignee-object-id "${SERVICE_PRINCIPAL_OBJECT_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Azure API Center Data Reader" \
  --scope "${API_CENTER_RESOURCE_ID}"
```

Confirm the assignment:

```bash
az role assignment list \
  --assignee-object-id "${SERVICE_PRINCIPAL_OBJECT_ID}" \
  --scope "${API_CENTER_RESOURCE_ID}" \
  --query "[?roleDefinitionName=='Azure API Center Data Reader'].{role:roleDefinitionName,scope:scope}" \
  --output table
```

Do not continue until the table contains:

```text
Azure API Center Data Reader
```

Wait several minutes if the assignment was just created.

## Part 2: Test unattended API Center authentication

Complete these steps before configuring GitHub Copilot CLI.

### 7. Load the client secret

If step 5 was completed, `CLIENT_SECRET` is already set in the current shell.

If an existing secret is being used instead, load it into `CLIENT_SECRET` from the customer's approved secret-management system. Do not place the actual secret in a script or source-control repository.

### 8. Request an API Center token

```bash
TOKEN_RESPONSE=$(
  curl --silent --show-error \
    --request POST \
    "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=${CLIENT_ID}" \
    --data-urlencode "client_secret=${CLIENT_SECRET}" \
    --data-urlencode "scope=https://azure-apicenter.net/.default"
)
```

Extract the token:

```bash
export APIC_TOKEN=$(
  printf '%s' "${TOKEN_RESPONSE}" |
    jq -r '.access_token // empty'
)
```

Check the result:

```bash
if [ -z "${APIC_TOKEN}" ]; then
  printf '%s\n' "${TOKEN_RESPONSE}" |
    jq '{error,error_description}'
  return 1 2>/dev/null || exit 1
fi

printf '%s\n' "${TOKEN_RESPONSE}" |
  jq '{token_type,expires_in,ext_expires_in}'
```

A successful result resembles:

```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "ext_expires_in": 3599
}
```

Do not continue if an OAuth error is displayed.

### 9. Create the temporary Git authorization value

Convert the API Center token into the HTTP Basic value required by Git:

```bash
export BASIC_AUTH=$(
  printf ':%s' "${APIC_TOKEN}" |
    base64 |
    tr -d '\r\n'
)
```

Create a helper that supplies the authorization header without writing it to Git configuration:

```bash
run_with_apic_auth() {
  GIT_TERMINAL_PROMPT=0 \
  GIT_CONFIG_COUNT=1 \
  GIT_CONFIG_KEY_0="http.extraHeader" \
  GIT_CONFIG_VALUE_0="Authorization: Basic ${BASIC_AUTH}" \
  "$@"
}
```

`http.extraHeader` applies the header to all HTTP requests made by the command. This avoids URL-matching and redirect issues that can prevent a URL-scoped Git configuration from sending the header.

The configuration exists only for the process started by `run_with_apic_auth`; it is not saved in `~/.gitconfig` or applied to later Git commands.

`GIT_TERMINAL_PROMPT=0` prevents Git from requesting a username and password if API Center rejects the header. Git displays the actual HTTP authentication error instead.

### 10. Test the marketplace Git repository

```bash
run_with_apic_auth \
  git ls-remote "${MARKETPLACE_URL}"
```

Success resembles:

```text
<COMMIT_HASH>    HEAD
<COMMIT_HASH>    refs/heads/main
```

Do not continue until Git references are returned.

If the result is:

- `401`: obtain a new token and rebuild `BASIC_AUTH`.
- `403`: verify that Data Reader is assigned to the service principal, then allow time for RBAC propagation.
- `404` or `repository not found`: the marketplace repository has not been generated.

If `403` continues after the RBAC assignment has propagated, this API Center is not accepting app-only marketplace authentication. See [If app-only authentication is rejected](#if-app-only-authentication-is-rejected).

## Part 3: Configure GitHub Copilot CLI

### 11. Install GitHub Copilot CLI

Choose one installation method.

#### npm

Node.js 22 or later is required:

```bash
npm install -g @github/copilot
```

#### Homebrew

```bash
brew install --cask copilot-cli
```

#### WinGet

```powershell
winget install GitHub.Copilot
```

Confirm the installation:

```bash
git --version
curl --version
jq --version
copilot --version
```

### 12. Authenticate GitHub Copilot CLI

If Copilot CLI is already authenticated, continue to step 13.

For an unattended installation, create a user-owned fine-grained GitHub personal access token with the **Copilot Requests** account permission.

Provide it to the developer machine through the customer's approved secret-management or device-management system:

```bash
export COPILOT_GITHUB_TOKEN="<GITHUB_COPILOT_TOKEN>"
```

Copilot CLI also accepts `GH_TOKEN` or `GITHUB_TOKEN`, but `COPILOT_GITHUB_TOKEN` has the highest precedence.

Classic `ghp_` personal access tokens are not supported.

### 13. Add the API Center marketplace

```bash
run_with_apic_auth \
  copilot plugin marketplace add "${MARKETPLACE_URL}"
```

Confirm registration:

```bash
copilot plugin marketplace list
```

The list should contain the configured marketplace name:

```text
<MARKETPLACE_NAME>
```

### 14. Browse the marketplace

```bash
run_with_apic_auth \
  copilot plugin marketplace browse "${MARKETPLACE_NAME}"
```

The selected plugin should be listed.

### 15. Install the plugin

```bash
run_with_apic_auth \
  copilot plugin install "${PLUGIN_NAME}@${MARKETPLACE_NAME}"
```

Confirm installation:

```bash
copilot plugin list
```

The list should contain:

```text
<PLUGIN_NAME>@<MARKETPLACE_NAME>
```

### 16. Confirm the installed skills

Start GitHub Copilot CLI:

```bash
copilot
```

Enter:

```text
/skills
```

Confirm that the skills linked to the selected API Center plugin are listed.

```text
<EXPECTED_SKILL_NAME>
```

Exit Copilot CLI when finished.

### 17. Clear sensitive values

```bash
unset CLIENT_SECRET
unset APIC_TOKEN
unset BASIC_AUTH
unset TOKEN_RESPONSE
unset -f run_with_apic_auth
```

If the GitHub token was supplied only for this installation:

```bash
unset COPILOT_GITHUB_TOKEN
```

The marketplace and plugin remain installed after these variables are cleared.

## Updating the marketplace later

Open a terminal, repeat step 3 to restore the marketplace variables, repeat step 4 to set `CLIENT_ID`, load `CLIENT_SECRET`, and then repeat steps 8 and 9 to obtain a new access token and rebuild the Git authorization helper.

Then run:

```bash
run_with_apic_auth \
  copilot plugin marketplace update "${MARKETPLACE_NAME}"
```

Update the installed plugin:

```bash
run_with_apic_auth \
  copilot plugin update "${PLUGIN_NAME}@${MARKETPLACE_NAME}"
```

Clear the sensitive values by repeating step 17.

## Removing an old Git authorization header

This walkthrough does not save the API Center authorization header in `~/.gitconfig`.

If an earlier procedure saved the header globally, remove it:

```bash
git config --global --unset-all \
  "http.${MARKETPLACE_BASE}.extraHeader" 2>/dev/null || true
```

Confirm that it is gone:

```bash
git config --global --get-all \
  "http.${MARKETPLACE_BASE}.extraHeader"
```

The final command should return no output.

## If app-only authentication is rejected

If the token request succeeds but `git ls-remote` continues to return `403` after the service principal has Data Reader access, do not switch back to device code for unattended deployment.

A client secret cannot remove the user interaction required by a delegated device-code flow.

Use one of these alternatives:

1. Keep the API Center marketplace anonymous.
2. Mirror the generated marketplace to a private Git repository that supports machine authentication.
3. Use a customer-operated token broker with an approved delegated-user authentication and refresh-token design.
