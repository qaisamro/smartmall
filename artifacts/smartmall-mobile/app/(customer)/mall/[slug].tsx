import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { CartButton } from '@/src/components/CartButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { useMallBySlug, useMallSections } from '@/src/features/malls/useMallsHooks';
import { useProducts } from '@/src/features/catalog/useCatalogHooks';
import i18n from '@/src/i18n';
import { getMallImageUrls, getProductImageUrl, imageRequestHeaders } from '@/src/services/imageUrl';
import { useAuthStore } from '@/src/store/authStore';
import { useCartStore } from '@/src/store/cartStore';
import type { Product } from '@/src/types/api';
import { resolveStoreType } from '@/src/types/storeTypes';
import { formatProductAmount, formatProductPrice, getProductMetadata } from '@/src/utils/productPresentation';

interface SectionFilter {
  id: number;
  name_ar: string;
  name_en: string;
  depth: number;
}

export default function MallDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const addItem = useCartStore((state) => state.addItem);

  const { data: mall, isLoading: isLoadingMall, isError: isErrorMall, refetch: refetchMall } = useMallBySlug(slug!);
  const [selectedSection, setSelectedSection] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: sectionsData, isError: isErrorSections } = useMallSections(mall?.id as number);
  const sectionFilters = useMemo<SectionFilter[]>(() => {
    const sections = sectionsData?.sections ?? [];
    const filters: SectionFilter[] = [];

    for (const section of sections) {
      if ((section.product_count ?? 0) > 0) {
        filters.push({
          id: section.id,
          name_ar: section.name_ar,
          name_en: section.name_en || section.name_ar,
          depth: 0,
        });
      }

      for (const child of section.children ?? []) {
        if ((child.product_count ?? 0) > 0) {
          filters.push({
            id: child.id,
            name_ar: child.name_ar,
            name_en: child.name_en || child.name_ar,
            depth: 1,
          });
        }
      }
    }

    return filters;
  }, [sectionsData]);

  const [sectionSelectionReady, setSectionSelectionReady] = useState(false);
  useEffect(() => {
    if (!sectionsData && !isErrorSections) return;

    setSelectedSection((current) => current ?? sectionFilters[0]?.id);
    setSectionSelectionReady(true);
  }, [isErrorSections, sectionFilters, sectionsData]);

  const productsQueryEnabled =
    sectionSelectionReady && (!!mall?.id) && (sectionsData !== undefined || isErrorSections);
  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useProducts(mall?.id as number, {
    mall_section_id: selectedSection,
    search: debouncedSearchQuery,
  }, { enabled: productsQueryEnabled });

  const products = useMemo(
    () => productsData?.pages.flatMap((page) => page.data) ?? [],
    [productsData],
  );
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      const productMetadata = getProductMetadata(product);
      addItem({
        productId: product.id,
        mallId: product.mall_id,
        name: isAr ? product.name_ar : product.name_en || product.name_ar,
        unitPrice: Number(product.current_price),
        quantity: 1,
        imageUrl: getProductImageUrl(product) ?? undefined,
        unit: product.unit,
        unitType: productMetadata.unit_type,
        pricingType: productMetadata.pricing_type,
        weight: productMetadata.weight == null ? null : Number(productMetadata.weight),
        options: productMetadata.options,
      });
      Alert.alert(t('cart.added_title'), t('cart.added_message'));
    },
    [addItem, isAr, t],
  );

  const renderProduct = useCallback(
    ({ item: product }: { item: Product }) => {
      const imageUrl = getProductImageUrl(product);
      const productName = isAr ? product.name_ar : product.name_en || product.name_ar;
      const hasDiscount = Number(product.price) > Number(product.current_price);
      const discountRate =
        hasDiscount && Number(product.price) > 0
          ? Math.round((1 - Number(product.current_price) / Number(product.price)) * 100)
          : 0;

      return (
        <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={productName}
            onPress={() => router.push(`/(customer)/product/${product.id}`)}
            style={({ pressed }) => [styles.productMain, { opacity: pressed ? 0.88 : 1 }]}
          >
            <View style={[styles.productImageFrame, { backgroundColor: colors.secondary }]}>
              <View style={[styles.productImageInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" />
                ) : (
                  <Feather name="image" size={42} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.productImageBadgeRow}>
                {mall?.enable_quantity_system ? (
                  <View
                    style={[
                      styles.availabilityBadge,
                      { backgroundColor: product.is_active ? colors.success : colors.destructive },
                    ]}
                  >
                    <View style={styles.availabilityDot} />
                    <Text style={styles.availabilityText}>
                      {product.is_active ? t('product.in_stock') : t('product.out_of_stock')}
                    </Text>
                  </View>
                ) : null}
                {discountRate > 0 ? (
                  <View style={[styles.discountBadge, { backgroundColor: colors.warningBackground }]}>
                    <Feather name="tag" size={10} color={colors.warning} />
                    <Text style={[styles.discountText, { color: colors.warning }]}>
                      {t('home.offer_badge')} {discountRate}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.productInfo}>
              <View style={styles.productLabelRow}>
                <Text
                  style={[styles.productName, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {productName}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={[styles.productFooter, { borderTopColor: colors.border }]}>
            <View style={styles.priceGroup}>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                {formatProductPrice(product, isAr)}
              </Text>
              {hasDiscount ? (
                <Text style={[styles.productOriginalPrice, { color: colors.mutedForeground }]}>
                  {formatProductAmount(product, product.price, isAr)}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('scanner.add_to_cart')}
              onPress={() => handleAddToCart(product)}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather
                name="plus"
                size={19}
                color={colors.primaryForeground}
              />
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, handleAddToCart, isAr, mall?.enable_quantity_system, t],
  );

  if (isErrorMall) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-triangle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
        <AppButton label={t('common.retry')} onPress={refetchMall} />
        <ReferenceBottomNav activeTab="malls" />
      </View>
    );
  }

  if (isLoadingMall || !mall) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <ReferenceBottomNav activeTab="malls" />
      </View>
    );
  }

  const coverUrl = getMallImageUrls(mall.cover_image, mall.logo)[0] ?? null;
  const storeType = resolveStoreType(mall.type, mall.description_en) ?? 'mall';
  const storeTypeLabel = {
    mall: t('mall.type_mall'),
    supermarket: t('mall.type_supermarket'),
    grocery: t('mall.type_grocery'),
    butcher: t('mall.type_butcher'),
  }[storeType];
  const renderSectionChip = (item: SectionFilter) => {
    const selected = selectedSection === item.id;
    return (
      <Pressable
        key={item.id}
        onPress={() => setSelectedSection(item.id)}
        style={[styles.sectionChip, { backgroundColor: selected ? colors.primary : colors.card }]}
      >
        <Text style={[styles.sectionChipText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
          {item.depth === 1 ? `› ` : ''}
          {isAr ? item.name_ar : item.name_en}
        </Text>
      </Pressable>
    );
  };
  const listHeader = (
    <View style={styles.listHeader}>
      <View style={[styles.mallHero, { backgroundColor: colors.primary }]}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl, headers: imageRequestHeaders }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <LinearGradient
          colors={['rgba(2,6,23,0.3)', 'rgba(2,6,23,0.55)', 'rgba(2,6,23,0.96)']}
          locations={[0, 0.45, 1]}
          style={styles.heroShade}
        />
        <View style={styles.heroControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.heroBackButton}
          >
            <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={22} color={colors.onImage} />
          </Pressable>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
            <View style={styles.heroTitleCopy}>
              <Text
                style={[styles.mallTitle, { color: colors.onImage, textAlign: isAr ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {isAr ? mall.name_ar : mall.name_en || mall.name_ar}
              </Text>
              <View style={styles.storeTypeRow}>
                <Feather name="shopping-bag" size={12} color={colors.onImageMuted} />
                <Text style={[styles.storeTypeText, { color: colors.onImageMuted }]}>{storeTypeLabel}</Text>
              </View>
              {mall.open_time && mall.close_time ? (
                <View style={styles.mallTimeRow}>
                  <Feather name="clock" size={14} color={colors.onImageMuted} />
                  <Text style={[styles.mallTime, { color: colors.onImageMuted }]}>
                    {t('mall.open_until')} {mall.close_time}
                  </Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: mall.is_active ? 'rgba(16,185,129,0.92)' : 'rgba(180,83,9,0.92)' },
              ]}
            >
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {mall.is_active ? t('mall.open_now') : t('mall.type_mall')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.toolbarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="search" size={21} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t('mall.search_products')}
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearIcon}
                accessibilityRole="button"
                accessibilityLabel={t('common.clear')}
              >
                <Feather name="x-circle" size={19} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mall.scan_product')}
            testID={`mall-${mall.id}-barcode-scanner`}
            onPress={() =>
              router.push({
                pathname: '/(customer)/scanner',
                params: { mallId: String(mall.id), mallSlug: mall.slug },
              })
            }
            style={({ pressed }) => [
              styles.scannerButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Feather name="maximize" size={24} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {sectionFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionsList}
        >
          {sectionFilters.map(renderSectionChip)}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <View style={styles.topBarInner}>
          <View style={styles.welcomeBlock}>
            <View style={[styles.profileIcon, { backgroundColor: colors.primary }]}>
              <Feather name="user" size={17} color={colors.primaryForeground} />
            </View>
            <View>
              <Text style={[styles.welcomeLabel, { color: colors.mutedForeground }]}>{t('mall.welcome_to')}</Text>
              <Text style={[styles.welcomeTitle, { color: colors.primary }]} numberOfLines={1}>
                {isAr ? mall.name_ar : mall.name_en || mall.name_ar}
              </Text>
            </View>
          </View>
          <View style={styles.topActions}>
            {isAuthenticated ? <CartButton /> : null}
          </View>
        </View>
      </View>

      <FlatList
        data={isErrorProducts ? [] : products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.productsList, { paddingBottom: insets.bottom + 100 }]}
        columnWrapperStyle={[styles.productsRow, { direction: isAr ? 'rtl' : 'ltr' }]}
        onEndReached={isErrorProducts ? undefined : handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isErrorProducts ? (
            <View style={styles.emptyContainer}>
              <Feather name="alert-triangle" size={44} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
              <AppButton label={t('common.retry')} onPress={refetchProducts} />
            </View>
          ) : isLoadingProducts ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="shopping-bag" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('common.empty')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={renderProduct}
      />
      <ReferenceBottomNav activeTab="malls" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0f2942',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  topBarInner: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeBlock: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, lineHeight: 22 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  topActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: { gap: 14, paddingTop: 16, marginBottom: 16 },
  mallHero: {
    height: 208,
    marginHorizontal: 0,
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { ...StyleSheet.absoluteFill },
  heroShade: { ...StyleSheet.absoluteFill },
  heroControls: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 44,
  },
  heroCart: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  heroBackButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  heroTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitleCopy: { flex: 1 },
  mallTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 31 },
  storeTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  storeTypeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16 },
  mallTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  mallTime: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  statusText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 10 },
  toolbarCard: {
    marginHorizontal: 0,
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    gap: 10,
    shadowColor: '#0f2942',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchBar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 13 },
  clearIcon: { padding: 3 },
  scannerButton: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f2942',
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionsList: { paddingHorizontal: 0, gap: 8, minWidth: '100%' },
  sectionChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#0f2942',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  productsList: { paddingHorizontal: 0, paddingTop: 2 },
  productsRow: { justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 10 },
  productCard: {
    width: '49%',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0f2942',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  productMain: { flex: 1 },
  productImageFrame: {
    width: '100%',
    aspectRatio: 1.3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImageInner: {
    flex: 1,
    alignSelf: 'stretch',
    margin: 8,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: { width: '100%', height: '100%' },
  productImageBadgeRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  availabilityDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  availabilityText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 8 },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountText: { fontFamily: 'Inter_700Bold', fontSize: 8 },
  productInfo: { paddingHorizontal: 10, paddingTop: 6 },
  productLabelRow: { minHeight: 42, alignItems: 'center', justifyContent: 'center', gap: 2 },
  productName: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  productFooter: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  priceGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flex: 1, flexWrap: 'wrap' },
  productPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 15 },
  productOriginalPrice: { fontFamily: 'Inter_500Medium', fontSize: 9, textDecorationLine: 'line-through' },
  addButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});