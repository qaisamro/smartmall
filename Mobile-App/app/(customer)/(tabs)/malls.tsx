import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { useHomeBanners } from '@/src/features/catalog/useCatalogHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getMallImageUrls, imageRequestHeaders, normalizeImageUrl } from '@/src/services/imageUrl';
import { AppButton } from '@/src/components/AppButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { ReferenceStatusBar } from '@/src/components/ReferenceStatusBar';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Location from 'expo-location';
import { resolveStoreType } from '@/src/types/storeTypes';
import type { HomeBanner, Mall } from '@/src/types/api';

type StoreFilter = 'all' | 'mall' | 'supermarket' | 'butcher' | 'grocery';
type UserCoordinates = { latitude: number; longitude: number };

function parseStoreFilter(value: string | string[] | undefined): StoreFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'mall' || candidate === 'supermarket' || candidate === 'butcher' || candidate === 'grocery') {
    return candidate;
  }
  return 'all';
}

function getMallCoordinates(mall: Mall): UserCoordinates | null {
  const latitudeValue = mall.latitude;
  const longitudeValue = mall.longitude;
  if (
    latitudeValue === null ||
    latitudeValue === undefined ||
    longitudeValue === null ||
    longitudeValue === undefined ||
    (typeof latitudeValue === 'string' && latitudeValue.trim() === '') ||
    (typeof longitudeValue === 'string' && longitudeValue.trim() === '')
  ) {
    return null;
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

function getDistanceInKilometers(from: UserCoordinates, to: UserCoordinates): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(fromLatitude) * Math.cos(toLatitude);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default function MallsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const requestedFilter = parseStoreFilter(type);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<StoreFilter>(requestedFilter);
  const [userCoordinates, setUserCoordinates] = useState<UserCoordinates | null>(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setSelectedFilter(requestedFilter);
  }, [requestedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: malls, isLoading, refetch, isRefetching, isError } = useMalls({
    search: debouncedQuery,
  });
  const bottomBannersQuery = useHomeBanners('bottom');
  const topBannersQuery = useHomeBanners('top');
  const bottomBanners = bottomBannersQuery.data ?? [];
  const categoryBanner = bottomBanners[0] ?? topBannersQuery.data?.[0];
  const filterOptions: Array<{ key: StoreFilter; label: string }> = [
    { key: 'all', label: t('mall.filter_all') },
    { key: 'mall', label: t('mall.filter_malls') },
    { key: 'supermarket', label: t('mall.filter_supermarkets') },
    { key: 'butcher', label: t('mall.filter_butchers') },
    { key: 'grocery', label: t('mall.filter_grocery') },
  ];
  const filteredMalls = useMemo(() => {
    const matchingMalls = (malls || []).filter((mall) => {
      if (selectedFilter === 'all') return true;
      return resolveStoreType(mall.type, mall.description_en) === selectedFilter;
    });

    if (!nearbyEnabled || !userCoordinates) return matchingMalls;

    return matchingMalls
      .map((mall, index) => {
        const mallCoordinates = getMallCoordinates(mall);
        return {
          mall,
          index,
          distance: mallCoordinates ? getDistanceInKilometers(userCoordinates, mallCoordinates) : null,
        };
      })
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return a.index - b.index;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      })
      .map(({ mall }) => mall);
  }, [malls, nearbyEnabled, selectedFilter, userCoordinates]);

  const mallsWithCoordinates = useMemo(
    () => (malls || []).filter((mall) => getMallCoordinates(mall) !== null).length,
    [malls],
  );

  const handleNearbyPress = useCallback(async () => {
    if (nearbyEnabled) {
      setNearbyEnabled(false);
      setUserCoordinates(null);
      return;
    }

    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(t('mall.location_permission_title'), t('mall.location_permission_message'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (mallsWithCoordinates === 0) {
        Alert.alert(t('mall.location_data_unavailable_title'), t('mall.location_data_unavailable_message'));
        return;
      }

      setUserCoordinates(coordinates);
      setNearbyEnabled(true);
    } catch {
      Alert.alert(t('mall.location_error_title'), t('mall.location_error_message'));
    } finally {
      setIsLocating(false);
    }
  }, [mallsWithCoordinates, nearbyEnabled, t]);
  const getMallTypeLabel = (type: string, description?: string | null) => {
    const normalizedType = resolveStoreType(type, description);
    if (normalizedType) return t(`mall.type_${normalizedType}`);
    return type || null;
  };

  const openMallMap = (mall: Mall) => {
    const coordinates = getMallCoordinates(mall);
    if (!coordinates) {
      Alert.alert(t('mall.map_location_unavailable_title'), t('mall.map_location_unavailable_message'));
      return;
    }

    const mallName = isAr ? mall.name_ar : mall.name_en || mall.name_ar;
    router.push({
      pathname: '/(customer)/mall-map',
      params: {
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude),
        name: mallName,
        location: isAr ? mall.location_arabic || '' : mall.location_en || mall.location_arabic || '',
      },
    });
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
      <FlatList
        data={filteredMalls}
        numColumns={2}
        columnWrapperStyle={[styles.mallRow, { direction }]}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 88, direction }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.header, { direction }]}>
            <View style={styles.statusBleed}>
              <ReferenceStatusBar />
            </View>
            <View style={[styles.identityRow, { direction }]}>
              <View style={[styles.identity, { direction }]}>
                <View style={[styles.identityIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="columns" size={21} color={colors.primaryForeground} />
                </View>
                <View style={styles.identityCopy}>
                  <Text style={[styles.pageTitle, { color: '#0f2942', textAlign: isAr ? 'right' : 'left' }]}>
                    {t('mall.page_title')}
                  </Text>
                  <View style={[styles.locationRow, { direction }]}>
                    <Feather name="map-pin" size={13} color={colors.primary} />
                    <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{t('mall.location_summary')}</Text>
                    <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.searchRow, { direction }]}>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, direction }]}>
                <Feather name="search" size={19} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                  placeholder={t('mall.search_stores')}
                  placeholderTextColor={colors.mutedForeground}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={t('mall.search_stores')}
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
                    <Feather name="x-circle" size={18} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('search.barcode_search')}
                onPress={Keyboard.dismiss}
                style={[styles.scanButton, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }]}
              >
                <Feather name="maximize" size={19} color={colors.primary} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterList, { direction }]}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: nearbyEnabled, busy: isLocating }}
                accessibilityLabel={t('mall.nearest_me')}
                disabled={isLocating}
                onPress={() => void handleNearbyPress()}
                style={[
                  styles.nearbyChip,
                  {
                    backgroundColor: nearbyEnabled ? colors.success : colors.card,
                    borderColor: nearbyEnabled ? colors.success : colors.border,
                    opacity: isLocating ? 0.65 : 1,
                  },
                ]}
              >
                <Feather name="map-pin" size={14} color={nearbyEnabled ? '#fff' : colors.primary} />
                <Text style={[styles.nearbyChipText, { color: nearbyEnabled ? '#fff' : colors.foreground }]}>
                  {isLocating
                    ? t('mall.locating')
                    : nearbyEnabled
                      ? t('mall.nearest_me_enabled')
                      : t('mall.nearest_me')}
                </Text>
              </Pressable>
              {filterOptions.map((filter) => {
                const isSelected = selectedFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListFooterComponent={
          <StoreCategoryBottomBanner
            banner={categoryBanner}
            colors={colors}
            isAr={isAr}
            label={t('mall.bottom_banner_label')}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <Feather name="alert-triangle" size={42} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
              <AppButton label={t('common.retry')} onPress={refetch} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {selectedFilter !== 'all'
                    ? t('mall.no_stores_in_category')
                    : query.length > 0
                      ? t('search.no_malls')
                      : t('common.empty')}
              </Text>
            </View>
          )
        }
        renderItem={({ item: mall }) => {
          const mallType = mall.type ? getMallTypeLabel(mall.type, mall.description_en) : null;

          return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/(customer)/mall/${mall.slug}` as never)}
                style={StyleSheet.flatten([
                  styles.mallCard,
                  { backgroundColor: colors.card, borderColor: colors.border, direction },
                ])}
              >
                <View style={styles.mallImageWrap}>
                  <MallListImage mall={mall} />
                  <View style={styles.imageShade} />
                  <View style={styles.imageTopRow}>
                    <View style={[styles.openBadge, { backgroundColor: mall.is_active ? '#10b981' : '#d97706' }]}>
                      <View style={styles.openDot} />
                      <Text style={styles.openBadgeText}>
                        {mall.is_active ? t('mall.open_now') : t('mall.type_mall')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.imageBottomRow}>
                    <Text style={styles.imageDescription} numberOfLines={1}>
                      {mallType || t('mall.page_title')}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>4.9</Text>
                      <Feather name="star" size={11} color="#fff" />
                    </View>
                  </View>
                </View>
                <View style={[styles.mallContent, { direction }]}>
                  <View style={styles.mallTitleRow}>
                    <View style={styles.mallTitleCopy}>
                      <Text style={[styles.mallTitle, { color: '#0f2942', textAlign: isAr ? 'right' : 'left' }]} numberOfLines={1}>
                        {isAr ? mall.name_ar : mall.name_en || mall.name_ar}
                      </Text>
                      <View style={[styles.addressRow, { direction }]}>
                        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.mallDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {isAr
                            ? mall.location_arabic || mall.description_ar || t('mall.location_summary')
                            : mall.location_en || mall.location_arabic || mall.description_en || t('mall.location_summary')}
                        </Text>
                      </View>
                    </View>
                    {mallType ? (
                      <View style={[styles.typeBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{mallType}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.mallMetaRow, { direction }]}>
                    <View style={[styles.timeRow, { direction }]}>
                      <Feather name="clock" size={15} color={colors.mutedForeground} />
                      <Text style={[styles.timeText, { color: colors.foreground }]}>
                        {mall.open_time && mall.close_time ? `${mall.open_time} - ${mall.close_time}` : t('mall.open_now')}
                      </Text>
                    </View>
                    <Text style={styles.featureText}>{mallType || t('mall.categories')}</Text>
                  </View>
                  <View style={[styles.cardActions, { direction }]}>
                    <View style={[styles.visitButton, { backgroundColor: '#0f2942' }]}>
                      <Text style={styles.visitText}>{t('mall.shop_now')}</Text>
                      <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={14} color="#fff" />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('mall.view_on_map')}
                      onPress={(event) => {
                        event.stopPropagation();
                        openMallMap(mall);
                      }}
                      style={[styles.mapButton, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    >
                      <Feather name="map" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
          );
        }}
      />
      <ReferenceBottomNav activeTab="malls" />
    </KeyboardAvoidingView>
  );
}

function StoreCategoryBottomBanner({
  banner,
  colors,
  isAr,
  label,
}: {
  banner?: HomeBanner;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
  label: string;
}) {
  if (!banner) return null;

  const imageUrl = normalizeImageUrl(banner.image_url || banner.image);
  const title = isAr ? banner.title_ar || banner.title_en : banner.title_en || banner.title_ar;
  const body = isAr ? banner.body_ar || banner.body_en : banner.body_en || banner.body_ar;
  const badge = isAr ? banner.badge_ar || banner.badge_en : banner.badge_en || banner.badge_ar;
  const cta = isAr ? banner.cta_label_ar || banner.cta_label_en : banner.cta_label_en || banner.cta_label_ar;

  const openBanner = () => {
    if (!banner.link_url || banner.link_type === 'none') return;
    if (banner.link_type === 'external') {
      void Linking.openURL(banner.link_url);
      return;
    }
    router.push(banner.link_url as never);
  };

  return (
    <Pressable
      accessibilityRole={banner.link_url ? 'button' : 'none'}
      accessibilityLabel={`${title || ''}${cta ? `، ${cta}` : ''}`}
      onPress={openBanner}
      style={[styles.bottomBanner, { backgroundColor: colors.primary }]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl, headers: imageRequestHeaders }}
          style={styles.bottomBannerImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          contentPosition={
            banner.image_position === 'left'
              ? 'left'
              : banner.image_position === 'right'
                ? 'right'
                : 'center'
          }
        />
      ) : null}
      <View style={[styles.bottomBannerShade, { backgroundColor: colors.primary }]} />
      <View style={[styles.bottomBannerContent, { direction: isAr ? 'rtl' : 'ltr' }]}>
        <View style={styles.bottomBannerTopline}>
          <View style={[styles.bottomBannerLabel, { backgroundColor: colors.primarySoft }]}>
            <Feather name="zap" size={11} color={colors.warning} />
            <Text style={[styles.bottomBannerLabelText, { color: colors.onImageMuted }]}>{badge || label}</Text>
          </View>
          <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={16} color={colors.onImageMuted} />
        </View>
        <Text style={[styles.bottomBannerTitle, { color: colors.onImage }]} numberOfLines={2}>{title}</Text>
        {body ? <Text style={[styles.bottomBannerBody, { color: colors.onImageMuted }]} numberOfLines={2}>{body}</Text> : null}
        {cta ? (
          <View style={[styles.bottomBannerCta, { backgroundColor: colors.card }]}>
            <Text style={[styles.bottomBannerCtaText, { color: colors.primary }]}>{cta}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function MallListImage({ mall }: { mall: { cover_image: string | null; logo: string | null } }) {
  const colors = useColors();
  const imageUrls = getMallImageUrls(mall.cover_image, mall.logo);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const imageUrl = imageUrls.find((url) => !failedUrls.includes(url)) ?? null;

  return imageUrl ? (
    <Image
      source={{ uri: imageUrl, headers: imageRequestHeaders }}
      style={styles.mallImage}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() =>
        setFailedUrls((current) => (current.includes(imageUrl) ? current : [...current, imageUrl]))
      }
    />
  ) : (
    <View style={[styles.mallImage, styles.mallPlaceholder, { backgroundColor: colors.muted }]}>
      <Feather name="shopping-bag" size={42} color={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, gap: 14 },
  header: { gap: 12 },
  bottomBanner: { minHeight: 178, borderRadius: 24, overflow: 'hidden', position: 'relative', marginTop: 6 },
  bottomBannerImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bottomBannerShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.64 },
  bottomBannerContent: { padding: 18, gap: 6, zIndex: 1 },
  bottomBannerTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomBannerLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  bottomBannerLabelText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  bottomBannerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 21, lineHeight: 27, maxWidth: '90%' },
  bottomBannerBody: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, maxWidth: '88%' },
  bottomBannerCta: { alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7, marginTop: 3 },
  bottomBannerCtaText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  filterList: { gap: 8, paddingRight: 4 },
  filterChip: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  nearbyChip: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  nearbyChipText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  statusBleed: { marginHorizontal: -16 },
  identityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 21, lineHeight: 27 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontFamily: 'Inter_500Medium', fontSize: 11, flexShrink: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Inter_500Medium', fontSize: 14 },
  scanButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mallRow: { gap: 10, alignItems: 'stretch' },
  mallCard: { flex: 1, minWidth: 0, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  mallImageWrap: { height: 124, backgroundColor: '#e2e8f0', position: 'relative' },
  mallImage: { width: '100%', height: '100%' },
  mallPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  imageTopRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 14 },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  openBadgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  imageBottomRow: { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  imageDescription: { flex: 1, color: '#fff', backgroundColor: 'rgba(15,41,66,0.65)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(245,158,11,0.92)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  ratingText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  mallContent: { padding: 11, gap: 9 },
  mallTitleRow: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  mallTitleCopy: { flex: 1 },
  mallTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 19 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  mallDesc: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  typeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  mallMetaRow: { flexDirection: 'column', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 9, gap: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  featureText: { color: '#94a3b8', fontFamily: 'Inter_500Medium', fontSize: 9 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  visitButton: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  visitText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  mapButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  centerContainer: { padding: 40, alignItems: 'center', gap: 16 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
});
