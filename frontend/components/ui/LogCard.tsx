import { AddButton } from '@/components/ui/AddButton';
import { CatResponse } from '@/types/cat';
import { LogResponse } from '@/types/log';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface LogCardProps {
  log: LogResponse;
  cat: CatResponse;
  onPress: () => void;
}

export function LogCard({ log, cat, onPress }: LogCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white shadow-sm mb-4 rounded-2xl border border-gray-light overflow-hidden active:opacity-80"
      activeOpacity={0.8}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
              {cat.photoUrl && (
                <Image
                  source={{ uri: cat.photoUrl }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              )}
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-800">{cat.name}</Text>
              <Text className="text-sm text-gray-500">
                {new Date(log.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap gap-2">
          {/* Poo */}
          <View className="flex-row items-center bg-amber-50 px-3 py-2 rounded-lg">
            <FontAwesome6 name="poo" size={14} color="#f59e0b" />
            <Text className="text-amber-700 font-semibold ml-2">{log.pooCount}</Text>
          </View>

          {/* Pee */}
          <View className="flex-row items-center bg-yellow-50 px-3 py-2 rounded-lg">
            <FontAwesome6 name="droplet" size={14} color="#eab308" />
            <Text className="text-yellow-700 font-semibold ml-2">{log.peeCount}</Text>
          </View>

          {/* Food */}
          <View className="flex-row items-center bg-orange-50 px-3 py-2 rounded-lg">
            <FontAwesome6 name="bowl-food" size={14} color="#f97316" />
            <Text className="text-orange-700 font-semibold ml-2">{log.foodCount}</Text>
          </View>

          {/* Water */}
          <View className="flex-row items-center bg-blue-50 px-3 py-2 rounded-lg">
            <FontAwesome6 name="glass-water" size={14} color="#3b82f6" />
            <Text className="text-blue-700 font-semibold ml-2">{log.waterCount}</Text>
          </View>

          {/* Weight (optional) */}
          {log.weight && (
            <View className="flex-row items-center bg-purple-50 px-3 py-2 rounded-lg">
              <FontAwesome6 name="weight-scale" size={14} color="#a855f7" />
              <Text className="text-purple-700 font-semibold ml-2">{log.weight} kg</Text>
            </View>
          )}

          {/* Temperature (optional) */}
          {log.temperature && (
            <View className="flex-row items-center bg-red-50 px-3 py-2 rounded-lg">
              <FontAwesome6 name="temperature-half" size={14} color="#ef4444" />
              <Text className="text-red-700 font-semibold ml-2">{log.temperature}°C</Text>
            </View>
          )}
        </View>

        {/* Notes (optional) */}
        {log.notes && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-gray-600 text-sm italic">{log.notes}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface AddLogCardProps {
  cat: CatResponse;
  onPress: () => void;
}

export function AddLogCard({ cat, onPress }: AddLogCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white shadow-sm mb-4 pb-4 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden"
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
              {cat.photoUrl && (
                <Image 
                  source={{ uri: cat.photoUrl }} 
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              )}
            </View>
            <Text className="text-lg font-bold text-gray-800">{cat.name}</Text>
          </View>
        </View>

        {/* Add Button */}
        <AddButton title={`Add Log for ${cat.name}`} />
      </View>
    </TouchableOpacity>
  );
}