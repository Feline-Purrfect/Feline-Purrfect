import { CAT_BREEDS } from '@/constants/catBreeds';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface BreedPickerProps {
  value: string | null;
  onChange: (breed: string) => void;
}

export function BreedPicker({ value, onChange }: BreedPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBreeds = CAT_BREEDS.filter((breed) =>
    breed.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectBreed = (breed: string) => {
    onChange(breed);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
      >
        <Text className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || 'Select breed'}
        </Text>
        <FontAwesome6 name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl h-3/4">
            {/* Header */}
            <View className="px-6 py-4 border-b border-gray-200">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Select Breed
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome6 name="xmark" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                <FontAwesome6
                  name="magnifying-glass"
                  size={16}
                  color="#9ca3af"
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search breeds..."
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-3 text-gray-900"
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FontAwesome6
                      name="xmark-circle"
                      size={16}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Breed List */}
            <FlatList
              data={filteredBreeds}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectBreed(item)}
                  className={`px-6 py-4 border-b border-gray-100 ${
                    item === value ? 'bg-purple-50' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base ${
                        item === value
                          ? 'text-purple-700 font-semibold'
                          : 'text-gray-900'
                      }`}
                    >
                      {item}
                    </Text>
                    {item === value && (
                      <FontAwesome6 name="check" size={16} color="#9333ea" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View className="items-center justify-center py-12">
                  <FontAwesome6
                    name="magnifying-glass"
                    size={48}
                    color="#d1d5db"
                  />
                  <Text className="text-gray-500 mt-4">
                    {`No breeds found matching ${searchQuery}`}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
