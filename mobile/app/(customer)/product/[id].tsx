import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useProduct } from '@/src/features/catalog/useCatalogHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { formatProductAmount, formatProductPrice } from '@/src/utils/productPresentation';
import { AppButton } from '@/src/components/AppButton';
import { CartButton } from '@/src/components/CartButton';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import i18n from '@/src/i18n';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const [quantity, setQuantity] = useState(1);
  
  const { data: product, isLoading, isError, refetch } = useProduct(Number(id));

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

  const imageUrl = getProductImageUrl(product);
  const productName = isAr ? product.name_ar : product.name_en || product.name_ar;
  const productDescription = isAr ? product.description_ar || product.description_en : product.description_en || product.description_ar;
  const categoryName = isAr ? product.category?.name_ar : product.category?.name_en;
  const hasOriginalPrice = Number(product.price) > Number(product.current_price);
  const isAvailable = product.is_active !== false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.imageContainer, { backgroundColor: '#f6f8fa' }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={64} color={colors.mutedForeground} />
            </View>
          )}
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
            <CartButton />
          </View>
          <View style={[styles.qualityBadge, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15,23,42,0.05)' }]}>
            <View style={styles.qualityDot} />
            <Text style={[styles.qualityText, { color: colors.foreground }]}>{t('product.quality_guaranteed')}</Text>
          </View>
        </View>

        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.categoryTag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
              {categoryName || product.brand || t('product.details')}
            </Text>
            <View style={styles.availability}>
              <View style={[styles.availabilityDot, { backgroundColor: isAvailable ? colors.success : colors.destructive }]} />
              <Text style={[styles.availabilityText, { color: isAvailable ? colors.success : colors.destructive }]}>
                {isAvailable ? t('product.in_stock') : t('product.out_of_stock')}
              </Text>
            </View>
          </View>
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
                  unitType: product.unit_type,
                  pricingType: product.pricing_type,
                });
                Alert.alert(t('cart.added_title'), t('cart.added_message'));
              }}
              style={styles.addButtonPressable}
            >
              <Feather name="shopping-bag" size={19} color="#fff" />
              <Text style={styles.addButtonText}>{isAvailable ? t('product.add_to_cart') : t('product.out_of_stock')}</Text>
            </Pressable>
          </LinearGradient>
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
  supportingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  }
});
