import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getAppDirection } from '@/src/i18n';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';

const HOME_ROUTE = '/(customer)/(tabs)';

export function AuthScreenHeader({ showBack = false }: { showBack?: boolean }) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const direction = getAppDirection(i18n.language);
  const isAr = direction === 'rtl';

  return (
    <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 8 }]}>
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: colors.foreground }]}>9:41</Text>
        <View style={styles.statusIcons}>
          <Feather name="wifi" size={12} color={colors.foreground} />
          <Feather name="activity" size={12} color={colors.foreground} />
          <Feather name="battery" size={14} color={colors.foreground} />
        </View>
      </View>
      <View style={styles.navigationRow}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.back')}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.muted, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Feather name={isAr ? 'chevron-left' : 'chevron-right'} size={19} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.continue_as_guest')}
          onPress={() => router.replace(HOME_ROUTE)}
          style={({ pressed }) => [
            styles.guestPill,
            { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Text style={[styles.guestPillText, { color: colors.mutedForeground }]}>
            {t('auth.continue_as_guest')}
          </Text>
          <Feather name="x" size={13} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export function GuestNavigationBar() {
  return <ReferenceBottomNav activeTab="profile" />;
}

export function HomeIndicator() {
  const colors = useColors();
  return (
    <View style={[styles.homeIndicatorArea, { backgroundColor: colors.card }]}>
      <View style={[styles.homeIndicator, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navigationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backSpacer: { width: 40, height: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  guestPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  navigationItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: 42,
  },
  navigationLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
  },
  homeIndicatorArea: {
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 8,
  },
  homeIndicator: {
    width: 128,
    height: 4,
    borderRadius: 2,
  },
});