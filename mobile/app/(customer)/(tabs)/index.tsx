import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
  useOffers,
  usePublicProducts,
  useSections,
} from '@/src/features/catalog/useCatalogHooks';
import { useUnreadNotificationCount } from '@/src/features/notifications/useNotificationsHooks';
import { getProductImageUrl, normalizeImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import { formatProductPrice } from '@/src/utils/productPresentation';
import { normalizeStoreType } from '@/src/types/storeTypes';
import i18n from '@/src/i18n';

type ActionIcon = keyof typeof Feather.glyphMap;

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

  const mallsQuery = useMalls();
  const offersQuery = useOffers();
  const sectionsQuery = useSections();
  const publicProductsQuery = usePublicProducts();
  const unreadNotificationsQuery = useUnreadNotificationCount({ enabled: isAuthenticated });
  const malls = mallsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const popularProducts = publicProductsQuery.data?.data ?? [];
  const isRefreshing =
    mallsQuery.isRefetching ||
    offersQuery.isRefetching ||
    sectionsQuery.isRefetching ||
    publicProductsQuery.isRefetching ||
    unreadNotificationsQuery.isRefetching;
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const horizontalInset = isGuest ? 32 : 40;
  const actionCardWidth = Math.max(0, (width - horizontalInset - 12) / 2);
  const compactCardWidth = Math.max(0, (width - horizontalInset - 12) / 2);

  const refreshHome = () => {
    void Promise.all([
      mallsQuery.refetch(),
      offersQuery.refetch(),
      sectionsQuery.refetch(),
      publicProductsQuery.refetch(),
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
      {isGuest ? (
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
            <Text style={[styles.searchText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {t('home.search_placeholder')}
            </Text>
          </Pressable>
          <View style={styles.searchActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.quick_scan')}
              onPress={() => router.push('/(auth)/login')}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.search_placeholder')}
          onPress={() => router.push('/(customer)/(tabs)/search')}
          style={({ pressed }) => [
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              direction,
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <Feather name="search" size={19} color={colors.mutedForeground} />
          <Text style={[styles.searchText, { color: colors.mutedForeground }]}>
            {t('home.search_placeholder')}
          </Text>
          <Feather name="sliders" size={17} color={colors.primary} />
        </Pressable>
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
          subtitle={isGuest ? undefined : t('home.browse_sections_subtitle')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/malls')}
          colors={colors}
          isAr={isAr}
        />
        {sectionsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : sections.length === 0 ? (
          <SectionMessage icon="grid" message={t('home.no_sections')} colors={colors} isAr={isAr} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {sections.slice(0, 10).map((section) => (
              <Pressable
                key={section.id}
                accessibilityRole="button"
                onPress={() => router.push('/(customer)/(tabs)/malls')}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
                  <Feather name="grid" size={17} color={colors.primary} />
                </View>
                <Text style={[styles.categoryChipText, { color: colors.foreground }]} numberOfLines={1}>
                  {(isAr ? section.name_ar : section.name_en) || section.name_ar}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            snapToInterval={Math.min(width * 0.84, 330) + 14}
            decelerationRate="fast"
          >
            {malls.slice(0, 6).map((mall) => (
              <Pressable
                key={mall.id}
                accessibilityRole="button"
                onPress={() => router.push(`/(customer)/mall/${mall.slug}`)}
                style={({ pressed }) => [
                  styles.mallCard,
                  {
                    width: Math.min(width * 0.84, 330),
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.mallImageWrap}>
                  <MallImage mall={mall} />
                  <View style={[styles.mallImageShade, { backgroundColor: colors.overlayStrong }]} />
                  <View
                    style={[
                      styles.mallStatus,
                      { backgroundColor: mall.is_active ? colors.success : colors.primary },
                    ]}
                  >
                    <View style={[styles.mallStatusDot, { backgroundColor: colors.onImage }]} />
                    <Text style={[styles.mallStatusText, { color: colors.onImage }]}>
                      {mall.is_active ? t('home.mall_open_now') : t('home.mall_verified')}
                    </Text>
                  </View>
                  <Text
                    style={[styles.mallName, { color: colors.onImage, textAlign: isAr ? 'right' : 'left' }]}
                    numberOfLines={1}
                  >
                    {isAr ? mall.name_ar : mall.name_en}
                  </Text>
                  <View style={[styles.mallRating, { backgroundColor: colors.overlay }]}>
                    <Feather name="star" size={10} color={colors.warning} />
                    <Text style={[styles.mallRatingText, { color: colors.warning }]}>4.9</Text>
                  </View>
                </View>
                <View style={[styles.mallMetaRow, { direction }]}>
                  <View style={[styles.mallMeta, { direction }]}>
                    <Feather name="clock" size={13} color={colors.primary} />
                    <Text
                      style={[styles.mallMetaText, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}
                      numberOfLines={1}
                    >
                      {mall.open_time && mall.close_time
                        ? `${mall.open_time} - ${mall.close_time}`
                        : normalizeStoreType(mall.type)
                          ? t(`mall.type_${normalizeStoreType(mall.type)}`)
                          : mall.type || t('home.mall_available')}
                    </Text>
                  </View>
                  <Text style={[styles.mallVisit, { color: colors.primary }]}>{t('home.mall_visit')}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
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
                return (
                  <Pressable
                    key={offer.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/(customer)/product/${offer.product_id}`)}
                    style={({ pressed }) => [
                      styles.offerCard,
                      {
                        width: compactCardWidth,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.offerImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.offerImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                        <Feather name="tag" size={28} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={[styles.offerBadge, { backgroundColor: colors.destructive }]}>
                      <Text style={[styles.offerBadgeText, { color: colors.destructiveForeground }]}>
                        {offer.type || t('home.offer_badge')}
                      </Text>
                    </View>
                    <View style={[styles.offerBody, { direction }]}>
                      <Text
                        style={[styles.offerTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                        numberOfLines={2}
                      >
                        {isAr ? offer.title_ar : offer.title_en}
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
            {popularProducts.slice(0, 8).map((product) => {
              const imageUrl = getProductImageUrl(product);
              return (
                <Pressable
                  key={product.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(customer)/product/${product.id}`)}
                  style={({ pressed }) => [
                    styles.productCard,
                      {
                        width: compactCardWidth,
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
                      {(isAr ? product.name_ar : product.name_en) || product.name_ar}
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
  const imageUrl = normalizeImageUrl(mall.cover_image || mall.logo);
  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={styles.mallImage} contentFit="cover" />
  ) : (
    <View style={[styles.mallImage, styles.placeholder, { backgroundColor: colors.primarySoft }]}>
      <Feather name="shopping-bag" size={40} color={colors.primary} />
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
  guestSearchBar: { borderWidth: 0, minHeight: 48, borderRadius: 16, paddingHorizontal: 13 },
  searchTextButton: { flex: 1, minHeight: 40, justifyContent: 'center' },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchDivider: { width: 1, height: 17 },
  searchText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
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
  categoryChip: {
    minWidth: 154,
    minHeight: 62,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  categoryChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, flexShrink: 1 },
  mallCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  mallImageWrap: { position: 'relative' },
  mallImage: { width: '100%', height: 144 },
  mallImageShade: { ...StyleSheet.absoluteFill, opacity: 0.72 },
  mallStatus: {
    position: 'absolute',
    top: 12,
    end: 12,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mallStatusDot: { width: 5, height: 5, borderRadius: 3 },
  mallStatusText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  mallName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  mallRating: {
    position: 'absolute',
    bottom: 10,
    start: 12,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mallRatingText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  mallMetaRow: { minHeight: 48, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mallMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  mallMetaText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  mallVisit: { fontFamily: 'Inter_700Bold', fontSize: 11 },
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
  offerCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  offerImage: { width: '100%', height: 112 },
  offerBadge: {
    position: 'absolute',
    top: 9,
    end: 9,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  offerBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  offerBody: { padding: 11, gap: 7 },
  offerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18, minHeight: 36 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  productCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  productImage: { width: '100%', height: 112 },
  productBody: { padding: 11, gap: 7 },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18, minHeight: 36 },
  productPrice: { fontFamily: 'Inter_700Bold', fontSize: 14 },
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