import { getRecoil } from 'recoil-nexus';
import { appServicesAtom } from '@/atoms/appServicesAtom';
import { configAtom } from '@/atoms/configAtom';

export async function apimFetchProxy(url: string, requestInit?: RequestInit): ReturnType<typeof fetch> {
  const { AuthService } = getRecoil(appServicesAtom);
  const config = getRecoil(configAtom);
  const corsProxyEndpoint = config.corsProxyEndpoint;

  if (!corsProxyEndpoint) {
    throw new Error('CORS proxy is not configured. Set corsProxyEndpoint to a customer-owned HTTPS endpoint.');
  }

  const parsedProxyEndpoint = new URL(corsProxyEndpoint);
  if (parsedProxyEndpoint.protocol !== 'https:') {
    throw new Error('corsProxyEndpoint must use HTTPS.');
  }

  const accessToken = await AuthService.getAccessToken();
  const serviceName = config.dataApiHostName.split('.')[0];

  return fetch(parsedProxyEndpoint, {
    ...requestInit,
    method: 'POST',
    headers: {
      ...requestInit?.headers,
      'Ocp-Apim-Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Service-Name': serviceName,
      'Ocp-Apim-Method': requestInit?.method || 'GET',
      'Ocp-Apim-Url': url,
    },
  });
}
