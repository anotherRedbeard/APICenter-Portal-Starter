import { ApiCenterConfig, Config } from '@/types/config';

const SELECTED_API_CENTER_KEY = 'apiCenterPortal.selectedApiCenterId';

type RuntimeConfig = Partial<Config> & {
  apiCenters?: ApiCenterConfig[];
};

/**
 * Resolves the configured API Center and produces the complete application config.
 *
 * @param runtimeConfig - Configuration loaded from the public config file.
 * @returns Application configuration with the selected Data API host.
 */
export function resolveConfig(runtimeConfig: RuntimeConfig): Config {
  const apiCenters = runtimeConfig.apiCenters ?? [];
  const storedId = window.localStorage.getItem(SELECTED_API_CENTER_KEY);
  const selectedApiCenter =
    apiCenters.find((apiCenter) => apiCenter.id === storedId) ??
    apiCenters.find((apiCenter) => apiCenter.id === runtimeConfig.defaultApiCenterId) ??
    apiCenters[0];
  const dataApiHostName = selectedApiCenter?.dataApiHostName ?? runtimeConfig.dataApiHostName;

  if (!dataApiHostName) {
    throw new Error('The portal config must define dataApiHostName or at least one API Center.');
  }

  return {
    title: 'API portal',
    scopingFilter: '',
    capabilities: [],
    ...runtimeConfig,
    dataApiHostName,
    apiCenters,
  };
}

/**
 * Persists the API Center selected by the user.
 *
 * @param apiCenterId - Stable ID from the runtime API Center configuration.
 */
export function saveSelectedApiCenter(apiCenterId: string): void {
  window.localStorage.setItem(SELECTED_API_CENTER_KEY, apiCenterId);
}
