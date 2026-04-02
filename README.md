# Veraxius Next.js Polished V1 + Zoho CRM

Included:
- motion behavior with Framer Motion
- responsive refinements
- final SVG system diagram
- production-grade navbar and footer
- Early Access form
- Zoho CRM API integration for form submissions

## Run
```bash
npm install
npm run dev
```

## Zoho CRM setup

This build sends Early Access form submissions into Zoho CRM using the CRM Records API.

### Required environment variables
Copy `.env.example` to `.env.local` and fill in:

- `ZOHO_ACCOUNTS_DOMAIN`
- `ZOHO_API_DOMAIN`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`
- `ZOHO_CRM_MODULE`

### Recommended target module
Use `Leads` unless you already created a custom CRM module for website interest capture.

### Field mapping used by default
The API route creates one CRM record with:
- `Last_Name` ← submitted name
- `Email` ← submitted email
- `Company` ← submitted company
- `Designation` ← submitted role
- `Description` ← submitted message
- `Lead_Source` ← `ZOHO_LEAD_SOURCE` or `Veraxius Website`

Optional:
- `Owner.id` ← `ZOHO_LEAD_OWNER_ID`

## Notes
Zoho access tokens expire after about one hour, so this integration uses the refresh-token flow server-side and requests a fresh access token before inserting the CRM record.

## Next production move
After your credentials are added, test one live form submission and confirm:
1. the module API name is correct
2. your Lead field API names match the defaults
3. assignment rules and workflows behave as expected
