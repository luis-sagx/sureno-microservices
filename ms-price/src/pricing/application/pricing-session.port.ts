export interface PricingCredentials {
  cookie?: string;
  authorization?: string;
}

export interface PricingPrincipal {
  userId: string;
  roles: string[];
}

export interface PricingSessionPort {
  resolveOptional(credentials: PricingCredentials): Promise<PricingPrincipal | null>;
  requireAdmin(credentials: PricingCredentials): Promise<PricingPrincipal>;
}
