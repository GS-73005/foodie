import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { postAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface Post {
  _id: string;
  user_id: string;
  image_base64: string;
  caption: string;
  stars?: number;
  likes: string[];
  comments: any[];
  created_at: string;
  user: {
    profile_name: string;
    handle: string;
    avatar_base64?: string;
  };
  promo_code?: string;
  offer_description?: string;
  post_type: string;
}

export default function FeedScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedType, setFeedType] = useState<'trending' | 'following'>('trending');

  const loadFeed = async () => {
    try {
      const response = feedType === 'trending' 
        ? await postAPI.getTrendingFeed()
        : await postAPI.getFollowingFeed();
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [feedType]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await postAPI.unlikePost(postId);
      } else {
        await postAPI.likePost(postId);
      }
      
      // Update local state
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const likes = isLiked
            ? post.likes.filter(id => id !== user?.user_id)
            : [...post.likes, user?.user_id || ''];
          return { ...post, likes };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const copyPromoCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', 'Promo code copied to clipboard');
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likes.includes(user?.user_id || '');

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            {item.user.avatar_base64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${item.user.avatar_base64}` }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color="#999" />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{item.user.profile_name}</Text>
              <Text style={styles.userHandle}>{item.user.handle}</Text>
            </View>
          </View>
        </View>

        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={styles.postImage}
        />

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item._id, isLiked)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#FF6B6B' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.postInfo}>
          <Text style={styles.likes}>{item.likes.length} likes</Text>
          
          {item.stars && (
            <View style={styles.rating}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < item.stars! ? 'star' : 'star-outline'}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
          )}

          <Text style={styles.caption}>
            <Text style={styles.captionUser}>{item.user.handle}</Text> {item.caption}
          </Text>

          {item.promo_code && (
            <TouchableOpacity
              style={styles.promoCard}
              onPress={() => copyPromoCode(item.promo_code!)}
            >
              <Ionicons name="gift" size={24} color="#FF6B6B" />
              <View style={styles.promoInfo}>
                <Text style={styles.promoText}>{item.offer_description}</Text>
                <Text style={styles.promoCode}>{item.promo_code}</Text>
              </View>
              <Ionicons name="copy-outline" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {item.comments.length > 0 && (
            <Text style={styles.viewComments}>
              View all {item.comments.length} comments
            </Text>
          )}

          <Text style={styles.timestamp}>
            {format(new Date(item.created_at), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Foodies Circle</Text>
      </View>

      <View style={styles.feedToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            feedType === 'trending' && styles.toggleButtonActive,
          ]}
          onPress={() => setFeedType('trending')}
        >
          <Text
            style={[
              styles.toggleText,
              feedType === 'trending' && styles.toggleTextActive,
            ]}
          >
            Trending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            feedType === 'following' && styles.toggleButtonActive,
          ]}
          onPress={() => setFeedType('following')}
        >
          <Text
            style={[
              styles.toggleText,
              feedType === 'following' && styles.toggleTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFeed();
            }}
            tintColor="#FF6B6B"
          />
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
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
  feedToggle: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  list: {
    paddingBottom: 16,
  },
  postCard: {
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userHandle: {
    color: '#999',
    fontSize: 12,
  },
  postImage: {
    width,
    height: width,
    backgroundColor: '#2a2a2a',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  postInfo: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  likes: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: '600',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 12,
  },
  promoInfo: {
    flex: 1,
  },
  promoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  promoCode: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewComments: {
    color: '#999',
    fontSize: 13,
    marginTop: 8,
  },
  timestamp: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
});
