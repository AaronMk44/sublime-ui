import { useNavigation, useRoute } from '@react-navigation/native';
import type { Nav } from './nav.types';

export function useNativeNav(): Nav {
  const navigation = useNavigation<any>();
  const route = useRoute();
  return {
    turnTo: (name, params) => navigation.navigate(name as never, params as never),
    turnBack: () => navigation.goBack(),
    current: () => route.name,
    params: <T,>() => (route.params ?? {}) as T,
  };
}
