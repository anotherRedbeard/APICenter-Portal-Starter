import React from 'react';
import { Dropdown, Link, Option, Text, Tooltip, ToggleButton } from '@fluentui/react-components';
import { WeatherMoonRegular, WeatherSunnyRegular } from '@fluentui/react-icons';
import { useRecoilState, useRecoilValue } from 'recoil';
import LogoSvg from '@/assets/logo.svg';
import AuthBtn from '@/components/Header/AuthBtn';
import { LocationsService } from '@/services/LocationsService';
import { accessibleApiCenterIdsAtom } from '@/atoms/accessibleApiCenterIdsAtom';
import { configAtom } from '@/atoms/configAtom';
import { saveSelectedApiCenter } from '@/config/apiCenterSelection';
import { isAnonymousAccessEnabledAtom } from '@/atoms/isAnonymousAccessEnabledAtom';
import { isDarkModeAtom } from '@/atoms/isDarkModeAtom';
import styles from './Header.module.scss';

const Header: React.FC = () => {
  const config = useRecoilValue(configAtom);
  const accessibleApiCenterIds = useRecoilValue(accessibleApiCenterIdsAtom);
  const isAnonymousAccessEnabled = useRecoilValue(isAnonymousAccessEnabledAtom);
  const [isDarkMode, setIsDarkMode] = useRecoilState(isDarkModeAtom);
  const configuredApiCenters = config.apiCenters ?? [];
  const selectedApiCenter = configuredApiCenters.find(
    (apiCenter) => apiCenter.dataApiHostName === config.dataApiHostName
  );

  const handleApiCenterSelect = React.useCallback<React.ComponentProps<typeof Dropdown>['onOptionSelect']>(
    (_, data) => {
      const apiCenterId = data.optionValue ?? data.selectedOptions[0];
      if (!apiCenterId || apiCenterId === selectedApiCenter?.id) return;

      saveSelectedApiCenter(apiCenterId);
      window.location.href = LocationsService.getHomeUrl();
    },
    [selectedApiCenter?.id]
  );

  return (
    <header className={styles.header}>
      <Link href={LocationsService.getHomeUrl()} className={styles.logo}>
        <img src={LogoSvg} alt={config.title} />
        <Text size={400} weight="semibold">
          {config.title}
        </Text>
      </Link>
      <nav className={styles.navLinks}>
        <Link appearance="subtle" href={LocationsService.getHomeUrl()}>
          APIs
        </Link>

        <Link appearance="subtle" href={LocationsService.getHelpUrl()} target="_blank" rel="noopener noreferrer">
          Help
        </Link>
      </nav>

      <div className={styles.actions}>
        {configuredApiCenters.length > 1 && (
          <div className={styles.apiCenterPicker}>
            <Text size={200}>API Center</Text>
            <Dropdown
              aria-label="API Center"
              className={styles.apiCenterSelect}
              size="small"
              value={selectedApiCenter?.title}
              selectedOptions={selectedApiCenter ? [selectedApiCenter.id] : []}
              onOptionSelect={handleApiCenterSelect}
            >
              {configuredApiCenters.map((apiCenter) => {
                const hasAccess = accessibleApiCenterIds.includes(apiCenter.id);
                const optionText = `${apiCenter.title}${hasAccess ? '' : ' (no access)'}`;

                return (
                  <Option key={apiCenter.id} disabled={!hasAccess} text={optionText} value={apiCenter.id}>
                    {optionText}
                  </Option>
                );
              })}
            </Dropdown>
          </div>
        )}

        <Tooltip content={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} relationship="label">
          <ToggleButton
            checked={isDarkMode}
            appearance="subtle"
            icon={isDarkMode ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
            size="small"
            onClick={() => setIsDarkMode(!isDarkMode)}
          />
        </Tooltip>

        {!isAnonymousAccessEnabled && (
          <div className={styles.auth}>
            <AuthBtn />
          </div>
        )}
      </div>
    </header>
  );
};

export default React.memo(Header);
