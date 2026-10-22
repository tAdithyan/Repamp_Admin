import api from './axiosInstance';

const dataOf = (response) => response.data?.data ?? response.data;
const listOf = (response) => {
  const data = dataOf(response);
  return Array.isArray(data) ? data : [];
};

export const getDashboard = (params = {}) => api.get('/v1/dashboard', { params }).then(dataOf);
export const getPickups = () => api.get('/v1/pickups').then(listOf);
export const getUsers = (params = {}) => api.get('/v1/users', { params }).then(listOf);
export const getBins = () => api.get('/v1/bins').then(listOf);
export const getWastePrices = () => api.get('/v1/waste-prices').then(listOf);
export const getShifts = () => api.get('/v1/shifts').then(listOf);
export const getRoles = () => api.get('/v1/roles').then(listOf);
export const getPermissions = () => api.get('/v1/permissions').then(listOf);
export const getRecurringPickups = () => api.get('/v1/recurring-pickups').then(listOf);
export const getCollections = (contractId) => api.get(`/v1/recurring-pickups/${contractId}/collections`).then(listOf);
export const getInvoices = (params = {}) => api.get('/v1/monthly-invoices', { params }).then(listOf);
export const getClientDashboard = () => api.get('/v1/client-portal/dashboard').then(dataOf);
export const getScannedBin = (token) => api.get(`/v1/bins/scan/${token}`).then(dataOf);

