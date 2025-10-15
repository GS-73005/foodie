import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    profile_name: '',
    handle: '',
    user_type: 'Foodie' as 'Foodie' | 'Restaurant',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.profile_name || !formData.handle) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.handle.startsWith('@')) {
      Alert.alert('Error', 'Handle must start with @');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register(formData);
      const { token, ...userData } = response.data;
      
      await setToken(token);
      setUser(userData);
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Join the Circle</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              formData.user_type === 'Foodie' && styles.toggleButtonActive,
            ]}
            onPress={() => setFormData({ ...formData, user_type: 'Foodie' })}
          >
            <Ionicons
              name="person"
              size={20}
              color={formData.user_type === 'Foodie' ? '#fff' : '#999'}
            />
            <Text
              style={[
                styles.toggleText,
                formData.user_type === 'Foodie' && styles.toggleTextActive,
              ]}
            >
              Foodie
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              formData.user_type === 'Restaurant' && styles.toggleButtonActive,
            ]}
            onPress={() => setFormData({ ...formData, user_type: 'Restaurant' })}
          >
            <Ionicons
              name="restaurant"
              size={20}
              color={formData.user_type === 'Restaurant' ? '#fff' : '#999'}
            />
            <Text
              style={[
                styles.toggleText,
                formData.user_type === 'Restaurant' && styles.toggleTextActive,
              ]}
            >
              Restaurant
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name or Restaurant Name"
              placeholderTextColor="#999"
              value={formData.profile_name}
              onChangeText={(text) => setFormData({ ...formData, profile_name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="at" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="@handle"
              placeholderTextColor="#999"
              value={formData.handle}
              onChangeText={(text) => setFormData({ ...formData, handle: text })}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="text" size={20} color="#999" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Bio (optional)"
              placeholderTextColor="#999"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 12,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  linkBold: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
