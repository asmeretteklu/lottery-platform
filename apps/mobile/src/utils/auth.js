import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'lottery_token';

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token from SecureStore:', error);
    return null;
  }
}

export async function setToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting token in SecureStore:', error);
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token from SecureStore:', error);
  }
}
