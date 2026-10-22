import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';

const Context = createContext();
export const useSidebarAccess = () => useContext(Context);
export function SidebarAccessProvider({ children }) {
  const { appUser } = useContext(AuthContext);
  const query = useQuery({
    queryKey: ['sidebar-access', appUser?.id || appUser?._id || appUser?.userId, appUser?.role],
    queryFn: async ({ signal }) => {
      const response = await api.get('/v1/sidebar-access/mine', { signal });
      if (!Array.isArray(response.data?.data?.sections)) throw new Error('Invalid sidebar settings');
      return response.data.data.sections;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: 1,
  });
  return <Context.Provider value={{ sections: query.data || [], loading: query.isPending, error: query.isError, retry: query.refetch }}>{children}</Context.Provider>;
}
export function SidebarPageGuard({ children }) {
  const { sections, loading, error, retry } = useSidebarAccess();
  const { appUser } = useContext(AuthContext);
  const { pathname } = useLocation();
  const section = pathname.split('/')[2] || 'dashboard';
  const isAdmin = ['ROL_1', 'ROL_2', 'SuperAdmin', 'Admin'].includes(appUser?.role);
  const adminManagedSections = ['service-areas', 'complaints', 'content-pages'];
  if (section === 'account' || (adminManagedSections.includes(section) && isAdmin)) return children;
  if (loading) return <p role="status">Loading your sidebar access…</p>;
  if (error) return <div role="alert"><p>Unable to load sidebar access. Please ensure the backend has been updated, then retry.</p><button onClick={() => retry()}>Retry</button></div>;
  if (!sections.includes(section)) return <Navigate to={sections.length ? `/admin/${sections[0]}` : '/admin/account'} replace />;
  return children;
}
