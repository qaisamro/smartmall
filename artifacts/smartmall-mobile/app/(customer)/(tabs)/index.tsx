import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CartButton } from '@/src/components/CartButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { useAuthStore } from '@/src/store/authStore';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import {
  useHomeBanners,
  useOffers,
  usePublicProducts,
} from '@/src/features/catalog/useCatalogHooks';
import { useUnreadNotificationCount } from '@/src/features/notifications/useNotificationsHooks';
import {
  getMallImageUrls,
  getProductImageUrl,
  imageRequestHeaders,
  normalizeImageUrl,
} from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import { formatProductPrice } from '@/src/utils/productPresentation';
import i18n from '@/src/i18n';
import type { HomeBanner } from '@/src/types/api';

type ActionIcon = keyof typeof Feather.glyphMap;
type StoreCategoryKey = 'mall' | 'supermarket' | 'butcher' | 'grocery';

const HOME_STORE_CATEGORIES: Array<{
  key: StoreCategoryKey;
  icon: ActionIcon;
  labelKey:
    | 'mall.filter_malls'
    | 'mall.filter_supermarkets'
    | 'mall.filter_butchers'
    | 'mall.filter_grocery';
}> = [
  { key: 'mall', icon: 'columns', labelKey: 'mall.filter_malls' },
  { key: 'supermarket', icon: 'shopping-cart', labelKey: 'mall.filter_supermarkets' },
  { key: 'butcher', icon: 'scissors', labelKey: 'mall.filter_butchers' },
  { key: 'grocery', icon: 'sun', labelKey: 'mall.filter_grocery' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';
  const isGuest = !isAuthenticated;
  const isAr = i18n.language.startsWith('ar');
  const openScanner = () => router.push('/(customer)/scanner');

  const mallsQuery = useMalls();
  const offersQuery = useOffers();
  const publicProductsQuery = usePublicProducts();
  const homeBannersQuery = useHomeBanners('top');
  const unreadNotificationsQuery = useUnreadNotificationCount({ enabled: isAuthenticated });
  const malls = mallsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const popularProducts = publicProductsQuery.data?.data ?? [];
  const homeBanners = homeBannersQuery.data ?? [];
  const isRefreshing =
    mallsQuery.isRefetching ||
    offersQuery.isRefetching ||
    publicProductsQuery.isRefetching ||
    homeBannersQuery.isRefetching ||
    unreadNotificationsQuery.isRefetching;
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const horizontalInset = isGuest ? 32 : 40;
  const actionCardWidth = Math.max(0, (width - horizontalInset - 12) / 2);
  const catalogColumns = 3;
  const featuredCardWidth = Math.max(0, (width - horizontalInset - 12 * (catalogColumns - 1)) / catalogColumns);

  const refreshHome = () => {
    void Promise.all([
      mallsQuery.refetch(),
      offersQuery.refetch(),
      publicProductsQuery.refetch(),
      homeBannersQuery.refetch(),
      ...(isAuthenticated ? [unreadNotificationsQuery.refetch()] : []),
    ]);
  };

  const unreadNotificationCount = unreadNotificationsQuery.data?.count ?? 0;

  const actionItems: Array<{
    key: string;
    icon: ActionIcon;
    label: string;
    description: string;
    onPress: () => void;
    highlighted?: boolean;
  }> = [
    {
      key: 'scanner',
      icon: 'maximize',
      label: t('home.quick_scan'),
      description: isGuest ? t('home.guest_quick_scan_description') : t('home.quick_scan_description'),
      onPress: () => router.push(isGuest ? '/(auth)/login' : '/(customer)/scanner'),
      highlighted: true,
    },
    {
      key: 'malls',
      icon: 'shopping-bag',
      label: isGuest ? t('home.guest_quick_malls') : t('home.quick_malls'),
      description: isGuest ? t('home.guest_quick_malls_description') : t('home.quick_malls_description'),
      onPress: () => router.push('/(customer)/(tabs)/malls'),
    },
    {
      key: 'offers',
      icon: 'tag',
      label: t('home.quick_offers'),
      description: isGuest ? t('home.guest_quick_offers_description') : t('home.quick_offers_description'),
      onPress: () => router.push('/(customer)/(tabs)/offers'),
    },
    {
      key: 'orders',
      icon: 'package',
      label: isGuest ? t('home.guest_quick_orders') : t('home.quick_orders'),
      description: isGuest ? t('home.guest_quick_orders_description') : t('home.quick_orders_description'),
      onPress: () => router.push(isGuest ? '/(auth)/login' : '/(customer)/(tabs)/orders'),
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ backgroundColor: colors.background, direction }}
        contentContainerStyle={[
           styles.content,
           {
             paddingHorizontal: isGuest ? 16 : 20,
             paddingTop: insets.top + 12,
             paddingBottom: insets.bottom + 96,
           },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHome}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
      {isGuest ? <GuestStatusBar colors={colors} /> : null}
      {homeBanners.length > 0 ? (
        <HomeBannerSlider banners={homeBanners} width={width} isAr={isAr} />
      ) : isGuest ? (
        <View style={[styles.guestHeader, { direction }]}>
          <View style={styles.brandBlock}>
            <View style={[styles.guestLogo, { backgroundColor: colors.primary }]}>
              <Feather name="shopping-bag" size={23} color={colors.primaryForeground} />
            </View>
            <View style={styles.brandCopy}>
              <View style={[styles.guestGreetingRow, { direction }]}>
                <Text style={[styles.guestStatusPill, { color: colors.primary, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }]}>
                  {t('home.guest_status')}
                </Text>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{t('home.guest_welcome')}</Text>
              </View>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {t('home.guest_brand')} <Text style={[styles.brandEnglish, { color: colors.primary }]}>SmartMall</Text>
              </Text>
            </View>
          </View>
          <View style={styles.guestAuthActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.login')}
              testID="guest-login"
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [
                styles.guestButton,
                { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.guestButtonText, { color: colors.foreground }]}>{t('home.login')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.register')}
              onPress={() => router.push('/(auth)/register')}
              style={({ pressed }) => [
                styles.guestButton,
                styles.guestButtonPrimary,
                { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.guestButtonText, { color: colors.primaryForeground }]}>{t('home.register')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.header, { direction }]}>
          <View style={[styles.brandBlock, { direction }]}>
            <Image
              source={require('@/assets/images/smartmall-logo.png')}
              style={styles.brandLogo}
              contentFit="contain"
            />
            <View style={[styles.brandCopy, { direction }]}>
              <Text
                style={[
                  styles.eyebrow,
                  { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' },
                ]}
              >
                {t('home.greeting')}
              </Text>
              <Text
                style={[
                  styles.userName,
                  {
                    color: colors.foreground,
                    textAlign: isAr ? 'right' : 'left',
                    writingDirection: isAr ? 'rtl' : 'ltr',
                  },
                ]}
                numberOfLines={1}
              >
                {user?.name || 'SmartMall'}
              </Text>
            </View>
          </View>
          <View style={[styles.headerActions, { direction }]}>
            <View style={styles.notificationButtonWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.notifications')}
                onPress={() => router.push('/(customer)/notifications')}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="bell" size={17} color={colors.foreground} />
              </Pressable>
              {unreadNotificationCount > 0 ? (
                <View style={[styles.notificationDot, { backgroundColor: colors.destructive, borderColor: colors.card }]} />
              ) : null}
            </View>
            <CartButton />
          </View>
        </View>
      )}

      {isGuest ? (
        <View style={[styles.searchBar, styles.guestSearchBar, { backgroundColor: colors.muted, borderColor: colors.muted, direction }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.search_placeholder')}
            onPress={() => router.push('/(customer)/(tabs)/search')}
            style={styles.searchTextButton}
          >
            <Text
              style={[
                styles.searchText,
                { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {t('home.search_placeholder')}
            </Text>
          </Pressable>
          <View style={styles.searchActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.quick_scan')}
              onPress={openScanner}
              hitSlop={6}
            >
              <Feather name="maximize" size={16} color={colors.primary} />
            </Pressable>
            <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.filter')}
              onPress={() => router.push('/(customer)/(tabs)/search')}
              hitSlop={6}
            >
              <Feather name="sliders" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              direction,
            },
          ]}
        >
          <Feather name="search" size={19} color={colors.mutedForeground} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.search_placeholder')}
            onPress={() => router.push('/(customer)/(tabs)/search')}
            style={styles.searchTextButton}
          >
            <Text
              style={[
                styles.searchText,
                { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {t('home.search_placeholder')}
            </Text>
          </Pressable>
          <View style={styles.searchActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.quick_scan')}
              onPress={openScanner}
              hitSlop={6}
            >
              <Feather name="maximize" size={17} color={colors.primary} />
            </Pressable>
            <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.filter')}
              onPress={() => router.push('/(customer)/(tabs)/search')}
              hitSlop={6}
            >
              <Feather name="sliders" size={17} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}

      {isGuest ? (
        <GuestHero
          colors={colors}
          t={t}
          onRegister={() => router.push('/(auth)/register')}
          onExplore={() => router.push('/(customer)/(tabs)/malls')}
        />
      ) : (
        <View
          style={[
            styles.welcomeCard,
            {
              backgroundColor: colors.primary,
              direction,
            },
          ]}
        >
          <View
            style={[
              styles.welcomeAccentBase,
              isAr ? styles.welcomeAccentRtl : styles.welcomeAccentLtr,
              { backgroundColor: colors.primarySoft },
            ]}
          />
          <View style={styles.heroContent}>
            <View style={[styles.heroTop, { direction }]}>
              <View style={[styles.heroKicker, { backgroundColor: colors.primarySoft }]}>
                <Feather name="star" size={10} color={colors.warning} />
                <Text style={[styles.heroKickerText, { color: colors.onImageMuted }]}>
                  {t('home.hero_kicker')}
                </Text>
              </View>
              <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
                <Feather name="shopping-bag" size={19} color={colors.onImage} />
              </View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.welcomeTitle, { color: colors.onImage }]}>{t('home.hero_title')}</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.onImageMuted }]}>
                {t('home.hero_subtitle')}
              </Text>
            </View>
            <View style={[styles.heroBottom, { direction }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.hero_cta')}
                onPress={() => router.push('/(customer)/(tabs)/offers')}
                style={({ pressed }) => [
                  styles.heroButton,
                  { backgroundColor: colors.card, opacity: pressed ? 0.76 : 1 },
                ]}
              >
                <Text style={[styles.heroButtonText, { color: colors.primary }]}>{t('home.hero_cta')}</Text>
                <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={12} color={colors.primary} />
              </Pressable>
              <Text style={[styles.heroDiscount, { color: colors.onImageMuted }]}>{t('home.hero_discount')}</Text>
            </View>
          </View>
        </View>
      )}

      <SectionHeader
        title={t('home.quick_actions')}
         subtitle={isGuest ? t('home.guest_quick_subtitle') : t('home.quick_actions_subtitle')}
        colors={colors}
        isAr={isAr}
      />
      <View
        style={[
          styles.actionGrid,
          { direction },
        ]}
      >
        {actionItems.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionCard,
              {
                width: actionCardWidth,
                backgroundColor: action.highlighted ? colors.primary : colors.card,
                borderColor: action.highlighted ? colors.primary : colors.border,
                opacity: pressed ? 0.76 : 1,
              },
            ]}
          >
            <View style={[styles.actionTop, { direction }]}>
              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor: action.highlighted ? colors.primaryForeground : colors.primarySoft,
                  },
                ]}
              >
                <Feather name={action.icon} size={21} color={colors.primary} />
              </View>
              <Feather
                name={isAr ? 'arrow-left' : 'arrow-right'}
                size={16}
                color={action.highlighted ? colors.onImageMuted : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.actionLabel,
                {
                  color: action.highlighted ? colors.primaryForeground : colors.foreground,
                  textAlign: isAr ? 'right' : 'left',
                },
              ]}
            >
              {action.label}
            </Text>
            <Text
              style={[
                styles.actionDescription,
                { color: action.highlighted ? colors.onImageMuted : colors.mutedForeground, textAlign: isAr ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {action.description}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.browse_sections')}
          subtitle={t('home.browse_sections_subtitle')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/malls')}
          colors={colors}
          isAr={isAr}
        />
        <View style={[styles.categoryGrid, { direction }]}>
          {HOME_STORE_CATEGORIES.map((category) => {
            const visual = {
              mall: { color: colors.primary, backgroundColor: colors.primarySoft },
              supermarket: { color: colors.success, backgroundColor: colors.secondary },
              butcher: { color: colors.warning, backgroundColor: colors.warningBackground },
              grocery: { color: colors.accent, backgroundColor: colors.primarySoft },
            }[category.key];

            return (
              <Pressable
                key={category.key}
                accessibilityRole="button"
                accessibilityLabel={t(category.labelKey)}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/(tabs)/malls',
                    params: { type: category.key },
                  })
                }
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: visual.backgroundColor }]}>
                  <Feather name={category.icon} size={18} color={visual.color} />
                </View>
                <Text style={[styles.categoryCardText, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={1}>
                  {t(category.labelKey)}
                </Text>
                <Feather name={isAr ? 'chevron-left' : 'chevron-right'} size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.featured_malls')}
          subtitle={t('home.featured_malls_subtitle')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/malls')}
          colors={colors}
          isAr={isAr}
        />
        {mallsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : mallsQuery.isError ? (
          <SectionMessage
            icon="alert-circle"
            message={t('error.network')}
            actionLabel={t('common.retry')}
            onAction={() => void mallsQuery.refetch()}
            colors={colors}
            isAr={isAr}
          />
        ) : malls.length === 0 ? (
          <SectionMessage icon="shopping-bag" message={t('home.no_malls')} colors={colors} isAr={isAr} />
        ) : (
          <View style={[styles.featuredGrid, { direction }]}>
            {malls.slice(0, 6).map((mall) => {
              const location = isAr
                ? mall.location_arabic || mall.description_ar || t('mall.location_summary')
                : mall.location_en || mall.location_arabic || mall.description_en || t('mall.location_summary');

              return (
                <Pressable
                  key={mall.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(customer)/mall/${mall.slug}`)}
                  style={({ pressed }) => [
                    styles.mallCard,
                    {
                      width: featuredCardWidth,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.mallImageWrap}>
                    <MallImage
                      key={`${mall.id}-${mall.cover_image ?? ''}-${mall.logo ?? ''}`}
                      mall={mall}
                    />
                  </View>
                  <View style={[styles.mallCardBody, { direction }]}>
                    <Text
                      style={[styles.mallName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                        numberOfLines={3}
                    >
                      {(isAr ? mall.name_ar : mall.name_en) || mall.name_ar || mall.name_en}
                    </Text>
                    <View style={[styles.mallAddressRow, { direction }]}>
                      <Feather name="map-pin" size={11} color={colors.primary} />
                      <Text
                        style={[styles.mallAddressText, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}
                        numberOfLines={3}
                      >
                        {location}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {offersQuery.isLoading || offersQuery.isError || offers.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('home.special_offers')}
            actionLabel={t('home.view_all')}
            onAction={() => router.push('/(customer)/(tabs)/offers')}
            colors={colors}
            isAr={isAr}
          />
          {offersQuery.isLoading ? (
            <HorizontalLoading colors={colors} label={t('common.loading')} />
          ) : offersQuery.isError ? (
            <SectionMessage
              icon="alert-circle"
              message={t('error.network')}
              actionLabel={t('common.retry')}
              onAction={() => void offersQuery.refetch()}
              colors={colors}
              isAr={isAr}
            />
          ) : (
            <View style={[styles.cardGrid, { direction }]}>
              {offers.slice(0, 6).map((offer) => {
                const imageUrl =
                  normalizeImageUrl(offer.image) ||
                  (offer.product ? getProductImageUrl(offer.product) : null);
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
                  <Pressable
                    key={offer.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(
                        `/(customer)/product/${offer.product_id}${detailsQuery ? `?${detailsQuery}` : ''}`,
                      )
                    }
                    style={({ pressed }) => [
                      styles.offerCard,
                      {
                        width: featuredCardWidth,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl, headers: imageRequestHeaders }} style={styles.offerImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.offerImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                        <Feather name="tag" size={28} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={[styles.offerBody, { direction }]}>
                      <Text
                        style={[styles.offerTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                        numberOfLines={3}
                      >
                          {(isAr ? offer.title_ar : offer.title_en) || offer.title_ar || offer.title_en}
                      </Text>
                      <View style={[styles.priceRow, { direction }]}>
                        <Text style={[styles.offerPrice, { color: colors.destructive }]}>
                          {formatCurrency(offer.offer_price)}
                        </Text>
                        <View style={[styles.addButton, { backgroundColor: colors.primarySoft }]}>
                          <Feather name="plus" size={14} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={t('home.popular_products')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/search')}
          colors={colors}
          isAr={isAr}
        />
        {publicProductsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : popularProducts.length === 0 ? (
          <SectionMessage icon="shopping-bag" message={t('home.no_products')} colors={colors} isAr={isAr} />
        ) : (
          <View style={[styles.cardGrid, { direction }]}>
             {popularProducts.slice(0, 6).map((product) => {
              const imageUrl = getProductImageUrl(product);
              return (
                <Pressable
                  key={product.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(customer)/product/${product.id}`)}
                  style={({ pressed }) => [
                    styles.productCard,
                      {
                        width: featuredCardWidth,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                  ]}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                      <Feather name="image" size={28} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={[styles.productBody, { direction }]}>
                    <Text style={[styles.productName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                      {(isAr ? product.name_ar : product.name_en) || product.name_ar || product.name_en}
                    </Text>
                      <View style={[styles.priceRow, { direction }]}>
                        <Text style={[styles.productPrice, { color: colors.primary }]}>
                          {formatProductPrice(product, isAr)}
                        </Text>
                        <View style={[styles.addButton, { backgroundColor: colors.primarySoft }]}>
                          <Feather name="shopping-cart" size={13} color={colors.primary} />
                        </View>
                      </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      </ScrollView>
      <ReferenceBottomNav />
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  colors,
  isAr,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, { direction: isAr ? 'rtl' : 'ltr' }]}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GuestStatusBar({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.statusBar}>
      <Text style={[styles.statusTime, { color: colors.foreground }]}>9:41</Text>
      <View style={styles.statusNotch} />
      <View style={styles.statusIcons}>
        <Feather name="wifi" size={12} color={colors.foreground} />
        <Feather name="activity" size={12} color={colors.foreground} />
        <View style={[styles.batteryShell, { borderColor: colors.foreground }]}>
          <View style={[styles.batteryFill, { backgroundColor: colors.foreground }]} />
        </View>
      </View>
    </View>
  );
}

function HomeBannerSlider({
  banners,
  width,
  isAr,
}: {
  banners: HomeBanner[];
  width: number;
  isAr: boolean;
}) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = Math.max(0, width - 32);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, slideWidth]);

  const openBanner = (banner: HomeBanner) => {
    if (!banner.link_url || banner.link_type === 'none') return;
    if (banner.link_type === 'external') {
      void Linking.openURL(banner.link_url);
      return;
    }
    router.push(banner.link_url as never);
  };

  return (
    <View style={styles.homeBannerSection}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.homeBannerScroller}
        style={{ direction: 'ltr' }}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
          setActiveIndex(Math.max(0, Math.min(next, banners.length - 1)));
        }}
      >
        {banners.map((banner, index) => {
          const imageUrl = normalizeImageUrl(banner.image_url || banner.image);
          const title = isAr ? banner.title_ar || banner.title_en : banner.title_en || banner.title_ar;
          const body = isAr ? banner.body_ar || banner.body_en : banner.body_en || banner.body_ar;
          const badge = isAr ? banner.badge_ar || banner.badge_en : banner.badge_en || banner.badge_ar;
          const cta = isAr ? banner.cta_label_ar || banner.cta_label_en : banner.cta_label_en || banner.cta_label_ar;

          return (
            <Pressable
              key={banner.id}
              accessibilityRole={banner.link_url ? 'button' : 'none'}
              accessibilityLabel={`${title || ''}${cta ? `، ${cta}` : ''}، البانر ${index + 1} من ${banners.length}`}
              onPress={() => openBanner(banner)}
              style={[styles.homeBannerSlide, { width: slideWidth, direction: 'rtl' }]}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl, headers: imageRequestHeaders }}
                  style={styles.homeBannerImage}
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
              <View style={[styles.homeBannerShade, { backgroundColor: colors.primary }]} />
              <View style={[styles.homeBannerContent, { direction: isAr ? 'rtl' : 'ltr' }]}>
                {badge ? (
                  <View style={[styles.homeBannerBadge, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.homeBannerBadgeText, { color: colors.onImageMuted }]} numberOfLines={1}>{badge}</Text>
                  </View>
                ) : null}
                <Text style={[styles.homeBannerTitle, { color: colors.onImage }]} numberOfLines={2}>{title}</Text>
                {body ? <Text style={[styles.homeBannerBody, { color: colors.onImageMuted }]} numberOfLines={2}>{body}</Text> : null}
                {cta ? (
                  <View style={[styles.homeBannerCta, { backgroundColor: colors.card }]}>
                    <Text style={[styles.homeBannerCtaText, { color: colors.primary }]}>{cta}</Text>
                    <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={12} color={colors.primary} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={[styles.homeBannerDots, { direction: isAr ? 'rtl' : 'ltr' }]}>
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[
                styles.homeBannerDot,
                { backgroundColor: index === activeIndex ? colors.primary : colors.border },
                index === activeIndex && styles.homeBannerDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GuestHero({
  colors,
  t,
  onRegister,
  onExplore,
}: {
  colors: ReturnType<typeof useColors>;
  t: (key: string) => string;
  onRegister: () => void;
  onExplore: () => void;
}) {
  return (
    <View style={[styles.guestHero, { backgroundColor: colors.primary }]}>
      <View style={[styles.guestHeroOrb, { backgroundColor: colors.primarySoft }]} />
      <View style={[styles.guestHeroOrbSecondary, { backgroundColor: colors.primarySoft }]} />
      <View style={styles.guestHeroBag}>
        <Feather name="shopping-bag" size={72} color={colors.onImage} />
      </View>
      <View style={styles.guestHeroContent}>
        <View style={[styles.guestHeroKicker, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <Text style={styles.guestHeroSparkle}>✨</Text>
          <Text style={[styles.guestHeroKickerText, { color: '#fcd34d' }]}>{t('home.guest_hero_kicker')}</Text>
        </View>
        <Text style={[styles.guestHeroTitle, { color: colors.onImage }]}>{t('home.guest_hero_title')}</Text>
        <Text style={[styles.guestHeroSubtitle, { color: colors.onImageMuted }]}>{t('home.guest_hero_subtitle')}</Text>
        <View style={styles.guestHeroActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.guest_hero_register')}
            onPress={onRegister}
            style={({ pressed }) => [
              styles.guestHeroPrimaryButton,
              { backgroundColor: colors.card, opacity: pressed ? 0.76 : 1 },
            ]}
          >
            <Text style={[styles.guestHeroPrimaryText, { color: colors.primary }]}>{t('home.guest_hero_register')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.guest_hero_explore')}
            onPress={onExplore}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.guestHeroSecondaryText, { color: colors.onImage }]}>{t('home.guest_hero_explore')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MallImage({ mall }: { mall: { cover_image: string | null; logo: string | null } }) {
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
    <View style={[styles.mallImage, styles.placeholder, { backgroundColor: colors.primarySoft }]}>
      <Feather name="shopping-bag" size={28} color={colors.primary} />
    </View>
  );
}

function HorizontalLoading({
  colors,
  label,
}: {
  colors: ReturnType<typeof useColors>;
  label: string;
}) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function SectionMessage({
  icon,
  message,
  actionLabel,
  onAction,
  colors,
  isAr,
}: {
  icon: ActionIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  return (
    <View
      style={[
        styles.sectionMessage,
        { backgroundColor: colors.card, borderColor: colors.border, direction: isAr ? 'rtl' : 'ltr' },
      ]}
    >
      <Feather name={icon} size={22} color={colors.mutedForeground} />
      <Text style={[styles.sectionMessageText, { color: colors.mutedForeground }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.retryText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  statusBar: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 3,
  },
  statusTime: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  statusNotch: { width: 96, height: 15, borderRadius: 10, backgroundColor: '#000000', marginHorizontal: 18, marginTop: -3 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batteryShell: { width: 19, height: 10, borderWidth: 1, borderRadius: 3, padding: 1, justifyContent: 'center' },
  batteryFill: { width: '100%', height: '100%', borderRadius: 1 },
  guestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  guestLogo: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 42, height: 42, borderRadius: 21 },
  brandCopy: { flex: 1 },
  guestGreetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  guestStatusPill: { fontFamily: 'Inter_600SemiBold', fontSize: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 1 },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  brandEnglish: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  guestAuthActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  guestActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  guestButton: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonPrimary: { borderWidth: 0 },
  guestButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButtonWrap: { position: 'relative' },
  notificationDot: {
    position: 'absolute',
    top: 8,
    start: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    end: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 12 },
  searchBar: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  homeBannerSection: { gap: 8 },
  homeBannerScroller: {},
  homeBannerSlide: { height: 202, borderRadius: 24, overflow: 'hidden', position: 'relative', backgroundColor: '#163a65' },
  homeBannerImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  homeBannerShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.58 },
  homeBannerContent: { position: 'absolute', left: 18, right: 18, bottom: 16, gap: 6 },
  homeBannerBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  homeBannerBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  homeBannerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 21, lineHeight: 27 },
  homeBannerBody: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, maxWidth: '88%' },
  homeBannerCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, marginTop: 3 },
  homeBannerCtaText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  homeBannerDots: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  homeBannerDot: { width: 5, height: 5, borderRadius: 3 },
  homeBannerDotActive: { width: 16 },
  guestSearchBar: { borderWidth: 0, minHeight: 48, borderRadius: 16, paddingHorizontal: 13 },
  searchTextButton: { flex: 1, minHeight: 40, alignItems: 'stretch', justifyContent: 'center' },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchDivider: { width: 1, height: 17 },
  searchText: {
    flexShrink: 1,
    alignSelf: 'stretch',
    height: 24,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  guestHero: { minHeight: 228, borderRadius: 24, padding: 18, overflow: 'hidden', position: 'relative' },
  guestHeroOrb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -76, left: -58, opacity: 0.95 },
  guestHeroOrbSecondary: { position: 'absolute', width: 130, height: 130, borderRadius: 65, bottom: -74, right: -35, opacity: 0.3 },
  guestHeroBag: { position: 'absolute', left: 11, bottom: 8, opacity: 0.2 },
  guestHeroContent: { zIndex: 1, gap: 8, maxWidth: '86%' },
  guestHeroKicker: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 9, paddingVertical: 5 },
  guestHeroSparkle: { fontSize: 11 },
  guestHeroKickerText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  guestHeroTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, lineHeight: 27, marginTop: 2 },
  guestHeroSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17, maxWidth: 260 },
  guestHeroActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 5 },
  guestHeroPrimaryButton: { minHeight: 36, borderRadius: 12, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  guestHeroPrimaryText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  guestHeroSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textDecorationLine: 'underline' },
  welcomeCard: {
    minHeight: 140,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  welcomeAccentBase: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
  },
  welcomeAccentLtr: { right: -48 },
  welcomeAccentRtl: { left: -48 },
  heroContent: { flex: 1, justifyContent: 'space-between', gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  heroKickerText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  heroCopy: { flex: 1 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 26 },
  welcomeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroButton: {
    minHeight: 34,
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  heroDiscount: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  viewAll: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    justifyContent: 'space-between',
    gap: 12,
  },
  actionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, flex: 1 },
  actionDescription: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: -5 },
  horizontalList: { gap: 14, paddingEnd: 20 },
  featuredGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    flex: 1,
    minWidth: 140,
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, flex: 1 },
  mallCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  mallImageWrap: { position: 'relative', height: 84 },
  mallImage: { width: '100%', height: '100%' },
  mallCardBody: {
    flex: 1,
    paddingHorizontal: 9,
     paddingVertical: 9,
     justifyContent: 'flex-start',
     gap: 7,
  },
  mallName: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 15 },
  mallAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  mallAddressText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionCard: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  offerCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  offerImage: { width: '100%', height: 84 },
  offerBody: { flex: 1, padding: 10, justifyContent: 'flex-start', gap: 8 },
  offerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, lineHeight: 15 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  productCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  productImage: { width: '100%', height: 84 },
  productBody: { flex: 1, padding: 10, justifyContent: 'flex-start', gap: 8 },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, lineHeight: 15 },
  productPrice: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  loadingRow: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  sectionMessage: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionMessageText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});