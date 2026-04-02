type ZohoTokenResponse = {
  access_token: string;
  api_domain?: string;
  token_type?: string;
  expires_in?: number;
};

type EarlyAccessPayload = {
  name: string;
  email: string;
  company?: string;
  role?: string;
  message?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function clean(value?: string) {
  return value?.trim() || "";
}

function getLastName(name: string) {
  const trimmed = clean(name);
  if (!trimmed) return "Unknown";
  const parts = trimmed.split(/\s+/);
  return parts.length === 1 ? parts[0] : parts[parts.length - 1];
}

export async function getZohoAccessToken() {
  const accountsDomain = requiredEnv("ZOHO_ACCOUNTS_DOMAIN");
  const clientId = requiredEnv("ZOHO_CLIENT_ID");
  const clientSecret = requiredEnv("ZOHO_CLIENT_SECRET");
  const refreshToken = requiredEnv("ZOHO_REFRESH_TOKEN");

  const tokenUrl = `${accountsDomain}/oauth/v2/token`;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as ZohoTokenResponse & { error?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data?.error || "Unable to refresh Zoho access token.");
  }

  return {
    accessToken: data.access_token,
    apiDomain: data.api_domain || process.env.ZOHO_API_DOMAIN || requiredEnv("ZOHO_API_DOMAIN"),
  };
}

export function buildZohoLeadRecord(payload: EarlyAccessPayload) {
  const fullName = clean(payload.name);
  const ownerId = clean(process.env.ZOHO_LEAD_OWNER_ID);
  const leadSource = clean(process.env.ZOHO_LEAD_SOURCE) || "Veraxius Website";

  const record: Record<string, unknown> = {
    Last_Name: getLastName(fullName),
    Email: clean(payload.email),
    Company: clean(payload.company),
    Designation: clean(payload.role),
    Description: clean(payload.message),
    Lead_Source: leadSource,
  };

  if (ownerId) {
    record.Owner = { id: ownerId };
  }

  return record;
}

export async function createZohoCrmRecord(payload: EarlyAccessPayload) {
  const moduleApiName = process.env.ZOHO_CRM_MODULE || "Leads";
  const { accessToken, apiDomain } = await getZohoAccessToken();

  const endpoint = `${apiDomain}/crm/v8/${moduleApiName}`;
  const body = {
    data: [buildZohoLeadRecord(payload)],
    trigger: ["workflow", "approval", "blueprint"],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.data?.[0]?.details?.api_name ||
      data?.data?.[0]?.message ||
      data?.message ||
      "Zoho CRM record creation failed.";
    throw new Error(message);
  }

  const first = data?.data?.[0];
  if (!first || first.status !== "success") {
    throw new Error(first?.message || "Zoho CRM did not confirm record creation.");
  }

  return data;
}
