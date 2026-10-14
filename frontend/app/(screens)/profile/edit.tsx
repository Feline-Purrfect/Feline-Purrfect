import { authApi } from '@/api/auth';
import { AUTH_QUERY_KEY } from '@/lib/api/client';
import { CustomButton } from '@/components/common/CustomButton';
import { useAuth, useDeleteAccount } from '@/hooks/useAuth';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useQueryClient } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (name === user?.name) {
      Alert.alert('No Changes', 'You haven\'t made any changes');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser = await authApi.updateProfile(name);
      
      // Update the query cache with new user data
      queryClient.setQueryData(AUTH_QUERY_KEY, updatedUser);

      Alert.alert(
        'Success',
        'Your profile has been updated!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }, [name, queryClient, user?.name]);

  const handleCancel = useCallback(() => {
    if (name !== user?.name) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  }, [name, user?.name]);

  // Set header buttons using navigation.setOptions
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isLoading}
          style={{ marginRight: 16 }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: isLoading ? '#9ca3af' : '#155C8D',
            }}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isLoading, name, user?.name, handleSave, handleCancel]);

const handleDeleteAccount =useCallback(() => {
  Alert.alert('Delete Account', 'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.', [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    {
      text: 'Delete Account',
      style: 'destructive',
      onPress: () => {
        // Double confirmation
        Alert.alert('Final Confirmation', 'This is your last chance. Delete your account permanently?', [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Yes, Delete',
            style: 'destructive',
            onPress: () => deleteAccount(),
          },
        ]);
      },
    },
  ]);
  }, [deleteAccount]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* Profile Picture Section */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center mb-4">
              <FontAwesome6 name="user" size={40} color="#155C8D" />
            </View>
            <TouchableOpacity 
              onPress={() => Alert.alert('Coming Soon', 'Profile picture upload will be available soon')}
            >
              <Text className="text-primary font-semibold">Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2">Name</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <FontAwesome6 name="user" size={16} color="#9ca3af" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                className="flex-1 ml-3 text-gray-800"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2">Email</Text>
            <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
              <FontAwesome6 name="envelope" size={16} color="#9ca3af" />
              <Text className="flex-1 ml-3 text-gray-500">{user?.email || 'email@example.com'}</Text>
              <View className="bg-gray-200 px-3 py-1 rounded-full">
                <Text className="text-xs text-gray-600 font-medium">Verified</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-500 mt-2">
              Email cannot be changed
            </Text>
          </View>

          {/* Account Info */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">Account Information</Text>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">User ID</Text>
              <Text className="text-sm text-gray-900 font-mono">
                {user?.userId?.slice(0, 8)}...
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-600">Account Status</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-sm text-green-600 font-medium">Active</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-y-3">
            <CustomButton
              content="Change Password"
              onPress={() => router.push('/change-password')}
              className="px-6 py-4 bg-gray-100 border border-gray-300"
              textClassName="text-gray-900 text-md font-semibold ml-3"
            />

            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 flex-row items-center justify-center"
            >
              <FontAwesome6 name="trash-can" size={18} color="#ef4444" />
              <Text className="text-red-600 font-semibold ml-3">
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warning Text */}
          <Text className="text-xs text-gray-500 text-center mt-4">
            Deleting your account is permanent and cannot be undone.
            All your data will be permanently deleted.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}