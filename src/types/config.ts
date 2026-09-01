import { MsalSettings } from './msalSettings';

export enum AppCapabilities {
  SEMANTIC_SEARCH = 'semanticSearch',
  CONTRIBUTIONS = 'contributions',
}

/**
 * An API Center inventory available from the portal.
 */
export interface ApiCenterConfig {
  /** Stable identifier used to persist the browser selection. */
  id: string;
  /** User-facing label shown in the portal selector. */
  title: string;
  /** Data API hostname for this API Center. */
  dataApiHostName: string;
  /** App role value required for this API Center to appear in the portal. */
  requiredAppRole?: string;
}

/**
 * The application settings contract.
 */
export interface Config {
  /**
   * Data API hostname, e.g. https://contoso.data.centraluseuap.azure-apicenter.ms.
   */
  dataApiHostName: string;

  /**
   * API Centers available from this portal.
   */
  apiCenters?: ApiCenterConfig[];

  /**
   * API Center selected when the browser has no saved selection.
   */
  defaultApiCenterId?: string;

  /**
   * The API portal title.
   */
  title: string;

  /**
   * The authentication settings. If not provided, anonymous access is enabled.
   */
  authentication?: MsalSettings;

  /**
   * Customer-owned APIM proxy endpoint used for cross-origin test requests.
   */
  corsProxyEndpoint?: string;

  /**
   * Optional customer-owned agent playground backend.
   */
  agent?: {
    /** HTTPS endpoint that accepts agent chat requests. */
    endpoint: string;
  };

  /**
   * MCP-specific settings.
   */
  mcp?: {
    /** Whether to use the CORS proxy for MCP server calls. Defaults to false. */
    useCorsProxy?: boolean;
    /** Whether to enable Entra ID authentication for MCP servers. Defaults to false. */
    enableEntraIdAuth?: boolean;
  };

  /**
   * The scoping filter. If provided, only APIs with the specified metadata properties will be shown.
   */
  scopingFilter: string;

  /**
   * The capabilities supported by the service, depending on SKU and other parameters.
   */
  capabilities: AppCapabilities[];

  /**
   * The contributions settings for the portal.
   */
  contributions?: {
    enabled: boolean;
    gitRepositoryUrl: string;
  };
}
