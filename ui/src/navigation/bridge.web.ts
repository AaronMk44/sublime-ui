import { useNavigate, useLocation, useParams } from 'react-router-dom';
import type { Nav } from './nav.types';

export function useWebNav(
  pathOf: (name: string, params?: unknown) => string,
  nameOf: (path: string) => string,
): Nav {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  return {
    turnTo: (name, p) => navigate(pathOf(name, p)),
    turnBack: () => navigate(-1),
    current: () => nameOf(location.pathname),
    params: <T,>() => params as unknown as T,
  };
}
