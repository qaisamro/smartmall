import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useProduct } from '@/src/features/catalog/useCatalogHooks';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getProductImageUrl, imageRequestHeaders, normalizeImageUrl } from '@/src/services/imageUrl';
import { formatProductAmount, formatProductPrice, getProductMetadata, getProductUnitLabel } from '@/src/utils/productPresentation';
import { toWesternDigits } from '@/src/utils/numberFormat';
import { AppButton } from '@/src/components/AppButton';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import i18n from '@/src/i18n';

export default function ProductDetailsScreen() {
  const { id, offer_image, store_name } = useLocalSearchParams<{
    id: string;
    offer_image?: string | string[];
    store_name?: string | string[];
  }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const [quantity, setQuantity] = useState(1);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const closeImageViewer = () => setIsImageViewerVisible(false);
  
  const { data: product, isLoading, isError, refetch } = useProduct(Number(id));
  const { data: malls } = useMalls();

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-triangle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
        <AppButton label={t('common.retry')} onPress={refetch} />
      </View>
    );
  }

  if (isLoading || !product) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const offerImageUrl = normalizeImageUrl(Array.isArray(offer_image) ? offer_image[0] : offer_image);
  const imageUrl = offerImageUrl || getProductImageUrl(product);
  const routeStoreName = Array.isArray(store_name) ? store_name[0] : store_name;
  const mall = malls?.find((item) => item.id === product.mall_id);
  const mallName = routeStoreName || (isAr ? mall?.name_ar || mall?.name_en : mall?.name_en || mall?.name_ar);
  const productName = isAr ? product.name_ar : product.name_en || product.name_ar;
  const productMetadata = getProductMetadata(product);
  const productDescription = isAr
    ? product.description_ar || productMetadata.description_en
    : productMetadata.description_en || product.description_ar;
  const categoryName = isAr ? product.category?.name_ar : product.category?.name_en;
  const hasOriginalPrice = Number(product.price) > Number(product.current_price);
  const isAvailable = product.is_active !== false;
  const pricingTypeLabels: Record<string, string> = {
    fixed: t('product.pricing_fixed'),
    per_unit: t('product.pricing_per_unit'),
    per_weight: t('product.pricing_per_weight'),
  };
  const unitLabel = getProductUnitLabel(product, isAr);
  const productDetailRows = [
    unitLabel ? { label: t('product.unit'), value: unitLabel } : null,
    productMetadata.pricing_type
      ? {
          label: t('product.pricing_type'),
          value: pricingTypeLabels[productMetadata.pricing_type] ?? productMetadata.pricing_type,
        }
      : null,
    productMetadata.weight !== null && productMetadata.weight !== undefined
      ? {
          label: t('product.weight'),
          value: `${toWesternDigits(productMetadata.weight)}${unitLabel ? ` ${unitLabel}` : ''}`,
        }
      : null,
    productMetadata.options?.cut ? { label: t('product.cut'), value: String(productMetadata.options.cut) } : null,
    productMetadata.options?.preparation
      ? { label: t('product.preparation'), value: String(productMetadata.options.preparation) }
      : null,
    productMetadata.options?.notes ? { label: t('product.notes'), value: String(productMetadata.options.notes) } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.imageContainer, { backgroundColor: '#f6f8fa' }]}>
          {imageUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={productName}
              accessibilityHint={t('product.details')}
              onPress={() => setIsImageViewerVisible(true)}
              style={styles.imagePressable}
            >
              <Image
                source={{ uri: imageUrl, headers: imageRequestHeaders }}
                style={styles.image}
                contentFit="cover"
              />
            </Pressable>
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={64} color={colors.mutedForeground} />
            </View>
          )}
          {imageUrl ? (
            <View style={[styles.zoomHint, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: colors.border }]}>
              <Feather name="maximize-2" size={17} color={colors.foreground} />
            </View>
          ) : null}
          <LinearGradient
            colors={['rgba(246,248,250,0.18)', 'rgba(255,255,255,0.96)']}
            style={styles.imageAmbientGradient}
          />
          <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15,23,42,0.05)' }]}
            >
              <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={[styles.qualityBadge, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15,23,42,0.05)' }]}>
            <View style={styles.qualityDot} />
            <Text style={[styles.qualityText, { color: colors.foreground }]}>{t('product.quality_guaranteed')}</Text>
          </View>
        </View>
        {imageUrl ? (
          <Modal
            visible={isImageViewerVisible}
            transparent
            animationType="fade"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={closeImageViewer}
            onDismiss={closeImageViewer}
          >
            <View style={[styles.imageViewer, { backgroundColor: colors.overlayStrong }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={closeImageViewer}
                style={[
                  styles.imageViewerClose,
                  {
                    top: insets.top + 14,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
              <View style={styles.imageViewerImageWrap}>
                <Image
                  source={{ uri: imageUrl, headers: imageRequestHeaders }}
                  style={styles.imageViewerImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </View>
            </View>
          </Modal>
        ) : null}

        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.categoryTag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
              {categoryName || product.brand || t('product.details')}
            </Text>
          </View>
          {mallName ? (
            <View style={[styles.storeRow, { direction }]}>
              <View style={[styles.storeIcon, { backgroundColor: colors.primarySoft }]}>
                <Feather name="shopping-bag" size={15} color={colors.primary} />
              </View>
              <View style={styles.storeCopy}>
                <Text style={[styles.storeLabel, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
                  {t('product.store')}
                </Text>
                <Text style={[styles.storeName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                  {mallName}
                </Text>
              </View>
            </View>
          ) : null}
          <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{productName}</Text>
          {productDescription ? (
            <Text style={[styles.description, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
              {productDescription}
            </Text>
          ) : null}

          <View style={[styles.purchaseRow, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
            <View style={styles.priceBlock}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>{t('product.total_price')}</Text>
              <View style={styles.priceLine}>
                <Text style={[styles.price, { color: colors.primary }]}>{formatProductPrice(product, isAr)}</Text>
              </View>
              {hasOriginalPrice ? (
                <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>{formatProductAmount(product, product.price, isAr)}</Text>
              ) : null}
            </View>
            <View style={[styles.quantityControl, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('product.quantity_decrease')}
                onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                style={[styles.quantityButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.quantitySymbol, { color: colors.foreground }]}>−</Text>
              </Pressable>
              <Text style={[styles.quantityValue, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('product.quantity_increase')}
                onPress={() => setQuantity((current) => Math.min(99, current + 1))}
                style={[styles.quantityButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.quantitySymbol, { color: colors.foreground }]}>+</Text>
              </Pressable>
            </View>
          </View>

          {mall?.enable_quantity_system ? (
            <View style={[styles.stockStatus, { borderColor: isAvailable ? colors.success : colors.destructive }]}>
              <View style={[styles.availabilityDot, { backgroundColor: isAvailable ? colors.success : colors.destructive }]} />
              <Text style={[styles.availabilityText, { color: isAvailable ? colors.success : colors.destructive }]}>
                {isAvailable ? t('product.in_stock') : t('product.out_of_stock')}
              </Text>
            </View>
          ) : null}

          <LinearGradient
            colors={['#152e5a', '#1e3a70', '#152e5a']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.addButton, !isAvailable && styles.disabledButton]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('product.add_to_cart')}
              disabled={!isAvailable}
              onPress={() => {
                if (!isAuthenticated) {
                  router.push('/(auth)/login');
                  return;
                }
                addItem({
                  productId: product.id,
                  mallId: product.mall_id,
                  name: productName,
                  unitPrice: Number(product.current_price),
                  quantity,
                  imageUrl: imageUrl ?? undefined,
                  unit: product.unit,
                   unitType: productMetadata.unit_type,
                   pricingType: productMetadata.pricing_type,
                   weight: productMetadata.weight == null ? null : Number(productMetadata.weight),
                   options: productMetadata.options,
                });
                Alert.alert(t('cart.added_title'), t('cart.added_message'));
              }}
              style={styles.addButtonPressable}
            >
              <Feather name="shopping-bag" size={19} color="#fff" />
              <Text style={styles.addButtonText}>{isAvailable ? t('product.add_to_cart') : t('product.out_of_stock')}</Text>
            </Pressable>
          </LinearGradient>
          {productDetailRows.length > 0 ? (
            <View style={[styles.detailsCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.detailsTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
                {t('product.details')}
              </Text>
              <View style={styles.detailsGrid}>
                {productDetailRows.map((row) => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {product.brand || product.unit ? (
            <View style={styles.supportingInfo}>
              {product.brand ? <Text style={[styles.supportingText, { color: colors.mutedForeground }]}>{t('product.brand')}: {product.brand}</Text> : null}
              {product.unit ? <Text style={[styles.supportingText, { color: colors.mutedForeground }]}>{t('product.unit')}: {product.unit}</Text> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 370,
    position: 'relative',
  },
  imagePressable: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAmbientGradient: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  zoomHint: {
    position: 'absolute',
    left: 24,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  imageViewer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  imageViewerImageWrap: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  qualityBadge: {
    position: 'absolute',
    right: 24,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  qualityText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
    marginTop: -18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    position: 'relative',
    zIndex: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  storeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCopy: {
    flex: 1,
    gap: 1,
  },
  storeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  storeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  categoryTag: {
    maxWidth: '60%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stockStatus: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  title: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 25,
    lineHeight: 33,
    marginBottom: 7,
  },
  description: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 17,
  },
  priceBlock: {
    gap: 1,
  },
  priceLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 25,
  },
  originalPrice: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  quantitySymbol: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    lineHeight: 20,
  },
  quantityValue: {
    width: 22,
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
  },
  addButton: {
    minHeight: 58,
    borderRadius: 17,
    overflow: 'hidden',
    shadowColor: '#1e3a70',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.55,
  },
  addButtonPressable: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  supportingInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  detailsCard: {
    marginTop: 4,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  detailsTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    marginBottom: 10,
  },
  detailsGrid: {
    gap: 9,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  detailValue: {
    flex: 1.4,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  supportingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  }
});
