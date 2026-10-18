import { Alert } from 'react-native';

const toast = {
  success: (message) => Alert.alert('✅ Success', message),
  error: (message) => Alert.alert('❌ Error', message),
  info: (message) => Alert.alert('ℹ️ Info', message),
};

export default toast;
