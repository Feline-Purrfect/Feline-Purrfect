import { CustomButton } from '@/components/common/CustomButton';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { RequiredIndicator } from '@/components/common/RequiredIndicator';
import { BreedPicker } from '@/components/ui/BreedPicker';
import { useCats, useUpdateCat } from '@/hooks/useCats';
import { useImagePicker } from '@/hooks/useImagePicker';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditCatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cats = [], isLoading: catsLoading } = useCats();
  const updateCatMutation = useUpdateCat();
  const { imageUri, setImageUri, pickImage, isPickingImage } = useImagePicker();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [breed, setBreed] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [adoptedDate, setAdoptedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const cat = cats.find((c) => c.catId === id);

  // Load cat data when component mounts
  useEffect(() => {
    if (cat) {
      setName(cat.name);
      setAge(cat.age.toString());
      setSex(cat.sex);
      setBreed(cat.breed || null);
      setWeight(cat.weight?.toString() || '');
      setImageUri(cat.photoUrl || '');
      setAdoptedDate(new Date(cat.adoptedDate));
    }
  }, [cat, setImageUri]);

  const handlePickImage = async () => {
    await pickImage();
  };

  const handleUpdate = () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please add a photo of your cat');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your cat');
      return;
    }

    if (!age || isNaN(Number(age)) || Number(age) < 0) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }

    if (!cat) return;

    const updatedCat = {
      ...cat,
      name: name.trim(),
      age: Number(age),
      sex,
      breed: breed || 'Unknown',
      adoptedDate: adoptedDate.toISOString(),
      weight: weight ? Number(weight) : null,
      photo: imageUri,
    };

    updateCatMutation.mutate(updatedCat, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  if (catsLoading) {
    return <LoadingIndicator />;
  }

  if (!cat) {
    return (
      <ErrorView message="This cat may have been removed. Please go back and try again." />
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 p-6"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Photo Picker */}
          <View className="flex-row justify-center gap-x-1">
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={isPickingImage}
              className="w-32 h-32 bg-gray-100 rounded-2xl self-center mb-6 items-center justify-center overflow-hidden"
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} className="w-full h-full" />
                </>
              ) : (
                <View className="items-center">
                  <FontAwesome6 name="camera" size={32} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <RequiredIndicator />
          </View>

          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Name
              <RequiredIndicator />
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter cat's name"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          {/* Breed Picker */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Breed</Text>
            <BreedPicker value={breed} onChange={setBreed} />
          </View>

          {/* Age Input */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Age (years)
              <RequiredIndicator />
            </Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          {/* Sex Selection */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Sex
              <RequiredIndicator />
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setSex('female')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border-2 ${
                  sex === 'female'
                    ? 'bg-pink-50 border-pink-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <FontAwesome6
                  name="venus"
                  size={18}
                  color={sex === 'female' ? '#ec4899' : '#9ca3af'}
                />
                <Text
                  className={`ml-2 font-semibold ${
                    sex === 'female' ? 'text-pink-600' : 'text-gray-500'
                  }`}
                >
                  Female
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSex('male')}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border-2 ${
                  sex === 'male'
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <FontAwesome6
                  name="mars"
                  size={18}
                  color={sex === 'male' ? '#3b82f6' : '#9ca3af'}
                />
                <Text
                  className={`ml-2 font-semibold ${
                    sex === 'male' ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  Male
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Adopted Date */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Adopted Date
              <RequiredIndicator />
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-gray-800">
                {adoptedDate.toLocaleDateString()}
              </Text>
              <FontAwesome6 name="calendar" size={16} color="#9ca3af" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={adoptedDate}
                mode="date"
                display="compact"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setAdoptedDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Weight Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2">
              Weight (kg)
            </Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="0.0"
              keyboardType="decimal-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            />
          </View>

          {/* Update Button */}
          <CustomButton
            content={updateCatMutation.isPending ? 'Updating...' : 'Update Cat'}
            onPress={handleUpdate}
            disabled={updateCatMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
