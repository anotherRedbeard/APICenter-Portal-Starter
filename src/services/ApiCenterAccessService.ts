import { setRecoil } from 'recoil-nexus';
import { accessibleApiCenterIdsAtom } from '@/atoms/accessibleApiCenterIdsAtom';
import { configAtom } from '@/atoms/configAtom';
import { isAccessDeniedAtom } from '@/atoms/isAccessDeniedAtom';
import { saveSelectedApiCenter } from '@/config/apiCenterSelection';
import { ApiCenterConfig } from '@/types/config';
import { Config } from '@/types/config';
import { IAuthService } from '@/types/services/IAuthService';

/**
 * Filters configured API Centers using app roles from the signed-in user's ID token.
 *
 * @param apiCenters - API Centers configured for the portal.
 * @param userRoles - App role values assigned through the portal's enterprise application.
 * @returns API Centers authorized by the user's app roles.
 */
export function getAccessibleApiCenters(apiCenters: ApiCenterConfig[], userRoles: string[]): ApiCenterConfig[] {
  const assignedRoles = new Set(userRoles);
  return apiCenters.filter((apiCenter) => !apiCenter.requiredAppRole || assignedRoles.has(apiCenter.requiredAppRole));
}

/**
 * Refreshes the shared API Center access state after silent or interactive authentication.
 *
 * @param authService - Active portal authentication service.
 * @param config - Current runtime portal configuration.
 */
export async function refreshApiCenterAccess(authService: IAuthService, config: Config): Promise<void> {
  const configuredApiCenters = config.apiCenters ?? [];
  if (configuredApiCenters.length === 0) return;

  const userRoles = (await authService.getUserRoles?.()) ?? [];
  const accessibleApiCenters = getAccessibleApiCenters(configuredApiCenters, userRoles);
  setRecoil(
    accessibleApiCenterIdsAtom,
    accessibleApiCenters.map((apiCenter) => apiCenter.id)
  );
  setRecoil(isAccessDeniedAtom, accessibleApiCenters.length === 0);

  const selectedApiCenter = accessibleApiCenters.find(
    (apiCenter) => apiCenter.dataApiHostName === config.dataApiHostName
  );
  const fallbackApiCenter = accessibleApiCenters[0];

  if (!selectedApiCenter && fallbackApiCenter) {
    saveSelectedApiCenter(fallbackApiCenter.id);
    setRecoil(configAtom, {
      ...config,
      dataApiHostName: fallbackApiCenter.dataApiHostName,
    });
  }
}
