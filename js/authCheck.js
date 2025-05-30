// authCheck.js
import { UserManager } from 'https://cdn.jsdelivr.net/npm/oidc-client-ts/+esm';

export async function ensureAuthenticated() {
  const baseUrl = new URL('.', import.meta.url);
  const config = await fetch(new URL('../config.json', import.meta.url)).then(res => res.json());

  const userManager = new UserManager({
    authority: config.OIDC_AUTHORITY,
    client_id: config.OIDC_CLIENT_ID,
    redirect_uri: new URL(config.OIDC_REDIRECT_URI_PATH, baseUrl).href,
    response_type: 'code',
    scope: config.OIDC_SCOPE
  });

  const user = await userManager.getUser();
  if (!user || !user.access_token) {
    await userManager.signinRedirect();
  }

  return user;
}