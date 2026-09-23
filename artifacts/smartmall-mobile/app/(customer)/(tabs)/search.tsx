import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useGlobalSearch } from '@/src/features/search/useSearchHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { formatProductPrice } from '@/src/utils/productPresentation';
import { AppButton } from '@/src/components/AppButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { ReferenceStatusBar } from '@/src/components/ReferenceStatusBar';
import { useAuthStore } from '@/src/store/authStore';
import i18n from '@/src/i18n';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { useOffers, usePublicProducts } from '@/src/features/catalog/useCatalogHooks';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { Product } from '@/src/types/api';
import type { GlobalSearchResult } from '@/src/features/search/searchApi';

type SearchListItem =
  | { type: 'header'; key: string; groupIndex: number; group: GlobalSearchResult; mallName: string }
  | { type: 'product'; key: string; product: Product };

const SEARCH_HISTORY_KEY = 'smartmall.search.history';
function getProductCategory(product: Product, isAr: boolean): { key: string; label: string } | null {
  const category = product.category;
  if (!category) return null;
  if (typeof category === 'string') return { key: category, label: category };

  const key = category.id != null ? String(category.id) : String(category.name_ar || category.name_en || category.name || '');
  const label = isAr
    ? category.name_ar || category.name || category.name_en
    : category.name_en || category.name || category.name_ar;
  return key && label ? { key, label } : null;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedMallId, setSelectedMallId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [offersOnly, setOffersOnly] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then((saved) => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecentSearches(parsed.filter((item): item is string => typeof item === 'string'));
      } catch {
        setRecentSearches([]);
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery);
  const { data: malls } = useMalls();
  const { data: offers } = useOffers();
  const { data: publicProducts } = usePublicProducts();
  const [suggestionSeed, setSuggestionSeed] = useState(0);

  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    setRecentSearches((current) => {
      const next = [debouncedQuery, ...current.filter((item) => item !== debouncedQuery)].slice(0, 6);
      void AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, [debouncedQuery]);

  const offerProductIds = useMemo(() => new Set((offers ?? []).map((offer) => offer.product_id)), [offers]);
  const categoryOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const group of data?.grouped ?? []) {
      for (const product of group.products) {
        const category = getProductCategory(product, isAr);
        if (category) unique.set(category.key, category.label);
      }
    }
    return Array.from(unique, ([key, label]) => ({ key, label }));
  }, [data, isAr]);

  const mallOptions = useMemo(() => {
    const unique = new Map<number, string>();
    for (const mall of malls ?? []) {
      unique.set(mall.id, isAr ? mall.name_ar || mall.name_en : mall.name_en || mall.name_ar);
    }
    for (const group of data?.grouped ?? []) {
      if (!unique.has(group.mall_id)) unique.set(group.mall_id, group.mall_name);
    }
    return Array.from(unique, ([id, label]) => ({ id, label }));
  }, [data, isAr, malls]);

  const filteredGroups = useMemo(
    () =>
      (data?.grouped ?? [])
        .map((group) => ({
          ...group,
          products: group.products.filter((product) => {
            const category = getProductCategory(product, isAr);
            return (
              (selectedMallId == null || group.mall_id === selectedMallId) &&
              (selectedCategory == null || category?.key === selectedCategory) &&
              (!offersOnly || offerProductIds.has(product.id))
            );
          }),
        }))
        .filter((group) => group.products.length > 0),
    [data, isAr, offerProductIds, offersOnly, selectedCategory, selectedMallId],
  );

  const searchItems = useMemo<SearchListItem[]>(
    () =>
      filteredGroups.flatMap((group, groupIndex) => [
        {
          type: 'header' as const,
          key: `header-${group.mall_id}`,
          groupIndex,
          group,
          mallName: isAr ? group.mall_name : malls?.find((mall) => mall.id === group.mall_id)?.name_en || group.mall_name,
        },
        ...group.products.map((product) => ({
          type: 'product' as const,
          key: `product-${group.mall_id}-${product.id}`,
          product,
        })),
      ]),
    [filteredGroups, isAr, malls],
  );

  const suggestedProducts = useMemo(() => {
    const products = publicProducts?.data ?? [];
    if (products.length <= 9) return products;
    const shuffled = [...products];
    let seed = suggestionSeed + 1;
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      seed = (seed * 9301 + 49297) % 233280;
      const swapIndex = Math.floor((seed / 233280) * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled.slice(0, 9);
  }, [publicProducts, suggestionSeed]);
  const trending = useMemo(() => {
    const liveProductNames = (offers ?? [])
      .map((offer) => {
        const product = offer.product;
        return product ? (isAr ? product.name_ar || product.name_en : product.name_en || product.name_ar) : '';
      })
      .filter(Boolean);
    const terms = liveProductNames.length > 0 ? liveProductNames : recentSearches;
    return Array.from(new Set(terms)).slice(0, 4);
  }, [isAr, offers, recentSearches]);

  const activeFilterCount = Number(selectedMallId != null) + Number(selectedCategory != null) + Number(offersOnly);
  const suggestedCardWidth = Math.max(0, Math.floor((width - 56) / 3));
  const clearFilters = () => {
    setSelectedMallId(null);
    setSelectedCategory(null);
    setOffersOnly(false);
    setFilterPanelOpen(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: '#f8fafc' }]} behavior="padding">
      <FlatList
        data={searchItems}
        keyExtractor={(item) => item.key}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 88, direction }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.header, { direction }]}>
            <View style={styles.statusBleed}>
              <ReferenceStatusBar />
            </View>
            <View style={[styles.searchRow, { direction }]}>
              <View style={[styles.searchBar, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', direction }]}>
                <Feather name="search" size={17} color="#0369a1" />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                  placeholder={t('common.search')}
                  placeholderTextColor="#94a3b8"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={t('common.search')}
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
                    <Feather name="x-circle" size={16} color="#94a3b8" />
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={t('search.search_prompt')}>
                  <Feather name="mic" size={16} color="#94a3b8" />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('search.barcode_search')}
                onPress={() => router.push((isAuthenticated ? '/(customer)/scanner' : '/(auth)/login') as never)}
                style={styles.barcodeButton}
              >
                <Feather name="maximize" size={20} color="#0369a1" />
              </Pressable>
            </View>
            <View style={styles.promptBadge}>
              <View style={styles.promptCopy}>
                <View style={styles.promptDot} />
                <Text style={styles.promptText}>{t('search.search_prompt')}</Text>
              </View>
              <Feather name="zap" size={13} color="#f59e0b" />
            </View>

            {debouncedQuery.length >= 2 ? (
              <View style={styles.filtersArea}>
                <View style={styles.filterHeader}>
                  <View style={styles.headingLabel}>
                    <Feather name="sliders" size={14} color="#0369a1" />
                    <Text style={styles.sectionTitle}>{t('search.active_filters')}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('search.filters')}
                    onPress={() => setFilterPanelOpen((open) => !open)}
                    style={styles.filterButton}
                  >
                    <Feather name="filter" size={13} color="#0369a1" />
                    <Text style={styles.filterButtonText}>{t('search.filters')}</Text>
                    {activeFilterCount > 0 ? <Text style={styles.filterCount}>{activeFilterCount}</Text> : null}
                  </Pressable>
                </View>
                {activeFilterCount > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChips}>
                    {selectedMallId != null ? (
                      <Pressable onPress={() => setSelectedMallId(null)} style={styles.activeChip}>
                        <Text style={styles.activeChipText}>{mallOptions.find((item) => item.id === selectedMallId)?.label}</Text>
                        <Feather name="x" size={11} color="#0369a1" />
                      </Pressable>
                    ) : null}
                    {selectedCategory != null ? (
                      <Pressable onPress={() => setSelectedCategory(null)} style={styles.activeChip}>
                        <Text style={styles.activeChipText}>{categoryOptions.find((item) => item.key === selectedCategory)?.label}</Text>
                        <Feather name="x" size={11} color="#0369a1" />
                      </Pressable>
                    ) : null}
                    {offersOnly ? (
                      <Pressable onPress={() => setOffersOnly(false)} style={styles.activeChip}>
                        <Text style={styles.activeChipText}>{t('search.offers_only')}</Text>
                        <Feather name="x" size={11} color="#0369a1" />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={clearFilters}>
                      <Text style={styles.clearFilters}>{t('search.clear_filters')}</Text>
                    </Pressable>
                  </ScrollView>
                ) : null}
                {filterPanelOpen ? (
                  <View style={styles.filterPanel}>
                    <Text style={styles.filterPanelTitle}>{t('search.filter_malls')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                      <Pressable onPress={() => setSelectedMallId(null)} style={[styles.optionChip, selectedMallId == null && styles.optionChipSelected]}>
                        <Text style={[styles.optionText, selectedMallId == null && styles.optionTextSelected]}>{t('search.filter_all')}</Text>
                      </Pressable>
                      {mallOptions.map((mall) => (
                        <Pressable key={mall.id} onPress={() => setSelectedMallId(mall.id)} style={[styles.optionChip, selectedMallId === mall.id && styles.optionChipSelected]}>
                          <Text style={[styles.optionText, selectedMallId === mall.id && styles.optionTextSelected]}>{mall.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    {categoryOptions.length > 0 ? (
                      <>
                        <Text style={styles.filterPanelTitle}>{t('search.filter_categories')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                          <Pressable onPress={() => setSelectedCategory(null)} style={[styles.optionChip, selectedCategory == null && styles.optionChipSelected]}>
                            <Text style={[styles.optionText, selectedCategory == null && styles.optionTextSelected]}>{t('search.filter_all')}</Text>
                          </Pressable>
                          {categoryOptions.map((category) => (
                            <Pressable key={category.key} onPress={() => setSelectedCategory(category.key)} style={[styles.optionChip, selectedCategory === category.key && styles.optionChipSelected]}>
                              <Text style={[styles.optionText, selectedCategory === category.key && styles.optionTextSelected]}>{category.label}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </>
                    ) : null}
                    <Pressable onPress={() => setOffersOnly((value) => !value)} style={styles.offersToggle}>
                      <View style={[styles.checkbox, offersOnly && styles.checkboxSelected]}>
                        {offersOnly ? <Feather name="check" size={12} color="#fff" /> : null}
                      </View>
                      <Text style={styles.optionText}>{t('search.offers_only')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {debouncedQuery.length < 2 ? (
              <View style={styles.explorationBody}>
                <View>
                  <View style={styles.sectionHeading}>
                    <View style={styles.headingLabel}>
                      <Feather name="clock" size={13} color="#94a3b8" />
                      <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setRecentSearches([]);
                        void AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.clearHistory}>{t('search.clear_history')}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.recentTags}>
                    {recentSearches.map((item) => (
                      <Pressable key={item} onPress={() => setQuery(item)} style={styles.recentTag}>
                        <Text style={styles.recentText}>{item}</Text>
                        <Feather name="x" size={11} color="#94a3b8" />
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.trendingCard}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.headingLabel}>
                      <View style={styles.fireIcon}>
                        <Feather name="zap" size={12} color="#fff" />
                      </View>
                      <Text style={styles.trendingTitle}>{t('search.trending')}</Text>
                    </View>
                    <Text style={styles.updatedBadge}>{t('search.updated_now')}</Text>
                  </View>
                  <View style={styles.trendingGrid}>
                    {trending.map((item, index) => (
                      <Pressable key={item} onPress={() => setQuery(item)} style={styles.trendingItem}>
                        <View style={[styles.rank, index === 0 ? styles.firstRank : null]}>
                          <Text style={styles.rankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.trendingText} numberOfLines={1}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                  <View>
                    <View style={styles.sectionHeading}>
                      <View style={styles.headingLabel}>
                        <Feather name="shuffle" size={13} color="#64748b" />
                        <Text style={styles.sectionTitle}>{t('search.suggested_products')}</Text>
                      </View>
                      <Pressable onPress={() => setSuggestionSeed((seed) => seed + 1)} accessibilityRole="button">
                        <Text style={styles.quickAll}>{t('search.refresh_suggestions')}</Text>
                      </Pressable>
                    </View>
                    {suggestedProducts.length > 0 ? (
                      <View style={styles.suggestedGrid}>
                        {suggestedProducts.map((product) => {
                          const productName = isAr ? product.name_ar || product.name_en : product.name_en || product.name_ar;
                          const imageUrl = getProductImageUrl(product);
                          return (
                            <Link key={product.id} href={`/(customer)/product/${product.id}`} asChild>
                              <Pressable
                                style={StyleSheet.flatten([
                                  styles.suggestedCard,
                                  { width: suggestedCardWidth, backgroundColor: colors.card, borderColor: colors.border },
                                ])}
                              >
                                {imageUrl ? (
                                  <Image source={{ uri: imageUrl }} style={styles.suggestedImage} contentFit="cover" />
                                ) : (
                                  <View style={[styles.suggestedImage, styles.suggestedPlaceholder, { backgroundColor: colors.muted }]}>
                                    <Feather name="image" size={22} color={colors.mutedForeground} />
                                  </View>
                                )}
                                <View style={styles.suggestedContent}>
                                  <Text style={[styles.suggestedName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                                    {productName}
                                  </Text>
                                  <Text style={[styles.suggestedPrice, { color: colors.primary, textAlign: isAr ? 'right' : 'left' }]}>
                                    {formatProductPrice(product, isAr)}
                                  </Text>
                                </View>
                              </Pressable>
                            </Link>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.suggestionsEmpty}>
                        <Feather name="package" size={24} color="#94a3b8" />
                        <Text style={styles.suggestionsEmptyText}>{t('search.no_suggestions')}</Text>
                      </View>
                    )}
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
           isLoading && debouncedQuery.length >= 2 ? (
            <View style={styles.loadingContainer}><ActivityIndicator color={colors.primary} /></View>
          ) : isError && debouncedQuery.length >= 2 ? (
            <View style={styles.centerContainer}>
              <Feather name="alert-triangle" size={42} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
              <AppButton label={t('common.retry')} onPress={refetch} />
            </View>
          ) : debouncedQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Feather name="search" size={42} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('search.no_results')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View style={[styles.groupHeader, item.groupIndex > 0 && styles.groupSpacing, { direction }]}>
              <Feather name="shopping-bag" size={18} color={colors.primary} />
              <Text style={[styles.groupTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{item.mallName}</Text>
            </View>
          ) : (
            <Link href={`/(customer)/product/${item.product.id}`} asChild>
              <Pressable style={StyleSheet.flatten([styles.productCard, { backgroundColor: colors.card, borderColor: colors.border, direction }])}>
                {getProductImageUrl(item.product) ? (
                  <Image source={{ uri: getProductImageUrl(item.product)! }} style={styles.productImage} contentFit="cover" />
                ) : (
                  <View style={[styles.productImage, styles.productPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="image" size={24} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.productContent, { direction }]}>
                  <Text style={[styles.productTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                    {isAr ? item.product.name_ar : item.product.name_en || item.product.name_ar}
                  </Text>
                  <Text style={[styles.productPrice, { color: colors.primary, textAlign: isAr ? 'right' : 'left' }]}>
                    {formatProductPrice(item.product, isAr)}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )
        }
      />
      <ReferenceBottomNav activeTab="search" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  header: { gap: 10 },
  statusBleed: { marginHorizontal: -16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBar: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, height: 46, fontFamily: 'Inter_500Medium', fontSize: 13 },
  barcodeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  promptBadge: { minHeight: 34, borderRadius: 11, borderWidth: 1, borderColor: '#bae6fd', backgroundColor: '#f0f9ff', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptCopy: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  promptDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0369a1' },
  promptText: { color: '#075985', fontFamily: 'Inter_500Medium', fontSize: 10, flexShrink: 1 },
  filtersArea: { gap: 8 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' },
  filterButtonText: { color: '#0369a1', fontFamily: 'Inter_700Bold', fontSize: 10 },
  filterCount: { color: '#fff', backgroundColor: '#0369a1', borderRadius: 8, minWidth: 16, textAlign: 'center', paddingHorizontal: 3, fontFamily: 'Inter_700Bold', fontSize: 9 },
  activeChips: { gap: 7, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#7dd3fc' },
  activeChipText: { color: '#075985', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  clearFilters: { color: '#e11d48', fontFamily: 'Inter_700Bold', fontSize: 9, paddingHorizontal: 4 },
  filterPanel: { padding: 11, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', gap: 7 },
  filterPanelTitle: { color: '#334155', fontFamily: 'Inter_700Bold', fontSize: 10, marginTop: 2 },
  optionRow: { gap: 7 },
  optionChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  optionChipSelected: { backgroundColor: '#dbeafe', borderColor: '#60a5fa' },
  optionText: { color: '#475569', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  optionTextSelected: { color: '#1d4ed8' },
  offersToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 3 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#0369a1', borderColor: '#0369a1' },
  explorationBody: { gap: 18, paddingTop: 8, paddingBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  headingLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { color: '#475569', fontFamily: 'Inter_700Bold', fontSize: 12 },
  clearHistory: { color: '#f43f5e', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  recentTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  recentText: { color: '#334155', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  trendingCard: { padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  fireIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  trendingTitle: { color: '#1e293b', fontFamily: 'Inter_700Bold', fontSize: 12 },
  updatedBadge: { color: '#ea580c', backgroundColor: '#ffedd5', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontFamily: 'Inter_700Bold', fontSize: 9 },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendingItem: { width: '48%', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: '#f1f5f9' },
  rank: { width: 20, height: 20, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  firstRank: { backgroundColor: '#fef3c7' },
  rankText: { color: '#475569', fontFamily: 'Inter_800ExtraBold', fontSize: 9 },
  trendingText: { flex: 1, color: '#334155', fontFamily: 'Inter_700Bold', fontSize: 10 },
  quickAll: { color: '#0369a1', fontFamily: 'Inter_700Bold', fontSize: 10 },
  categoryGrid: { flexDirection: 'row', gap: 8 },
  categoryCard: { flex: 1, minHeight: 83, padding: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  categoryIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  categoryText: { color: '#334155', fontFamily: 'Inter_700Bold', fontSize: 10, textAlign: 'center' },
  suggestedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestedCard: { minHeight: 122, borderRadius: 12, borderWidth: 1, overflow: 'hidden', flexShrink: 0 },
  suggestedImage: { width: '100%', height: 60 },
  suggestedPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  suggestedContent: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, gap: 3 },
  suggestedName: { fontFamily: 'Inter_600SemiBold', fontSize: 9, lineHeight: 12 },
  suggestedPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
  suggestionsEmpty: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  suggestionsEmptyText: { color: '#64748b', fontFamily: 'Inter_500Medium', fontSize: 11 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  centerContainer: { padding: 40, alignItems: 'center', gap: 15 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  groupSpacing: { marginTop: 22 },
  groupTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  productCard: { minHeight: 80, flexDirection: 'row', marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  productImage: { width: 80, height: 80 },
  productPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productContent: { flex: 1, padding: 12, justifyContent: 'center' },
  productTitle: { fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 5 },
  productPrice: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});