import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PortalApi } from '../services/portalApi';
import { createMockPortalApi } from '../services/mockPortalApi';
import { createRealPortalApi } from '../services/realPortalApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'; // default true

const ApiContext = createContext<PortalApi | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => (USE_MOCK ? createMockPortalApi() : createRealPortalApi()), []);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): PortalApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within <ApiProvider>');
  return ctx;
}
