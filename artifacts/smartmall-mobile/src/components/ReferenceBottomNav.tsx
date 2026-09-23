import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/src/store/authStore';
import i18n from '@/src/i18n';

type NavIcon = keyof typeof Feather.glyphMap;

type ActiveTab = 'home' | 'malls' | 'offers' | 'orders' | 'profile' | 'search';

export function ReferenceBottomNav({
  activeTab = 'home',
  variant = 'scanner',
}: {
  activeTab?: ActiveTab | null;
  variant?: 'scanner' | 'offers';
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore((state) => state.status !== 'authenticated');
  const isAr = i18n.language.startsWith('ar');

  const scannerItems: Array<{ key: ActiveTab; icon: NavIcon; label: string; route: string }> = [
    { key: 'home', icon: 'home', label: t('tabs.home'), route: '/(customer)/(tabs)' },
    { key: 'malls', icon: 'grid', label: t('tabs.malls'), route: '/(customer)/(tabs)/malls' },
    { key: 'offers', icon: 'percent', label: t('tabs.offers'), route: '/(customer)/(tabs)/offers' },
    { key: 'profile', icon: 'user', label: t('tabs.profile'), route: '/(customer)/(tabs)/profile' },
  ];
  const offersItems: Array<{ key: ActiveTab; icon: NavIcon; label: string; route: string }> = [
    ...scannerItems.slice(0, 2),
    { key: 'offers', icon: 'tag', label: t('tabs.offers'), route: '/(customer)/(tabs)/offers' },
    { key: 'orders', icon: 'file-text', label: t('tabs.orders'), route: '/(customer)/(tabs)/orders' },
    scannerItems[3],
  ];
  const items = variant === 'offers' ? offersItems : scannerItems;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 9),
          ...(Platform.OS === 'web' ? {} : { direction: isAr ? 'rtl' : 'ltr' }),
        },
      ]}
    >
      {variant === 'scanner' ? (
        <>
          {items.slice(0, 2).map((item) => (
            <BottomNavItem
              key={item.key}
              item={item}
              colors={colors}
              onPress={() => router.push(item.route as never)}
              active={item.key === activeTab}
            />
          ))}
          <View style={styles.scannerSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.quick_scan')}
              onPress={() => router.push((isGuest ? '/(auth)/login' : '/(customer)/scanner') as never)}
              style={({ pressed }) => [
                styles.scannerButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <Feather name="maximize" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
          {items.slice(2).map((item) => (
            <BottomNavItem
              key={item.key}
              item={item}
              colors={colors}
              onPress={() => router.push(item.route as never)}
              active={item.key === activeTab}
            />
          ))}
        </>
      ) : (
        items.map((item) => (
          <BottomNavItem
            key={item.key}
            item={item}
            colors={colors}
            onPress={() => router.push(item.route as never)}
            active={item.key === activeTab}
          />
        ))
      )}
      <View style={[styles.homeIndicator, { backgroundColor: colors.border }]} />
    </View>
  );
}

function BottomNavItem({
  item,
  colors,
  onPress,
  active,
}: {
  item: { icon: NavIcon; label: string };
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Feather name={item.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.label, { color: active ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    zIndex: 100,
    minHeight: 72,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 9,
  },
  item: {
    minWidth: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingBottom: 1,
  },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  scannerSlot: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  scannerButton: {
    width: 50,
    height: 50,
    marginTop: -26,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 3,
    left: '50%',
    width: 128,
    height: 4,
    marginLeft: -64,
    borderRadius: 2,
  },
});