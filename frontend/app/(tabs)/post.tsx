import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { postAPI, userAPI } from '../../services/api';
import { useRouter } from 'expo-router';

export default function PostScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [stars, setStars] = useState(0);
  const [isPromoRequest, setIsPromoRequest] = useState(false);
  const [promoOfferIdea, setPromoOfferIdea] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setImage(base64);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setImage(base64);
    }
  };

  const handlePost = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!caption) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    if (isPromoRequest && !promoOfferIdea) {
      Alert.alert('Error', 'Please describe your promo offer idea');
      return;
    }

    setLoading(true);
    try {
      await postAPI.createPost({
        image_base64: image,
        caption,
        stars: stars > 0 ? stars : undefined,
        is_promotion_request: isPromoRequest,
        promotion_offer_idea: promoOfferIdea || undefined,
      });

      Alert.alert('Success', 'Post created successfully!');
      
      // Reset form
      setImage(null);
      setCaption('');
      setStars(0);
      setIsPromoRequest(false);
      setPromoOfferIdea('');
      
      // Navigate to feed
      router.push('/(tabs)/feed');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={loading || !image || !caption}
          >
            {loading ? (
              <ActivityIndicator color="#FF6B6B" />
            ) : (
              <Text
                style={[
                  styles.postButton,
                  (!image || !caption) && styles.postButtonDisabled,
                ]}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!image ? (
            <View style={styles.imagePicker}>
              <Ionicons name="image" size={64} color="#666" />
              <Text style={styles.imagePickerText}>Select a photo</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#fff" />
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.imageButtonText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${image}` }}
                style={styles.selectedImage}
              />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={32} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="#666"
              value={caption}
              onChangeText={setCaption}
              multiline
            />

            <View style={styles.ratingContainer}>
              <Text style={styles.label}>Rating (optional)</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setStars(star)}>
                    <Ionicons
                      name={star <= stars ? 'star' : 'star-outline'}
                      size={32}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.promoToggle}
              onPress={() => setIsPromoRequest(!isPromoRequest)}
            >
              <Ionicons
                name={isPromoRequest ? 'checkbox' : 'square-outline'}
                size={24}
                color="#FF6B6B"
              />
              <Text style={styles.promoToggleText}>Request Promotion Code</Text>
            </TouchableOpacity>

            {isPromoRequest && (
              <View style={styles.promoSection}>
                <Text style={styles.promoHint}>
                  Describe your offer idea (e.g., "15% off any pizza")
                </Text>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Your offer idea..."
                  placeholderTextColor="#666"
                  value={promoOfferIdea}
                  onChangeText={setPromoOfferIdea}
                  multiline
                />
                <Text style={styles.promoNote}>
                  Your post will be shared with the promo code upon restaurant approval
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  postButtonDisabled: {
    color: '#666',
  },
  content: {
    padding: 16,
  },
  imagePicker: {
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  form: {
    marginTop: 24,
    gap: 24,
  },
  captionInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    gap: 12,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  promoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoToggleText: {
    color: '#fff',
    fontSize: 16,
  },
  promoSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  promoHint: {
    color: '#999',
    fontSize: 14,
  },
  promoInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  promoNote: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
