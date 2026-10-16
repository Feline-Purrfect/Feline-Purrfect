import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Colors } from '@/constants/colors';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { useLogs } from '@/hooks/useLogs';
import { fromYmd } from '@/lib/dates';
import { formatAmount } from '@/lib/logs';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function DetailedAnalyticsScreen() {
  const { data: analytics, isLoading, error } = useDashboardAnalytics();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const selectedCat = selectedCatId
    ? analytics?.analysis.find((c) => c.catId === selectedCatId)
    : analytics?.analysis[0];

  const { data: logs = [] } = useLogs(selectedCat?.catId || '');

  // Prepare chart data
  const last7Days = logs.slice(0, 7).reverse();

  const weightData = last7Days
    .map((l) => l.weight)
    .filter((w): w is number => w != null);
  const tempData = last7Days
    .map((l) => l.temperature)
    .filter((t): t is number => t != null);
  const pooData = last7Days
    .map((l) => l.pooCount)
    .filter((p): p is number => p != null);
  const peeData = last7Days
    .map((l) => l.peeCount)
    .filter((p): p is number => p != null);
  // Food/water are amounts with a unit now. Only chart days in the latest unit (grams and cups can't
  // share an axis).
  const foodUnit = logs.find((l) => l.foodUnit)?.foodUnit ?? null;
  const waterUnit = logs.find((l) => l.waterUnit)?.waterUnit ?? null;
  const foodData = last7Days
    .filter((l) => l.foodAmount != null && l.foodUnit === foodUnit)
    .map((l) => l.foodAmount as number);
  const waterData = last7Days
    .filter((l) => l.waterAmount != null && l.waterUnit === waterUnit)
    .map((l) => l.waterAmount as number);

  const createLabels = (data: number[], logs: typeof last7Days) =>
    logs.slice(0, data.length).map((l) =>
      fromYmd(l.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    );

  if (isLoading) return <LoadingIndicator />;
  if (error) return <ErrorView message="Failed to load analytics" />;

  if (!analytics || analytics.totalCats === 0) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <FontAwesome6 name="chart-line" size={80} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-6 mb-2">
          No Data Yet
        </Text>
        <Text className="text-gray-600 text-center">
          Add health logs to see detailed analytics
        </Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      <Stack.Screen
        options={{ title: 'Detailed Analytics', headerBackTitle: 'Back' }}
      />
      <View className="flex-1 bg-gray-50">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
          {/* Cat Selector */}
          {analytics.totalCats > 1 && (
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-3">
                Select Cat
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row gap-2"
              >
                {analytics.analysis.map((cat) => (
                  <TouchableOpacity
                    key={cat.catId}
                    onPress={() => setSelectedCatId(cat.catId)}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      selectedCat?.catId === cat.catId
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedCat?.catId === cat.catId
                          ? 'text-primary'
                          : 'text-gray-700'
                      }`}
                    >
                      {cat.catName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {selectedCat && (
            <>
              {/* Cat Header */}
              <View className="bg-white rounded-2xl p-4 mb-6">
                <Text className="text-2xl font-bold text-gray-900">
                  {selectedCat.catName}
                </Text>
                {!!selectedCat.breed && (
                  <Text className="text-primary-600 text-base mt-1">
                    {selectedCat.breed}
                  </Text>
                )}
                <Text className="text-gray-500 text-sm mt-2">
                  {selectedCat.totalLogs} health logs recorded
                </Text>
              </View>

              {/* Health Alerts */}
              {selectedCat.healthIssues.length > 0 && (
                <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center mb-3">
                    <FontAwesome6
                      name="triangle-exclamation"
                      size={20}
                      color="#dc2626"
                    />
                    <Text className="text-red-700 font-bold text-lg ml-2">
                      Health Alerts
                    </Text>
                  </View>
                  {selectedCat.healthIssues.map((issue, index) => (
                    <View key={index} className="flex-row items-start mb-2">
                      <Text className="text-red-600 mr-2">•</Text>
                      <Text className="text-red-700 flex-1">{issue}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Analytics Summary */}
              <View className="bg-primary-50 rounded-2xl p-4 mb-6 border border-primary-200">
                <View className="flex-row items-center mb-3">
                  <FontAwesome6
                    name="chart-simple"
                    size={18}
                    color={Colors.primary[500]}
                  />
                  <Text className="text-primary font-bold text-base ml-2">
                    Health Summary (Last 30 Days)
                  </Text>
                </View>

                <View className="space-y-2">
                  {selectedCat.averageWeight != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">⚖️ Average Weight</Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.averageWeight} kg
                      </Text>
                    </View>
                  )}
                  {selectedCat.averageTemperature != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">
                        🌡️ Average Temperature
                      </Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.averageTemperature}°C
                      </Text>
                    </View>
                  )}
                  {selectedCat.averagePooCount != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">💩 Average Poo/Day</Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.averagePooCount}
                      </Text>
                    </View>
                  )}
                  {selectedCat.averagePeeCount != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">💧 Average Pee/Day</Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.averagePeeCount}
                      </Text>
                    </View>
                  )}
                  {selectedCat.averageFood != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">🍽️ Average Food/Day</Text>
                      <Text className="text-gray-900 font-bold">
                        {formatAmount(
                          Number(selectedCat.averageFood.amount),
                          selectedCat.averageFood.unit,
                        )}
                      </Text>
                    </View>
                  )}
                  {selectedCat.averageWater != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">
                        🚰 Average Water/Day
                      </Text>
                      <Text className="text-gray-900 font-bold">
                        {formatAmount(
                          Number(selectedCat.averageWater.amount),
                          selectedCat.averageWater.unit,
                        )}
                      </Text>
                    </View>
                  )}
                  {selectedCat.appetiteTrend != null && (
                    <View className="flex-row justify-between items-center py-2 border-b border-primary-100">
                      <Text className="text-gray-700">
                        🍖 Appetite Trend (7d)
                      </Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.appetiteTrend}/5
                      </Text>
                    </View>
                  )}
                  {selectedCat.energyTrend != null && (
                    <View className="flex-row justify-between items-center py-2">
                      <Text className="text-gray-700">
                        ⚡ Energy Trend (7d)
                      </Text>
                      <Text className="text-gray-900 font-bold">
                        {selectedCat.energyTrend}/5
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Weight Chart */}
              {weightData.length > 1 && (
                <View className="bg-white rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-gray-900">
                      Weight Trend
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Last {weightData.length} logs
                    </Text>
                  </View>
                  <LineChart
                    data={{
                      labels: createLabels(weightData, last7Days),
                      datasets: [{ data: weightData }],
                    }}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(107, 114, 128, ${opacity})`,
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#3b82f6',
                      },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </View>
              )}

              {/* Temperature Chart */}
              {tempData.length > 1 && (
                <View className="bg-white rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-gray-900">
                      Temperature Trend
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Last {tempData.length} logs
                    </Text>
                  </View>
                  <LineChart
                    data={{
                      labels: createLabels(tempData, last7Days),
                      datasets: [{ data: tempData }],
                    }}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(107, 114, 128, ${opacity})`,
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#f97316',
                      },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </View>
              )}

              {/* Bathroom Habits Chart */}
              {(pooData.length > 1 || peeData.length > 1) && (
                <View className="bg-white rounded-2xl p-4 mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-4">
                    Bathroom Habits
                  </Text>
                  {pooData.length > 1 && (
                    <LineChart
                      data={{
                        labels: createLabels(pooData, last7Days),
                        datasets: [{ data: pooData }],
                      }}
                      width={screenWidth - 80}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(139, 92, 46, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(107, 114, 128, ${opacity})`,
                        propsForDots: {
                          r: '6',
                          strokeWidth: '2',
                          stroke: '#8b5c2e',
                        },
                      }}
                      bezier
                      style={{ borderRadius: 16, marginBottom: 16 }}
                    />
                  )}
                  {peeData.length > 1 && (
                    <LineChart
                      data={{
                        labels: createLabels(pooData, last7Days),
                        datasets: [{ data: peeData }],
                      }}
                      width={screenWidth - 80}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(255, 204, 0, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(107, 114, 128, ${opacity})`,
                        propsForDots: {
                          r: '6',
                          strokeWidth: '2',
                          stroke: '#FFCC00',
                        },
                      }}
                      bezier
                      style={{ borderRadius: 16, marginBottom: 16 }}
                    />
                  )}
                </View>
              )}

              {/* Eating & Drinking Chart */}
              {(foodData.length > 1 || waterData.length > 1) && (
                <View className="bg-white rounded-2xl p-4 mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-4">
                    Eating & Drinking
                  </Text>
                  {foodData.length > 1 && (
                    <LineChart
                      data={{
                        labels: createLabels(foodData, last7Days),
                        datasets: [{ data: foodData }],
                      }}
                      width={screenWidth - 80}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) =>
                          `rgba(16, 185, 129, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(107, 114, 128, ${opacity})`,
                        propsForDots: {
                          r: '6',
                          strokeWidth: '2',
                          stroke: '#10b981',
                        },
                      }}
                      bezier
                      style={{
                        borderRadius: 16,
                        marginBottom: waterData.length > 1 ? 16 : 0,
                      }}
                    />
                  )}
                  {waterData.length > 1 && (
                    <LineChart
                      data={{
                        labels: createLabels(waterData, last7Days),
                        datasets: [{ data: waterData }],
                      }}
                      width={screenWidth - 80}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 0,
                        color: (opacity = 1) =>
                          `rgba(14, 165, 233, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(107, 114, 128, ${opacity})`,
                        propsForDots: {
                          r: '6',
                          strokeWidth: '2',
                          stroke: '#0ea5e9',
                        },
                      }}
                      bezier
                      style={{ borderRadius: 16 }}
                    />
                  )}
                </View>
              )}

              {/* Recent Logs */}
              {logs.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-gray-900">
                      Recent Logs
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/logs')}>
                      <Text className="text-primary-600 font-semibold">
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {logs.slice(0, 5).map((log) => (
                    <View
                      key={log.date}
                      className="py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="text-gray-900 font-semibold mb-1">
                        {fromYmd(log.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <View className="flex-row gap-3 flex-wrap">
                        {log.weight != null && (
                          <Text className="text-gray-600 text-sm">
                            ⚖️ {log.weight}kg
                          </Text>
                        )}
                        {log.temperature != null && (
                          <Text className="text-gray-600 text-sm">
                            🌡️ {log.temperature}°C
                          </Text>
                        )}
                        <Text className="text-gray-600 text-sm">
                          💩 {log.pooCount ?? 0}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                          💧 {log.peeCount ?? 0}
                        </Text>
                        {log.foodAmount != null && (
                          <Text className="text-gray-600 text-sm">
                            🍽️ {formatAmount(log.foodAmount, log.foodUnit)}
                          </Text>
                        )}
                        {log.waterAmount != null && (
                          <Text className="text-gray-600 text-sm">
                            🚰 {formatAmount(log.waterAmount, log.waterUnit)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* No Data */}
              {selectedCat.totalLogs === 0 && (
                <View className="bg-gray-100 rounded-2xl p-6 items-center">
                  <FontAwesome6 name="clipboard" size={48} color="#9ca3af" />
                  <Text className="text-gray-600 text-center mt-4">
                    No health logs yet for {selectedCat.catName}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(screens)/logs/${selectedCat.catId}/create`)
                    }
                    className="bg-primary-500 px-4 py-2 rounded-xl mt-4"
                  >
                    <Text className="text-white font-semibold">
                      Add First Log
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}
