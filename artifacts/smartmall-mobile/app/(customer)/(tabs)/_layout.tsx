import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getAppDirection } from '@/src/i18n';

export default function TabLayout() {
  const { t, i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { direction },
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="malls" options={{ title: t('tabs.malls') }} />
      <Tabs.Screen name="offers" options={{ title: t('tabs.offers') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="sections" options={{ href: null }} />
    </Tabs>
  );
}