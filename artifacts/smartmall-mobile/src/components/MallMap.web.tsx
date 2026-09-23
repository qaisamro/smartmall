import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const TILE_SIZE = 256;
const ZOOM = 15;
const TILE_RADIUS_X = 2;
const TILE_RADIUS_Y = 3;

export function MallMap({
  latitude,
  longitude,
  mallName,
}: {
  latitude: number;
  longitude: number;
  mallName: string;
  mallLocation: string;
}) {
  const worldSize = 2 ** ZOOM;
  const longitudeRatio = (longitude + 180) / 360;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const latitudeRatio =
    (1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2;
  const pixelX = longitudeRatio * worldSize;
  const pixelY = latitudeRatio * worldSize;
  const tileX = Math.floor(pixelX);
  const tileY = Math.floor(pixelY);
  const offsetX = (pixelX - tileX) * TILE_SIZE;
  const offsetY = (pixelY - tileY) * TILE_SIZE;
  const tiles = [];

  for (let yOffset = -TILE_RADIUS_Y; yOffset <= TILE_RADIUS_Y; yOffset += 1) {
    for (let xOffset = -TILE_RADIUS_X; xOffset <= TILE_RADIUS_X; xOffset += 1) {
      const requestedX = tileX + xOffset;
      const requestedY = tileY + yOffset;
      if (requestedY < 0 || requestedY >= worldSize) continue;
      const normalizedX = ((requestedX % worldSize) + worldSize) % worldSize;
      tiles.push({
        key: `${normalizedX}-${requestedY}`,
        uri: `https://tile.openstreetmap.org/${ZOOM}/${normalizedX}/${requestedY}.png`,
        left: xOffset * TILE_SIZE - offsetX,
        top: yOffset * TILE_SIZE - offsetY,
      });
    }
  }

  return (
    <View style={styles.mapCanvas} accessibilityLabel={mallName}>
      <View style={styles.tileLayer}>
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { transform: [{ translateX: tile.left }, { translateY: tile.top }] }]}
            contentFit="cover"
          />
        ))}
      </View>
      <View style={styles.marker} accessibilityLabel={mallName}>
        <View style={styles.markerHead}>
          <Feather name="shopping-bag" size={14} color="#fff" />
        </View>
        <View style={styles.markerStem} />
      </View>
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
  },
  tileLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  marker: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 42,
    height: 48,
    marginLeft: -21,
    marginTop: -43,
    alignItems: 'center',
  },
  markerHead: {
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  markerStem: {
    width: 12,
    height: 12,
    marginTop: -6,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#1e3a8a',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
  },
  attribution: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  attributionText: {
    color: '#334155',
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
  },
});