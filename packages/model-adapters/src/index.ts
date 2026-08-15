export interface ModelAdapter {
  id: string;
  executeFromContextPackage(ccp: unknown, query: string): Promise<{
    text: string;
    providerResponseId?: string;
  }>;
}

// Model adapters may translate CCP into provider-specific context.
// They MUST NOT expand the authorization scope or mutate durable claims.
