import { useNavigation, useRoute } from '@react-navigation/native';
import type { Nav } from './nav.types';

export function useNativeNav(): Nav {
  // react-navigation's hook is generic over the app's param list, which is only
  // known at the call site; `any` defers that binding to the typed `Nav` facade.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const route = useRoute();
  return {
    turnTo: (name, params) => navigation.navigate(name as never, params as never),
    turnBack: () => navigation.goBack(),
    current: () => route.name,
    params: <T,>() => (route.params ?? {}) as T,
  };
}
