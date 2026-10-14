import { CustomButton } from '@/components/common/CustomButton';
import { useChangePassword } from '@/hooks/useAuth';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { mutate: changePassword, isPending } = useChangePassword();

  const validatePassword = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }

    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      Alert.alert(
        'Weak Password',
        'Password must contain:\n• Uppercase letter\n• Lowercase letter\n• Number\n• Special character'
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleChangePassword = () => {
    if (!validatePassword()) return;

    // `mutate` does not return a promise, so the old `await changePassword(...)` + try/catch showed
    // "Success" immediately even when the request failed, and the catch never ran.
    // Success/error alerts are shown by useChangePassword; here we only navigate on success.
    changePassword(
      { oldPassword: currentPassword, newPassword },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-8">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
                <FontAwesome6 name="lock" size={32} color="#155C8D" />
              </View>
              <Text className="text-3xl font-bold text-black">Change Password</Text>
              <Text className="text-gray mt-2 text-center">
                Please enter your current password and choose a new one
              </Text>
            </View>

            {/* Current Password Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Current Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <FontAwesome6 name="lock" size={16} color="#9ca3af" />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  className="flex-1 ml-3 text-gray-800"
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <FontAwesome6 
                    name={showCurrentPassword ? 'eye' : 'eye-slash'} 
                    size={16} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">New Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <FontAwesome6 name="lock" size={16} color="#9ca3af" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  className="flex-1 ml-3 text-gray-800"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <FontAwesome6 
                    name={showNewPassword ? 'eye' : 'eye-slash'} 
                    size={16} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                Must include uppercase, lowercase, number, and special character
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Confirm New Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <FontAwesome6 name="lock" size={16} color="#9ca3af" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  className="flex-1 ml-3 text-gray-800"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <FontAwesome6 
                    name={showConfirmPassword ? 'eye' : 'eye-slash'} 
                    size={16} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Change Password Button */}
            <CustomButton
              content={isPending ? 'Changing...' : 'Change Password'}
              onPress={handleChangePassword}
              disabled={isPending}
            />

            {/* Cancel Button */}
            <TouchableOpacity 
              onPress={() => router.back()}
              className="items-center mt-4"
            >
              <Text className="text-gray-600 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}