import { atom } from 'recoil';

const STORAGE_KEY = 'apiCenterPortal.authorizedApiCenterIds.v2';

export const accessibleApiCenterIdsAtom = atom<string[]>({
  key: 'accessibleApiCenterIds',
  default: [],
  effects: [
    ({ setSelf, onSet }): void => {
      const savedIds = window.sessionStorage.getItem(STORAGE_KEY);
      if (savedIds) {
        try {
          const parsedIds: unknown = JSON.parse(savedIds);
          if (Array.isArray(parsedIds) && parsedIds.every((id) => typeof id === 'string')) {
            setSelf(parsedIds);
          }
        } catch (error) {
          console.warn('Ignoring invalid cached API Center access state.', error);
        }
      }

      onSet((ids): void => {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      });
    },
  ],
});
