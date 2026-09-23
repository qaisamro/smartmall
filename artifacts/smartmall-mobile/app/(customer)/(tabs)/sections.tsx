import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Image } from 'expo-image';
import { useHomeBanners, useSections } from '@/src/features/catalog/useCatalogHooks';
import { getAppDirection } from '@/src/i18n';
import { AppButton } from '@/src/components/AppButton';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { imageRequestHeaders, normalizeImageUrl } from '@/src/services/imageUrl';
import type { HomeBanner } from '@/src/types/api';

const sectionIcons: Array<keyof typeof Feather.glyphMap> = [
  'shopping-bag',
  'coffee',
  'monitor',
  'heart',
  'home',
  'truck',
];
export default function SectionsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const direction = getAppDirection(i18n.language);
  const isAr = direction === 'rtl';
  const sectionsQuery = useSections();
  const sections = sectionsQuery.data ?? [];
  const bottomBannersQuery = useHomeBanners('bottom');
  const topBannersQuery = useHomeBanners('top');
  const banner = bottomBannersQuery.data?.[0] ?? topBannersQuery.data?.[0];
  const cardWidth = Math.max(0, (width - 40) / 2);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background, direction }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 250 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={sectionsQuery.isRefetching}
            onRefresh={() => void sectionsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.header, { direction }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={19} color={colors.foreground} />
          </Pressable>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowText}>{t('search.quick_categories')}</Text>
          </View>
        </View>

        {sectionsQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('common.loading')}</Text>
          </View>
        ) : sectionsQuery.isError ? (
          <View style={styles.state}>
            <Feather name="alert-circle" size={30} color={colors.destructive} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('error.network')}</Text>
            <AppButton label={t('common.retry')} onPress={() => void sectionsQuery.refetch()} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.state}>
            <Feather name="grid" size={30} color={colors.mutedForeground} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('home.no_sections')}</Text>
          </View>
        ) : (
          <View style={[styles.grid, { direction }]}>
            {sections.map((section) => (
              <Pressable
                key={section.id}
                accessibilityRole="button"
                accessibilityLabel={(isAr ? section.name_ar : section.name_en) || section.name_ar}
                onPress={() => router.replace('/(customer)/(tabs)/malls')}
                style={({ pressed }) => [
                  styles.card,
                  {
                    width: cardWidth,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.72 : 1,
                    direction,
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
                    <Feather name={sectionIcons[section.id % sectionIcons.length]} size={21} color={colors.foreground} />
                  </View>
                  <View style={[styles.arrowCircle, { backgroundColor: colors.secondary }]}>
                    <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={14} color={colors.mutedForeground} />
                  </View>
                </View>
                <Text style={[styles.cardLabel, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={3}>
                  {(isAr ? section.name_ar : section.name_en) || section.name_ar}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={[styles.fixedBanner, { bottom: insets.bottom + 70, backgroundColor: colors.background }]}>
        <SectionBanner
          banner={banner}
          colors={colors}
          isAr={isAr}
          label={t('mall.bottom_banner_label')}
          fallbackTitle={t('search.quick_categories')}
          fallbackBody=""
        />
      </View>
      <ReferenceBottomNav activeTab="malls" />
    </View>
  );
}

function SectionBanner({
  banner,
  colors,
  isAr,
  label,
  fallbackTitle,
  fallbackBody,
}: {
  banner?: HomeBanner;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
  label: string;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  const imageUrl = banner ? normalizeImageUrl(banner.image_url || banner.image) : null;
  const title = banner
    ? (isAr ? banner.title_ar || banner.title_en : banner.title_en || banner.title_ar)
    : fallbackTitle;
  const body = banner
    ? (isAr ? banner.body_ar || banner.body_en : banner.body_en || banner.body_ar)
    : fallbackBody;
  const badge = banner
    ? (isAr ? banner.badge_ar || banner.badge_en : banner.badge_en || banner.badge_ar)
    : label;
  const cta = banner
    ? (isAr ? banner.cta_label_ar || banner.cta_label_en : banner.cta_label_en || banner.cta_label_ar)
    : '';

  const openBanner = () => {
    if (!banner) {
      router.push('/(customer)/(tabs)/malls' as never);
      return;
    }
    if (!banner.link_url || banner.link_type === 'none') return;
    if (banner.link_type === 'external') {
      void Linking.openURL(banner.link_url);
      return;
    }
    router.push(banner.link_url as never);
  };

  return (
    <Pressable onPress={openBanner} style={[styles.banner, { backgroundColor: colors.primary }]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl, headers: imageRequestHeaders }}
          style={styles.bannerImage}
          contentFit="cover"
          contentPosition={banner?.image_position === 'left' ? 'left' : banner?.image_position === 'right' ? 'right' : 'center'}
        />
      ) : null}
      <View style={[styles.bannerShade, { backgroundColor: colors.primary }]} />
      <View style={[styles.bannerContent, { direction: isAr ? 'rtl' : 'ltr' }]}>
        <View style={styles.bannerTopline}>
          <View style={[styles.bannerBadge, { backgroundColor: colors.primarySoft }]}>
            <Feather name="zap" size={11} color={colors.warning} />
            <Text style={[styles.bannerBadgeText, { color: colors.onImageMuted }]}>{badge || label}</Text>
          </View>
          <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={17} color={colors.onImageMuted} />
        </View>
        <Text style={[styles.bannerTitle, { color: colors.onImage }]} numberOfLines={2}>{title}</Text>
        {body ? <Text style={[styles.bannerBody, { color: colors.onImageMuted }]} numberOfLines={2}>{body}</Text> : null}
        {cta ? (
          <View style={[styles.bannerCta, { backgroundColor: colors.card }]}>
            <Text style={[styles.bannerCtaText, { color: colors.primary }]}>{cta}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    gap: 9,
    paddingTop: 4,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' },
  eyebrowText: { color: '#64748b', fontFamily: 'Inter_700Bold', fontSize: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fixedBanner: { position: 'absolute', left: 12, right: 12, zIndex: 10, paddingTop: 8 },
  banner: { minHeight: 190, borderRadius: 24, overflow: 'hidden', position: 'relative', marginTop: 2 },
  bannerImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bannerShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.67 },
  bannerContent: { padding: 18, gap: 7, zIndex: 1 },
  bannerTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  bannerBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  bannerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 21, lineHeight: 27, maxWidth: '90%' },
  bannerBody: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, maxWidth: '88%' },
  bannerCta: { alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7, marginTop: 3 },
  bannerCtaText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  card: {
    minHeight: 124,
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    lineHeight: 37,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    zIndex: 1,
  },
  state: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    maxWidth: 300,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});