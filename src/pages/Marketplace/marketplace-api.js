import { useQuery } from '@tanstack/react-query';
import api from '../../api/axiosInstance';

export const marketApi = '/v1/admin/marketplace';
export const rupees = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
export function useMarketQuery(key, path) {
  return useQuery({ queryKey: ['marketplace-admin', key, path], queryFn: async () => (await api.get(marketApi + path)).data.data, refetchOnMount: 'always' });
}
