export interface CatalogPrincipal {
  userId: string;
  username?: string;
  roles: string[];
}

export interface CatalogAuthCredentials {
  cookie?: string;
  authorization?: string;
}

export interface CatalogAuthResult {
  principal: CatalogPrincipal;
  refreshedCookie?: string;
}

export interface CatalogAuthPort {
  requireAdmin(credentials: CatalogAuthCredentials): Promise<CatalogAuthResult>;
}
