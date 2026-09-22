import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { getProductImageUrl } from '@/src/services/imageUrl';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { Product } from '@/src/types/api';
import type { GlobalSearchResult } from '@/src/features/search/searchApi';

type ActionIcon = keyof typeof Feather.glyphMap;
type SearchListItem =
  | { type: 'header'; key: string; groupIndex: number; group: GlobalSearchResult; mallName: string }
  | { type: 'product'; key: string; product: Product };

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(
    isAr ? ['حليب كامل الدسم', 'سمارت مول', 'عروض البقلاوة', 'شوكولاتة نوتيلا'] : ['Full-fat milk', 'Smart Mall', 'Baklava offers', 'Nutella chocolate'],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery);
  const hasGlobalResults = (data?.grouped.length ?? 0) > 0;
  const { data: malls } = useMalls(undefined, { enabled: !isAr && hasGlobalResults });
  const searchItems = useMemo<SearchListItem[]>(
    () =>
      (data?.grouped ?? []).flatMap((group, groupIndex) => [
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
    [data, isAr, malls],
  );

  const quickCategories: Array<{ icon: ActionIcon; label: string; color: string; background: string }> = [
    { icon: 'shopping-bag', label: t('search.category_food'), color: '#059669', background: '#ecfdf5' },
    { icon: 'droplet', label: t('search.category_cleaning'), color: '#2563eb', background: '#eff6ff' },
    { icon: 'monitor', label: t('search.category_electronics'), color: '#9333ea', background: '#faf5ff' },
    { icon: 'coffee', label: t('search.category_bakery'), color: '#d97706', background: '#fffbeb' },
  ];
  const trending = isAr
    ? ['عروض حسان مول', 'مواد تموينية', 'مسح الباركود', 'أجهزة وإلكترونيات']
    : ['Hassan Mall offers', 'Grocery items', 'Barcode scan', 'Electronics'];

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

            {debouncedQuery.length < 2 ? (
              <View style={styles.explorationBody}>
                <View>
                  <View style={styles.sectionHeading}>
                    <View style={styles.headingLabel}>
                      <Feather name="clock" size={13} color="#94a3b8" />
                      <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
                    </View>
                    <Pressable onPress={() => setRecentSearches([])} accessibilityRole="button">
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
                    <Text style={styles.sectionTitle}>{t('search.quick_categories')}</Text>
                    <Pressable onPress={() => router.push('/(customer)/(tabs)/sections' as never)}>
                      <Text style={styles.quickAll}>{t('search.quick_all')}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.categoryGrid}>
                    {quickCategories.map((item) => (
                      <Pressable key={item.label} onPress={() => setQuery(item.label)} style={styles.categoryCard}>
                        <View style={[styles.categoryIcon, { backgroundColor: item.background }]}>
                          <Feather name={item.icon} size={19} color={item.color} />
                        </View>
                        <Text style={styles.categoryText}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
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