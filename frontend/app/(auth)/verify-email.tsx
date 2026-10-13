import { CustomButton } from '@/components/common/CustomButton';
import { useConfirmSignUp, useResendConfirmationCode } from '@/hooks/useAuth';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

export default function VerifyEmailScreen() {
  const { email, resend } = useLocalSearchParams<{
    email: string;
    resend?: string;
  }>();
  const [code, setCode] = useState<string>('');
  const autoResent = useRef(false);

  const { mutate: confirmSignUp, isPending: isConfirmationPending } =
    useConfirmSignUp();
  const { mutate: resendConfirmationCode, isPending: isResendPending } =
    useResendConfirmationCode();

  useEffect(() => {
    if (resend === '1' && email && !autoResent.current) {
      autoResent.current = true;
      resendConfirmationCode(email);
    }
  }, [resend, email, resendConfirmationCode]);

  const handleVerify = () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Verification code must be 6 digits');
      return;
    }

    try {
      confirmSignUp(
        { email, code: code.trim() },
        {
          onSuccess: () => {
            Alert.alert(
              'Success',
              'Your email has been verified! You can now sign in.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/login'),
                },
              ],
            );
          },
        },
      );
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.message || 'Failed to verify email');
    }
  };

  const handleResendCode = () => {
    try {
      resendConfirmationCode(email || '');
    } catch (error: any) {
      console.error('Resend code error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to resend verification code',
      );
    }
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
          <View className="flex-1 justify-center px-6 py-8">
            {/* Icon */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
                <FontAwesome6
                  name="envelope-open-text"
                  size={32}
                  color="#155C8D"
                />
              </View>
              <Text className="text-3xl font-bold text-black">
                Verify Email
              </Text>
              <Text className="text-gray mt-2 text-center">
                {`We've sent a 6-digit code to`}
              </Text>
              <Text className="text-primary-600 font-semibold mt-1">
                {email}
              </Text>
            </View>

            {/* Verification Code Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Verification Code
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <FontAwesome6 name="key" size={16} color="#9ca3af" />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  className="flex-1 ml-3 text-gray-800 text-lg tracking-widest"
                />
              </View>
            </View>

            {/* Verify Button */}
            <CustomButton
              content={isConfirmationPending ? 'Verifying...' : 'Verify Email'}
              onPress={handleVerify}
              disabled={isConfirmationPending}
            />

            {/* Resend Code */}
            <View className="items-center mt-6">
              <Text className="text-gray-600 mb-2">{`Didn't receive the code?`}</Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isResendPending}
              >
                <Text className="text-primary-600 font-semibold">
                  Resend Code
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              className="items-center mt-8"
            >
              <Text className="text-gray-600">Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
