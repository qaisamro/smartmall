import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function ReferenceStatusBar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          minHeight: 40 + insets.top,
          paddingTop: insets.top + 8,
          backgroundColor: colors.card,
        },
      ]}
    >
      <Text style={[styles.time, { color: colors.foreground }]}>9:41</Text>
      <View style={styles.notch} />
      <View style={styles.icons}>
        <Feather name="wifi" size={12} color={colors.foreground} />
        <Feather name="activity" size={12} color={colors.foreground} />
        <View style={[styles.battery, { borderColor: colors.foreground }]}>
          <View style={[styles.batteryFill, { backgroundColor: colors.foreground }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  time: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  notch: {
    width: 96,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#000',
    marginTop: -4,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  battery: {
    width: 19,
    height: 10,
    borderWidth: 1,
    borderRadius: 3,
    padding: 1,
    justifyContent: 'center',
  },
  batteryFill: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
});