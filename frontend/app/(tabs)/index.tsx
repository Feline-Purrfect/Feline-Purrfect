import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useCats } from '@/hooks/useCats';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { isSessionExpired } from '@/lib/api/client';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const {
    data: cats = [],
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useCats();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useDashboardAnalytics();

  const isLoading = catsLoading || analyticsLoading;
  const totalHealthIssues =
    analytics?.analysis.reduce(
      (sum, cat) => sum + cat.healthIssues.length,
      0,
    ) || 0;
  const totalLogs =
    analytics?.analysis.reduce((sum, cat) => sum + cat.totalLogs, 0) || 0;

  // ✅ Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchCats();
      refetchAnalytics();
    }, [refetchCats, refetchAnalytics]),
  );

  const onRefresh = async () => {
    await Promise.all([refetchCats(), refetchAnalytics()]);
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const error = catsError ?? analyticsError;
  if (error) {
    // Session expiry is handled globally (sign-out + redirect); just avoid flashing a second message.
    if (isSessionExpired(error)) return <LoadingIndicator />;
    return (
      <ErrorView
        message={(error as any)?.message || 'Could not load your dashboard.'}
        onRetry={onRefresh}
      />
    );
  }

  if (cats.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <FontAwesome6 name="cat" size={80} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-6 mb-2">
          Welcome to Feline Purrfect! 🐱
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Add your first cat to start tracking their health and wellbeing
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/my-cats/create')}
          className="bg-primary-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Add Your First Cat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-gray-600 mt-1">
            Overview of your {cats.length} {cats.length === 1 ? 'cat' : 'cats'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-6">
          {/* Total Cats */}
          <View className="flex-1 bg-purple-500 rounded-2xl p-4">
            <FontAwesome6 name="cat" size={24} color="white" />
            <Text className="text-white text-3xl font-bold mt-2">
              {cats.length}
            </Text>
            <Text className="text-purple-100 text-sm">
              {cats.length === 1 ? 'Cat' : 'Cats'}
            </Text>
          </View>

          {/* Total Logs */}
          <View className="flex-1 bg-blue-500 rounded-2xl p-4">
            <FontAwesome6 name="clipboard" size={24} color="white" />
            <Text className="text-white text-3xl font-bold mt-2">
              {totalLogs}
            </Text>
            <Text className="text-blue-100 text-sm">Health Logs</Text>
          </View>
        </View>

        {/* Health Alerts Card */}
        {totalHealthIssues > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/dashboard/analytics')}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <FontAwesome6
                    name="triangle-exclamation"
                    size={18}
                    color="#dc2626"
                  />
                  <Text className="text-red-700 font-bold text-lg ml-2">
                    Health Alerts
                  </Text>
                </View>
                <Text className="text-red-600 text-sm">
                  {totalHealthIssues}{' '}
                  {totalHealthIssues === 1 ? 'issue' : 'issues'} detected across
                  your cats
                </Text>
              </View>
              <FontAwesome6 name="chevron-right" size={20} color="#dc2626" />
            </View>
          </TouchableOpacity>
        )}

        {/* Cat Summary Cards */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Your Cats</Text>
            <TouchableOpacity
              onPress={() => router.push('/dashboard/analytics')}
              className="flex-row items-center"
            >
              <Text className="text-primary-600 font-semibold mr-1">
                Detailed View
              </Text>
              <FontAwesome6 name="chart-line" size={16} color="#155C8D" />
            </TouchableOpacity>
          </View>

          {analytics?.analysis.map((cat) => (
            <TouchableOpacity
              key={cat.catId}
              onPress={() => router.push(`/my-cats/${cat.catId}`)}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">
                    {cat.catName}
                  </Text>
                  {cat.breed && (
                    <Text className="text-purple-600 text-sm">{cat.breed}</Text>
                  )}
                </View>
                {cat.healthIssues.length > 0 && (
                  <View className="bg-red-100 px-3 py-1 rounded-full">
                    <Text className="text-red-700 text-xs font-semibold">
                      {cat.healthIssues.length}{' '}
                      {cat.healthIssues.length === 1 ? 'Alert' : 'Alerts'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick Stats Row */}
              <View className="flex-row gap-2">
                {cat.totalLogs > 0 ? (
                  <>
                    <View className="flex-1 bg-gray-50 rounded-lg p-2">
                      <Text className="text-gray-500 text-xs">Logs</Text>
                      <Text className="text-gray-900 font-semibold">
                        {cat.totalLogs}
                      </Text>
                    </View>
                    {cat.averageWeight && (
                      <View className="flex-1 bg-gray-50 rounded-lg p-2">
                        <Text className="text-gray-500 text-xs">
                          Avg Weight
                        </Text>
                        <Text className="text-gray-900 font-semibold">
                          {cat.averageWeight} kg
                        </Text>
                      </View>
                    )}
                    {cat.averageTemperature && (
                      <View className="flex-1 bg-gray-50 rounded-lg p-2">
                        <Text className="text-gray-500 text-xs">Avg Temp</Text>
                        <Text className="text-gray-900 font-semibold">
                          {cat.averageTemperature}°C
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View className="flex-1 bg-gray-50 rounded-lg p-2">
                    <Text className="text-gray-500 text-sm">
                      No health logs yet
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Quick Actions
          </Text>

          <TouchableOpacity
            onPress={() => router.push(`/logs`)}
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 flex-row items-center"
          >
            <View className="bg-blue-100 w-12 h-12 rounded-xl items-center justify-center">
              <FontAwesome6 name="plus" size={20} color="#3b82f6" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-gray-900 font-semibold text-base">
                Log Health Data
              </Text>
              <Text className="text-gray-500 text-sm">
                Record daily activities and health metrics
              </Text>
            </View>
            <FontAwesome6 name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/my-cats/create')}
            className="bg-white rounded-2xl p-4 border border-gray-200 flex-row items-center"
          >
            <View className="bg-purple-100 w-12 h-12 rounded-xl items-center justify-center">
              <FontAwesome6 name="cat" size={20} color="#9333ea" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-gray-900 font-semibold text-base">
                Add New Cat
              </Text>
              <Text className="text-gray-500 text-sm">
                Register another cat to track
              </Text>
            </View>
            <FontAwesome6 name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
