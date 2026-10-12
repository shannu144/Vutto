import axios from 'axios';
import type { Auction, User, Bid, SystemOverview } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vutto_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await apiClient.post('/api/auth/login', { email, password });
    return res.data;
  },

  async register(data: { email: string; password: string; name: string; role?: string }): Promise<{ token: string; user: User }> {
    const res = await apiClient.post('/api/auth/register', data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },

  async getAuctions(status?: string, search?: string): Promise<{ auctions: Auction[]; total: number }> {
    const params: any = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const res = await apiClient.get('/api/auctions', { params });
    return res.data;
  },

  async getAuctionById(id: string): Promise<Auction> {
    const res = await apiClient.get(`/api/auctions/${id}`);
    return res.data;
  },

  async placeBid(auctionId: string, amount: number): Promise<{ message: string; bid: Bid; auction: Auction }> {
    const res = await apiClient.post('/api/bids', { auctionId, amount });
    return res.data;
  },

  async getMyBids(): Promise<Bid[]> {
    const res = await apiClient.get('/api/bids/my-bids');
    return res.data;
  },

  async createAuction(data: any): Promise<Auction> {
    const res = await apiClient.post('/api/admin/auctions', data);
    return res.data;
  },

  async startAuction(id: string): Promise<Auction> {
    const res = await apiClient.post(`/api/admin/auctions/${id}/start`);
    return res.data;
  },

  async endAuction(id: string): Promise<Auction> {
    const res = await apiClient.post(`/api/admin/auctions/${id}/end`);
    return res.data;
  },

  async cancelAuction(id: string, reason?: string): Promise<Auction> {
    const res = await apiClient.post(`/api/admin/auctions/${id}/cancel`, { reason });
    return res.data;
  },

  async toggleBotSimulation(enable: boolean): Promise<{ isRunning: boolean }> {
    const res = await apiClient.post('/api/admin/bot-simulation', { enable });
    return res.data;
  },

  async getBotStatus(): Promise<{ isRunning: boolean }> {
    const res = await apiClient.get('/api/admin/bot-simulation');
    return res.data;
  },

  async getSystemOverview(): Promise<SystemOverview> {
    const res = await apiClient.get('/api/admin/system-overview');
    return res.data;
  },
};
