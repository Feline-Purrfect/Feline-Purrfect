import { CatResponse } from '@/types/cat';
import { LogResponse } from '@/types/log';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';
import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface CatHealthCardProps {
  cat: CatResponse;
  recentLogs: LogResponse[];
}

export function CatHealthCard({ cat, recentLogs }: CatHealthCardProps) {
  const screenWidth = Dimensions.get('window').width;
  
  // Get last 7 days of data
  const last7Days = recentLogs.slice(0, 7).reverse();
  
  // Calculate averages for today vs last 7 days
  const todayLog = recentLogs[0];
  const avgPoo = last7Days.reduce((sum, log) => sum + log.pooCount, 0) / last7Days.length;
  const avgPee = last7Days.reduce((sum, log) => sum + log.peeCount, 0) / last7Days.length;
  const avgFood = last7Days.reduce((sum, log) => sum + log.foodCount, 0) / last7Days.length;
  const avgWater = last7Days.reduce((sum, log) => sum + log.waterCount, 0) / last7Days.length;

  // Chart data for water consumption
  const waterData = {
    labels: last7Days.map(log => new Date(log.date).getDate().toString()),
    datasets: [{
      data: last7Days.map(log => log.waterCount),
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(screens)/my-cats/${cat.catId}`)}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4 active:opacity-90"
      activeOpacity={0.9}
    >
      {/* Header */}
      <View className="flex-row items-center p-4 bg-gray-50">
        {cat.photoUrl ? (
          <Image 
            source={{ uri: cat.photoUrl }} 
            className="w-12 h-12 rounded-full mr-3"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-3">
            <FontAwesome6 name="cat" size={20} color="#9333ea" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">{cat.name}</Text>
          <Text className="text-sm text-gray-500">Last 7 days overview</Text>
        </View>
        <FontAwesome6 name="chevron-right" size={16} color="#9ca3af" />
      </View>

      {recentLogs.length === 0 ? (
        <View className="p-6 items-center">
          <Text className="text-gray-500 text-center">
            {`No logs yet. Start tracking ${cat.name}'s activities!`}
          </Text>
        </View>
      ) : (
        <>
          {/* Quick Stats */}
          <View className="p-4">
            <Text className="text-gray-700 font-semibold mb-3">{`Today's Activity`}</Text>
            <View className="flex-row flex-wrap gap-2">
              <View className="bg-amber-50 px-3 py-2 rounded-lg flex-row items-center">
                <FontAwesome6 name="poo" size={14} color="#f59e0b" />
                <Text className="text-amber-900 font-semibold ml-2">
                  {todayLog?.pooCount || 0}
                </Text>
              </View>
              <View className="bg-yellow-50 px-3 py-2 rounded-lg flex-row items-center">
                <FontAwesome6 name="droplet" size={14} color="#eab308" />
                <Text className="text-yellow-900 font-semibold ml-2">
                  {todayLog?.peeCount || 0}
                </Text>
              </View>
              <View className="bg-orange-50 px-3 py-2 rounded-lg flex-row items-center">
                <FontAwesome6 name="bowl-food" size={14} color="#f97316" />
                <Text className="text-orange-900 font-semibold ml-2">
                  {todayLog?.foodCount || 0}
                </Text>
              </View>
              <View className="bg-blue-50 px-3 py-2 rounded-lg flex-row items-center">
                <FontAwesome6 name="glass-water" size={14} color="#3b82f6" />
                <Text className="text-blue-900 font-semibold ml-2">
                  {todayLog?.waterCount || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Water Consumption Chart */}
          {last7Days.length > 1 && (
            <View className="px-4 pb-4">
              <Text className="text-gray-700 font-semibold mb-2">Water Consumption Trend</Text>
              <LineChart
                data={waterData}
                width={screenWidth - 64}
                height={150}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 12 }}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}