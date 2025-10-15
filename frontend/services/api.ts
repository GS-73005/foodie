import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: any) => api.post('/register', data),
  login: (data: any) => api.post('/login', data),
  getMe: () => api.get('/me'),
};

export const userAPI = {
  getUser: (userId: string) => api.get(`/users/${userId}`),
  updateUser: (userId: string, data: any) => api.put(`/users/${userId}`, data),
  updateLocation: (userId: string, data: any) => api.put(`/users/${userId}/location`, data),
  followUser: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollowUser: (userId: string) => api.post(`/users/${userId}/unfollow`),
  searchUsers: (query: string, filterType?: string) => 
    api.get('/users/search', { params: { q: query, filter_type: filterType } }),
  getUserPosts: (userId: string, skip = 0, limit = 20) => 
    api.get(`/users/${userId}/posts`, { params: { skip, limit } }),
};

export const postAPI = {
  createPost: (data: any) => api.post('/posts', data),
  getTrendingFeed: (city?: string, skip = 0, limit = 20) => 
    api.get('/posts/feed/trending', { params: { city, skip, limit } }),
  getFollowingFeed: (skip = 0, limit = 20) => 
    api.get('/posts/feed/following', { params: { skip, limit } }),
  getPost: (postId: string) => api.get(`/posts/${postId}`),
  likePost: (postId: string) => api.post(`/posts/${postId}/like`),
  unlikePost: (postId: string) => api.post(`/posts/${postId}/unlike`),
  addComment: (postId: string, text: string) => 
    api.post(`/posts/${postId}/comments`, { text }),
  getComments: (postId: string) => api.get(`/posts/${postId}/comments`),
};

export const promoAPI = {
  getPromoRequests: (restaurantId: string) => 
    api.get(`/restaurants/${restaurantId}/promo_requests`),
  approvePromo: (restaurantId: string, postId: string, data: any) => 
    api.post(`/restaurants/${restaurantId}/promo_requests/${postId}/approve`, data),
  rejectPromo: (restaurantId: string, postId: string) => 
    api.post(`/restaurants/${restaurantId}/promo_requests/${postId}/reject`),
  redeemPromo: (restaurantId: string, data: any) => 
    api.post(`/restaurants/${restaurantId}/redeem_promo`, data),
};

export const loyaltyAPI = {
  getLoyaltyPoints: (foodieId: string) => api.get(`/users/${foodieId}/loyalty_points`),
  getRestaurantLoyaltyPoints: (restaurantId: string) => 
    api.get(`/restaurants/${restaurantId}/loyalty_points`),
};

export default api;
