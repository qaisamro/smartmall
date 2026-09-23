import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CartButton } from '@/src/components/CartButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { ReferenceStatusBar } from '@/src/components/ReferenceStatusBar';
import { useOffers } from '@/src/features/catalog/useCatalogHooks';
import { getProductImageUrl, imageRequestHeaders, normalizeImageUrl } from '@/src/services/imageUrl';
import type { Offer } from '@/src/types/api';
import { formatCurrency } from '@/src/utils/currency';
import i18n from '@/src/i18n';

const categoryKeys = ['all', 'today', 'weekend', 'food', 'electronics'] as const;

export default function OffersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: offers, isLoading, isError, refetch } = useOffers();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoryLabels: Record<(typeof categoryKeys)[number], string> = {
    all: t('offers.all'),
    today: t('offers.today'),
    weekend: t('offers.weekend'),
    food: t('offers.food'),
    electronics: t('offers.electronics'),
  };

  const renderOffer = useCallback(
    ({ item: offer }: { item: Offer }) => {
      const imageUrl = normalizeImageUrl(offer.image) || (offer.product ? getProductImageUrl(offer.product) : null);
      const storeName = offer.mall
        ? (isAr ? offer.mall.name_ar || offer.mall.name_en : offer.mall.name_en || offer.mall.name_ar)
        : '';
      const detailsQuery = [
        imageUrl ? `offer_image=${encodeURIComponent(imageUrl)}` : '',
        storeName ? `store_name=${encodeURIComponent(storeName)}` : '',
      ]
        .filter(Boolean)
        .join('&');

      return (
        <Link
          href={`/(customer)/product/${offer.product_id}${detailsQuery ? `?${detailsQuery}` : ''}`}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            style={StyleSheet.flatten([styles.card, { backgroundColor: colors.card, borderColor: colors.border }])}
          >
            <View style={styles.imageWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl, headers: imageRequestHeaders }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
                  <Feather name="tag" size={30} color={colors.mutedForeground} />
                </View>
              )}
              <View style={[styles.offerBadge, { backgroundColor: offer.type ? '#e53935' : '#0f2942' }]}>
                <Text style={styles.offerBadgeText} numberOfLines={1}>{offer.type || t('offers.today')}</Text>
              </View>
              <View style={styles.specialBadge}>
                <Text style={styles.specialBadgeText}>{t('offers.live')}</Text>
              </View>
            </View>
            <View style={[styles.cardBody, { direction }]}>
              <Text style={styles.storeName} numberOfLines={1}>{offer.product?.name_ar ? (isAr ? 'SmartMall' : 'SmartMall') : t('offers.title')}</Text>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
                {isAr ? offer.title_ar : offer.title_en || offer.title_ar}
              </Text>
              <View style={[styles.priceRow, { direction }]}>
                <Text style={[styles.price, { color: '#e53935' }]}>{formatCurrency(offer.offer_price)}</Text>
                <View style={styles.addButton}>
                  <Feather name="plus" size={15} color="#fff" />
                </View>
              </View>
            </View>
          </Pressable>
        </Link>
      );
    },
    [colors, direction, isAr, t],
  );

  return (
    <View style={[styles.screen, { backgroundColor: '#f5f7fa' }]}>
      <FlatList
        data={offers ?? []}
        keyExtractor={(offer) => offer.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#f5f7fa' }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88, direction }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.statusBleed}>
              <ReferenceStatusBar />
            </View>
            <View style={[styles.topHeader, { direction }]}>
              <View style={styles.titleCopy}>
                <View style={[styles.titleRow, { direction }]}>
                  <Text style={styles.pageTitle}>{t('offers.page_title')}</Text>
                  <View style={styles.liveBadge}><Text style={styles.liveText}>{t('offers.live')}</Text></View>
                </View>
                <Text style={styles.pageTagline}>{t('offers.page_tagline')}</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('search.quick_all')} style={styles.roundAction}>
                  <Feather name="sliders" size={16} color="#334155" />
                </Pressable>
                <CartButton />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categoryKeys.map((key) => {
                const selected = selectedCategory === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedCategory(key)}
                    style={[styles.categoryChip, selected ? styles.categoryChipSelected : styles.categoryChipIdle]}
                  >
                    <Text style={[styles.categoryText, selected ? styles.categoryTextSelected : null]}>{categoryLabels[key]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.hero}>
              <View style={styles.heroOrb} />
              <View style={[styles.heroContent, { direction }]}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTag}>{t('offers.hero_tag')}</Text>
                  <Text style={styles.heroTitle}>{t('offers.hero_title')} <Text style={styles.heroPercent}>70%</Text></Text>
                  <Text style={styles.heroSubtitle}>{t('offers.hero_subtitle')}</Text>
                </View>
                <View style={styles.heroIconColumn}>
                  <View style={styles.heroIcon}><Feather name="percent" size={27} color="#ffb300" /></View>
                  <Text style={styles.heroEnding}>{t('offers.ending_soon')}</Text>
                </View>
              </View>
            </View>
            {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
            {isError ? (
              <View style={styles.state}>
                <Feather name="alert-circle" size={32} color={colors.destructive} />
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('error.network')}</Text>
                <Pressable onPress={() => void refetch()}><Text style={styles.retry}>{t('common.retry')}</Text></Pressable>
              </View>
            ) : null}
            {!isLoading && !isError && (!offers || offers.length === 0) ? (
              <View style={styles.state}>
                <Feather name="tag" size={32} color={colors.mutedForeground} />
                <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('offers.empty')}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={renderOffer}
      />
      <ReferenceBottomNav activeTab="offers" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 12, gap: 10 },
  header: { gap: 10 },
  statusBleed: { marginHorizontal: -12 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleCopy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pageTitle: { color: '#0f2942', fontFamily: 'Inter_800ExtraBold', fontSize: 21 },
  liveBadge: { backgroundColor: '#e53935', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  liveText: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 9 },
  pageTagline: { color: '#64748b', fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  categoryRow: { gap: 8, paddingBottom: 2 },
  categoryChip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  categoryChipSelected: { backgroundColor: '#0f2942', borderColor: '#0f2942' },
  categoryChipIdle: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  categoryText: { color: '#334155', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  categoryTextSelected: { color: '#fff', fontFamily: 'Inter_700Bold' },
  hero: { minHeight: 122, borderRadius: 16, overflow: 'hidden', backgroundColor: '#173e63', padding: 15, position: 'relative' },
  heroOrb: { position: 'absolute', width: 110, height: 110, borderRadius: 55, left: -28, bottom: -35, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroCopy: { flex: 1, gap: 4 },
  heroTag: { alignSelf: 'flex-start', color: '#0f2942', backgroundColor: '#ffb300', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
  heroTitle: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 16 },
  heroPercent: { color: '#ffb300', fontSize: 19 },
  heroSubtitle: { color: '#e2e8f0', fontFamily: 'Inter_500Medium', fontSize: 10 },
  heroIconColumn: { alignItems: 'center' },
  heroIcon: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroEnding: { color: '#cbd5e1', fontFamily: 'Inter_600SemiBold', fontSize: 9, marginTop: 4 },
  loader: { marginVertical: 20 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 55 },
  stateText: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
  retry: { color: '#2563eb', fontFamily: 'Inter_700Bold', fontSize: 13 },
  gridRow: { gap: 10, alignItems: 'stretch' },
  card: { flex: 1, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  imageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#f8fafc', position: 'relative' },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  offerBadge: { position: 'absolute', top: 8, right: 8, maxWidth: '70%', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  offerBadgeText: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 9 },
  specialBadge: { position: 'absolute', bottom: 7, right: 7, backgroundColor: '#ffb300', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  specialBadgeText: { color: '#c62828', fontFamily: 'Inter_800ExtraBold', fontSize: 8 },
  cardBody: { padding: 10, gap: 5, minHeight: 87 },
  storeName: { color: '#94a3b8', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 16, minHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 7, marginTop: 2 },
  price: { fontFamily: 'Inter_800ExtraBold', fontSize: 15 },
  addButton: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#0f2942', alignItems: 'center', justifyContent: 'center' },
});