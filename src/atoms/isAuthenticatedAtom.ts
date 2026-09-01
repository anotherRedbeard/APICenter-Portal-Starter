import { atom } from 'recoil';
import { appServicesAtom } from '@/atoms/appServicesAtom';
import { configAtom } from '@/atoms/configAtom';
import { refreshApiCenterAccess } from '@/services/ApiCenterAccessService';
import { Config } from '@/types/config';
import { IAuthService } from '@/types/services/IAuthService';

export const isAuthenticatedAtom = atom<boolean>({
  key: 'isAuthenticated',
  default: false,
  effects: [
    ({ setSelf, getLoadable }): void => {
      const tryResolve = (): void => {
        const services = getLoadable(appServicesAtom).contents as { AuthService?: IAuthService } | undefined;
        const auth = services?.AuthService;
        if (!auth) {
          // Retry on next tick until services are initialized
          setTimeout(tryResolve);
          return;
        }

        auth
          .isAuthenticated()
          .then(async (isAuthenticated) => {
            if (!isAuthenticated) {
              setSelf(false);
              return;
            }

            const config = getLoadable(configAtom).contents as Config;
            await refreshApiCenterAccess(auth, config);
            setSelf(true);
          })
          .catch(() => setSelf(false));
      };

      setTimeout(tryResolve);
    },
  ],
});
