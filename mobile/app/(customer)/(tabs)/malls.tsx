import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { normalizeImageUrl } from '@/src/services/imageUrl';
import { AppButton } from '@/src/components/AppButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { ReferenceStatusBar } from '@/src/components/ReferenceStatusBar';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { normalizeStoreType } from '@/src/types/storeTypes';

export default function MallsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: malls, isLoading, refetch, isRefetching, isError } = useMalls({
    search: debouncedQuery,
  });

  const getMallTypeLabel = (type: string) => {
    const normalizedType = normalizeStoreType(type);
    if (normalizedType) return t(`mall.type_${normalizedType}`);
    return type || null;
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding">
      <FlatList
        data={malls || []}
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
                  placeholder={t('search.search_malls')}
                  placeholderTextColor={colors.mutedForeground}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={t('search.search_malls')}
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

          </View>
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
                {query.length > 0 ? t('search.no_malls') : t('common.empty')}
              </Text>
            </View>
          )
        }
        renderItem={({ item: mall }) => {
          const imageUrl = normalizeImageUrl(mall.cover_image || mall.logo);
          const isFavorite = favoriteIds.includes(mall.id);
          const mallType = mall.type ? getMallTypeLabel(mall.type) : null;

          return (
            <Link href={`/(customer)/mall/${mall.slug}`} asChild>
              <Pressable
                accessibilityRole="button"
                style={StyleSheet.flatten([
                  styles.mallCard,
                  { backgroundColor: colors.card, borderColor: colors.border, direction },
                ])}
              >
                <View style={styles.mallImageWrap}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.mallImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.mallImage, styles.mallPlaceholder, { backgroundColor: colors.muted }]}>
                      <Feather name="shopping-bag" size={42} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={styles.imageShade} />
                  <View style={styles.imageTopRow}>
                    <View style={[styles.openBadge, { backgroundColor: mall.is_active ? '#10b981' : '#d97706' }]}>
                      <View style={styles.openDot} />
                      <Text style={styles.openBadgeText}>
                        {mall.is_active ? t('mall.open_now') : t('mall.type_mall')}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isFavorite ? t('common.remove') : t('common.add')}
                      onPress={() =>
                        setFavoriteIds((current) =>
                          current.includes(mall.id) ? current.filter((id) => id !== mall.id) : [...current, mall.id],
                        )
                      }
                      style={styles.favoriteButton}
                    >
                      <Feather name={isFavorite ? 'heart' : 'heart'} size={16} color={isFavorite ? '#e11d48' : '#64748b'} />
                    </Pressable>
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
                      <Text style={styles.visitText}>{mallType === t('mall.type_supermarket') ? t('mall.shop_now') : t('mall.visit_mall')}</Text>
                      <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={14} color="#fff" />
                    </View>
                    <View style={[styles.mapButton, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Feather name="map" size={16} color={colors.foreground} />
                    </View>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
      <ReferenceBottomNav activeTab="malls" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, gap: 14 },
  header: { gap: 12 },
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
  mallCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  mallImageWrap: { height: 192, backgroundColor: '#e2e8f0', position: 'relative' },
  mallImage: { width: '100%', height: '100%' },
  mallPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  imageTopRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  openBadgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 11 },
  favoriteButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  imageBottomRow: { position: 'absolute', bottom: 10, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  imageDescription: { flex: 1, color: '#fff', backgroundColor: 'rgba(15,41,66,0.65)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.92)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ratingText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 11 },
  mallContent: { padding: 16, gap: 12 },
  mallTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  mallTitleCopy: { flex: 1 },
  mallTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  mallDesc: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11 },
  typeBadge: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5 },
  typeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  mallMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 11, gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  featureText: { color: '#94a3b8', fontFamily: 'Inter_500Medium', fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitButton: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  visitText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 11 },
  mapButton: { width: 42, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  centerContainer: { padding: 40, alignItems: 'center', gap: 16 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
});