import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { MallMap } from '@/src/components/MallMap';

export default function MallMapScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { latitude: latitudeParam, longitude: longitudeParam, name: nameParam, location: locationParam } =
    useLocalSearchParams<{
      latitude?: string;
      longitude?: string;
      name?: string;
      location?: string;
    }>();
  const latitude = Number(latitudeParam);
  const longitude = Number(longitudeParam);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const mallName = nameParam || t('mall.page_title');
  const mallLocation = locationParam || '';

  if (!hasCoordinates) {
    return (
      <View style={[styles.errorScreen, { backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-right" size={20} color={colors.foreground} />
        </Pressable>
        <Feather name="map-pin" size={46} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          {t('mall.map_location_unavailable_title')}
        </Text>
        <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
          {t('mall.map_location_unavailable_message')}
        </Text>
        <AppButton label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MallMap latitude={latitude} longitude={longitude} mallName={mallName} mallLocation={mallLocation} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-right" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.titleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {mallName}
          </Text>
          {mallLocation ? (
            <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>
              {mallLocation}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  errorMessage: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  header: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCard: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 14, textAlign: 'right' },
  location: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2, textAlign: 'right' },
});