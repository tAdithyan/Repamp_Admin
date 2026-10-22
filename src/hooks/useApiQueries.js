import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import * as requests from '../api/queries';

export const useDashboard = (params = {}) => useQuery({ queryKey: [...queryKeys.dashboard, params], queryFn: () => requests.getDashboard(params) });
export const usePickups = () => useQuery({ queryKey: queryKeys.pickups, queryFn: requests.getPickups });
export const useUsers = (params = {}) => useQuery({ queryKey: queryKeys.users(params), queryFn: () => requests.getUsers(params) });
export const useBins = () => useQuery({ queryKey: queryKeys.bins, queryFn: requests.getBins });
export const useWastePrices = () => useQuery({ queryKey: queryKeys.wastePrices, queryFn: requests.getWastePrices });
export const useShifts = (options = {}) => useQuery({ queryKey: queryKeys.shifts, queryFn: requests.getShifts, ...options });
export const useRoles = () => useQuery({ queryKey: queryKeys.roles, queryFn: requests.getRoles });
export const usePermissions = () => useQuery({ queryKey: queryKeys.permissions, queryFn: requests.getPermissions });
export const useRecurringPickups = () => useQuery({ queryKey: queryKeys.recurringPickups, queryFn: requests.getRecurringPickups });
export const useCollections = (contractId, options = {}) => useQuery({ queryKey: queryKeys.collections(contractId), queryFn: () => requests.getCollections(contractId), enabled: Boolean(contractId), ...options });
export const useInvoices = (params = {}) => useQuery({ queryKey: queryKeys.invoices(params), queryFn: () => requests.getInvoices(params) });
export const useClientDashboard = () => useQuery({ queryKey: queryKeys.clientDashboard, queryFn: requests.getClientDashboard });
export const useScannedBin = (token) => useQuery({ queryKey: queryKeys.scannedBin(token), queryFn: () => requests.getScannedBin(token), enabled: Boolean(token) });

