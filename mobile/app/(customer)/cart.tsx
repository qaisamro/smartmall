import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/AsyncState';
import { ReferenceBottomNav } from '@/src/components/ReferenceBottomNav';
import { useCartStore, type CartItem } from '@/src/store/cartStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatNumber } from '@/src/utils/numberFormat';

function quantityStep(unit?: string | null) {
  return unit && /كيلو|كجم|كغ|\bkg\b|kilo/i.test(unit) ? 0.1 : 1;
}

export default function CartScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const changeQuantity = (item: CartItem, delta: number) => {
    const next = Math.round((item.quantity + delta * quantityStep(item.unit)) * 10) / 10;
    updateQuantity(item.productId, item.mallId, next);
  };

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 56,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="arrow-right" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.titleShell}>
          <Text style={[styles.title, { color: colors.primary }]}>{t('cart.title') || 'سلة التسوق'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.emptyStateArea}>
          <EmptyState title={t('cart.empty_title')} message={t('cart.empty_message')} />
          <AppButton label={t('cart.start_shopping')} onPress={() => router.push('/(customer)/(tabs)/malls')} />
        </View>
        <ReferenceBottomNav activeTab={null} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.mallId}-${item.productId}`}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 180 }]}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={24} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.itemBody}>
              <View style={styles.itemHeader}>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemCode, { color: colors.mutedForeground }]}>
                    #{item.productId}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={t('cart.remove')}
                  onPress={() => removeItem(item.productId, item.mallId)}
                  style={styles.removeButton}
                >
                  <Feather name="trash-2" size={17} color={colors.destructive} />
                </Pressable>
              </View>
              <Text style={[styles.unitPrice, { color: colors.foreground }]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <View style={styles.itemFooter}>
                <View style={[styles.quantity, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Pressable
                    accessibilityLabel={t('cart.decrease')}
                    onPress={() => changeQuantity(item, -1)}
                    style={[styles.quantityButton, { backgroundColor: colors.card }]}
                  >
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.quantityValue, { color: colors.foreground }]}>
                    {formatNumber(item.quantity)}
                  </Text>
                  <Pressable
                    accessibilityLabel={t('cart.increase')}
                    onPress={() => changeQuantity(item, 1)}
                    style={[styles.quantityButton, { backgroundColor: colors.card }]}
                  >
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
                <Text style={[styles.lineTotal, { color: colors.foreground }]}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={() =>
                Alert.alert(t('cart.clear_title'), t('cart.clear_message'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('cart.clear'), style: 'destructive', onPress: clear },
                ])
              }
              style={styles.clearButton}
            >
              <Feather name="trash" size={16} color={colors.destructive} />
              <Text style={[styles.clearText, { color: colors.destructive }]}>{t('cart.clear')}</Text>
            </Pressable>
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  {t('cart.item_count')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatNumber(itemCount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  {t('cart.subtotal')}
                </Text>
                <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(subtotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(customer)/checkout')}
                style={({ pressed }) => [
                  styles.checkoutButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Text style={[styles.checkoutButtonText, { color: colors.primaryForeground }]}>
                  {t('cart.checkout')}
                </Text>
                <Feather name="arrow-left" size={16} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        }
      />
      <ReferenceBottomNav activeTab={null} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  emptyStateArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 82,
    gap: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 42, height: 42 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  titleShell: {
    flex: 1,
    minHeight: 42,
    marginHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    letterSpacing: 0.2,
  },
  item: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    minHeight: 132,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  image: { width: 80, height: 80, borderRadius: 12 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 5, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20 },
  itemCode: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  unitPrice: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  quantity: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 9, padding: 3 },
  quantityButton: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  lineTotal: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 14, marginTop: 0 },
  clearButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 4 },
  clearText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summary: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 17,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  total: { fontFamily: 'Inter_800ExtraBold', fontSize: 21 },
  checkoutButton: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  checkoutButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});