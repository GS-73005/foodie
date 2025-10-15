import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../../services/api';
import { useRouter } from 'expo-router';

interface SearchUser {
  _id: string;
  profile_name: string;
  handle: string;
  avatar_base64?: string;
  user_type: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await userAPI.searchUsers(searchQuery, filterType);
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        // Navigate to user profile (to be implemented)
        console.log('Navigate to user:', item._id);
      }}
    >
      {item.avatar_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.avatar_base64}` }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.profile_name}</Text>
        <Text style={styles.userHandle}>{item.handle}</Text>
      </View>
      <View style={styles.userType}>
        <Ionicons
          name={item.user_type === 'Restaurant' ? 'restaurant' : 'person'}
          size={16}
          color="#999"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search foodies, restaurants..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filters}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !filterType && styles.filterButtonActive,
            ]}
            onPress={() => {
              setFilterType(undefined);
              if (query) handleSearch(query);
            }}
          >
            <Text
              style={[
                styles.filterText,
                !filterType && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Foodie' && styles.filterButtonActive,
            ]}
            onPress={() => {
              setFilterType('Foodie');
              if (query) handleSearch(query);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'Foodie' && styles.filterTextActive,
              ]}
            >
              Foodies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Restaurant' && styles.filterButtonActive,
            ]}
            onPress={() => {
              setFilterType('Restaurant');
              if (query) handleSearch(query);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filterType === 'Restaurant' && styles.filterTextActive,
              ]}
            >
              Restaurants
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
        />
      ) : query.length > 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#666" />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#666" />
          <Text style={styles.emptyText}>Start searching for foodies and restaurants</Text>
        </View>
      )}
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
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  filterText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userHandle: {
    color: '#999',
    fontSize: 14,
  },
  userType: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
