import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

export function MallMap({
  latitude,
  longitude,
  mallName,
  mallLocation,
}: {
  latitude: number;
  longitude: number;
  mallName: string;
  mallLocation: string;
}) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }}
      mapType="standard"
    >
      <Marker coordinate={{ latitude, longitude }} title={mallName} description={mallLocation} />
    </MapView>
  );
}