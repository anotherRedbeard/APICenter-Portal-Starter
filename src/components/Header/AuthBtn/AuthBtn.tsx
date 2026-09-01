import React, { useCallback } from 'react';
import { Button } from '@fluentui/react-components';
import { useRecoilState, useRecoilValue } from 'recoil';
import { accessibleApiCenterIdsAtom } from '@/atoms/accessibleApiCenterIdsAtom';
import { configAtom } from '@/atoms/configAtom';
import { isAuthenticatedAtom } from '@/atoms/isAuthenticatedAtom';
import { isAnonymousAccessEnabledAtom } from '@/atoms/isAnonymousAccessEnabledAtom';
import { useAuthService } from '@/hooks/useAuthService';
import { refreshApiCenterAccess } from '@/services/ApiCenterAccessService';
import styles from './AuthBtn.module.scss';

export const AuthBtn: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useRecoilState(isAuthenticatedAtom);
  const [, setAccessibleApiCenterIds] = useRecoilState(accessibleApiCenterIdsAtom);
  const config = useRecoilValue(configAtom);
  const isAnonymousAccessEnabled = useRecoilValue(isAnonymousAccessEnabledAtom);
  const AuthService = useAuthService();

  const handleClick = useCallback(async () => {
    if (isAuthenticated) {
      await AuthService.signOut();
      setAccessibleApiCenterIds([]);
      setIsAuthenticated(false);
      // Refresh the URL to the original state
      window.location.href = window.location.origin;
      return;
    }

    await AuthService.signIn();
    await refreshApiCenterAccess(AuthService, config);
    setIsAuthenticated(true);
  }, [AuthService, config, isAuthenticated, setAccessibleApiCenterIds, setIsAuthenticated]);

  // Hide sign in button when anonymous access is enabled
  if (isAnonymousAccessEnabled) {
    return null;
  }

  return (
    <Button className={styles.authBtn} appearance="primary" onClick={handleClick}>
      {isAuthenticated ? 'Sign out' : 'Sign in'}
    </Button>
  );
};

export default React.memo(AuthBtn);
