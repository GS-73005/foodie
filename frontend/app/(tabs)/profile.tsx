import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { userAPI, authAPI, promoAPI, loyaltyAPI } from '../../services/api';
import { useRouter } from 'expo-router';
import MapLocationPicker from '../../components/MapLocationPicker';

const { width } = Dimensions.get('window');
const imageSize = width / 3 - 2;

interface Post {
  _id: string;
  image_base64: string;
}

interface PromoRequest {
  _id: string;
  user: {
    profile_name: string;
    handle: string;
    avatar_base64?: string;
  };
  image_base64: string;
  caption: string;
  promotion_offer_idea: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [promoRequests, setPromoRequests] = useState<PromoRequest[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'promos' | 'loyalty'>('posts');
  const [loading, setLoading] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [activeTab]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      // Refresh user data
      const userResponse = await authAPI.getMe();
      setUser(userResponse.data);

      // Load posts
      if (activeTab === 'posts') {
        const postsResponse = await userAPI.getUserPosts(user.user_id);
        setPosts(postsResponse.data);
      }

      // Load promo requests for restaurants
      if (activeTab === 'promos' && user.user_type === 'Restaurant') {
        const promosResponse = await promoAPI.getPromoRequests(user.user_id);
        setPromoRequests(promosResponse.data);
      }

      // Load loyalty points
      if (activeTab === 'loyalty') {
        if (user.user_type === 'Foodie') {
          const loyaltyResponse = await loyaltyAPI.getLoyaltyPoints(user.user_id);
          setLoyaltyPoints(loyaltyResponse.data);
        } else {
          const loyaltyResponse = await loyaltyAPI.getRestaurantLoyaltyPoints(user.user_id);
          setLoyaltyPoints(loyaltyResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePromo = async (postId: string) => {
    Alert.prompt(
      'Approve Promo',
      'Enter the promo code and offer description',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async (code) => {
            if (!code) return;
            try {
              await promoAPI.approvePromo(user!.user_id, postId, {
                promo_code_plain_text: code,
                offer_description: 'Special offer',
              });
              Alert.alert('Success', 'Promo approved!');
              loadProfileData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to approve promo');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleRejectPromo = async (postId: string) => {
    try {
      await promoAPI.rejectPromo(user!.user_id, postId);
      Alert.alert('Success', 'Promo rejected');
      loadProfileData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reject promo');
    }
  };

  const handleLocationUpdate = async (location: any) => {
    if (!user) return;
    
    try {
      await userAPI.updateLocation(user.user_id, {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        place_name: location.place_name,
      });
      
      Alert.alert('Success', 'Location updated successfully!');
      setShowMapPicker(false);
      loadProfileData(); // Reload profile data
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update location');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.profileHeader}>
          {user.avatar_base64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${user.avatar_base64}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons
                name={user.user_type === 'Restaurant' ? 'restaurant' : 'person'}
                size={48}
                color="#999"
              />
            </View>
          )}

          <Text style={styles.profileName}>{user.profile_name}</Text>
          <Text style={styles.profileHandle}>{user.handle}</Text>

          {user.bio && <Text style={styles.profileBio}>{user.bio}</Text>}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{user.followers?.length || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{user.following?.length || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {user.user_type === 'Restaurant' && (
            <View style={styles.restaurantDetails}>
              {user.restaurant_details?.location && (
                <Text style={styles.detailText}>
                  <Ionicons name="location" size={16} color="#999" />{' '}
                  {user.restaurant_details.location.address || 'No address'}
                </Text>
              )}
              {user.restaurant_details?.contact_info && (
                <Text style={styles.detailText}>
                  <Ionicons name="call" size={16} color="#999" />{' '}
                  {user.restaurant_details.contact_info}
                </Text>
              )}
              <TouchableOpacity
                style={styles.updateLocationButton}
                onPress={() => setShowMapPicker(true)}
              >
                <Ionicons name="location" size={20} color="#FF6B6B" />
                <Text style={styles.updateLocationText}>
                  {user.restaurant_details?.location ? 'Update Location' : 'Set Location'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={activeTab === 'posts' ? '#FF6B6B' : '#999'}
            />
          </TouchableOpacity>

          {user.user_type === 'Restaurant' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'promos' && styles.tabActive]}
              onPress={() => setActiveTab('promos')}
            >
              <Ionicons
                name="gift"
                size={20}
                color={activeTab === 'promos' ? '#FF6B6B' : '#999'}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tab, activeTab === 'loyalty' && styles.tabActive]}
            onPress={() => setActiveTab('loyalty')}
          >
            <Ionicons
              name="star"
              size={20}
              color={activeTab === 'loyalty' ? '#FF6B6B' : '#999'}
            />
          </TouchableOpacity>
        </View>

        {activeTab === 'posts' && (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity key={post._id} style={styles.postItem}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${post.image_base64}` }}
                  style={styles.postImage}
                />
              </TouchableOpacity>
            ))}
            {posts.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'promos' && user.user_type === 'Restaurant' && (
          <View style={styles.promosList}>
            {promoRequests.map((request) => (
              <View key={request._id} style={styles.promoCard}>
                <View style={styles.promoHeader}>
                  {request.user.avatar_base64 ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${request.user.avatar_base64}` }}
                      style={styles.promoAvatar}
                    />
                  ) : (
                    <View style={[styles.promoAvatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={20} color="#999" />
                    </View>
                  )}
                  <View style={styles.promoUserInfo}>
                    <Text style={styles.promoUserName}>{request.user.profile_name}</Text>
                    <Text style={styles.promoUserHandle}>{request.user.handle}</Text>
                  </View>
                </View>

                <Image
                  source={{ uri: `data:image/jpeg;base64,${request.image_base64}` }}
                  style={styles.promoImage}
                />

                <View style={styles.promoInfo}>
                  <Text style={styles.promoCaption}>{request.caption}</Text>
                  <Text style={styles.promoOffer}>
                    Proposed offer: {request.promotion_offer_idea}
                  </Text>
                </View>

                <View style={styles.promoActions}>
                  <TouchableOpacity
                    style={[styles.promoButton, styles.approveButton]}
                    onPress={() => handleApprovePromo(request._id)}
                  >
                    <Text style={styles.promoButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.promoButton, styles.rejectButton]}
                    onPress={() => handleRejectPromo(request._id)}
                  >
                    <Text style={styles.promoButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {promoRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="gift-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No promo requests</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'loyalty' && (
          <View style={styles.loyaltyList}>
            {loyaltyPoints.map((lp) => (
              <View key={lp._id} style={styles.loyaltyCard}>
                <View style={styles.loyaltyHeader}>
                  <Text style={styles.loyaltyName}>
                    {lp.restaurant?.profile_name || lp.foodie?.profile_name}
                  </Text>
                  <View style={styles.loyaltyPoints}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={styles.loyaltyPointsText}>{lp.points}</Text>
                  </View>
                </View>
              </View>
            ))}
            {loyaltyPoints.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No loyalty points yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showMapPicker}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MapLocationPicker
          onLocationSelect={handleLocationUpdate}
          initialLocation={user?.restaurant_details?.location}
          onCancel={() => setShowMapPicker(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  profileHandle: {
    color: '#999',
    fontSize: 16,
    marginTop: 4,
  },
  profileBio: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 32,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  restaurantDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailText: {
    color: '#999',
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a2a2a',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF6B6B',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 2,
  },
  postItem: {
    width: imageSize,
    height: imageSize,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    width: '100%',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  promosList: {
    padding: 16,
    gap: 16,
  },
  promoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  promoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  promoUserInfo: {
    marginLeft: 12,
  },
  promoUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  promoUserHandle: {
    color: '#999',
    fontSize: 12,
  },
  promoImage: {
    width: '100%',
    aspectRatio: 1,
  },
  promoInfo: {
    padding: 12,
  },
  promoCaption: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  promoOffer: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  promoActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  promoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  promoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loyaltyList: {
    padding: 16,
    gap: 12,
  },
  loyaltyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loyaltyName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loyaltyPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loyaltyPointsText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
