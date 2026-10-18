import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';
import { router } from 'expo-router';

// In Expo, process.env variables need to be prefixed with EXPO_PUBLIC_
// Ensure this is set in apps/mobile/.env
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      await removeToken();
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default client;
