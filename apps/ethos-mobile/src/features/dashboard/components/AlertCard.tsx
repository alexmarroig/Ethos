import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { FileText, Banknote } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../shared/hooks/useTheme';

type AlertCardProps = {
  overdueReportsCount: number;
  pendingPaymentsAmount: string;
  pendingPaymentsCount: number;
  onPressOverdueReports?: () => void;
  onPressPendingPayments?: () => void;
};

export const AlertCard = React.memo(function AlertCard({
  overdueReportsCount,
  pendingPaymentsAmount,
  pendingPaymentsCount,
  onPressOverdueReports,
  onPressPendingPayments,
}: AlertCardProps) {
  const isDark = useColorScheme() === 'dark';
  const primaryTeal = '#234e5c';

  return (
    <View style={styles.alertGrid}>
      <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.alertCol}>
        <TouchableOpacity
          style={[
            styles.alertCardSmall,
            { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: '#f0f0f0' },
          ]}
          onPress={onPressOverdueReports}
        >
          <View style={[styles.alertIconWrapper, { backgroundColor: '#fee2e2' }]}>
            <FileText size={20} color="#ef4444" />
            <View style={styles.alertBadgeSmall}>
              <Text style={styles.alertBadgeText}>{overdueReportsCount}</Text>
            </View>
          </View>
          <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>
            {'Laudos\nAtrasados'}
          </Text>
          <Text style={[styles.alertSubSmall, { color: '#00ccdb' }]}>
            {'Revisão ética\npendente'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.alertCol}>
        <TouchableOpacity
          style={[
            styles.alertCardSmall,
            { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: '#f0f0f0' },
          ]}
          onPress={onPressPendingPayments}
        >
          <View style={[styles.alertIconWrapper, { backgroundColor: '#fff7ed' }]}>
            <Banknote size={20} color="#f97316" />
            <View style={[styles.alertBadgeLarge, { backgroundColor: '#fff7ed' }]}>
              <Text style={[styles.alertBadgeTextLarge, { color: '#f97316' }]}>
                {pendingPaymentsAmount}
              </Text>
            </View>
          </View>
          <Text style={[styles.alertTitleSmall, { color: primaryTeal }]}>Pagamentos</Text>
          <Text style={[styles.alertSubSmall, { color: '#00ccdb' }]}>
            {pendingPaymentsCount} sessões pendentes
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  alertGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  alertCol: {
    flex: 1,
  },
  alertCardSmall: {
    padding: 20,
    borderRadius: 32,
    borderWidth: 1,
    height: 180,
  },
  alertIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fee2e2',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  alertBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#ef4444',
  },
  alertBadgeLarge: {
    position: 'absolute',
    top: -4,
    right: -30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeTextLarge: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  alertTitleSmall: {
    fontSize: 16,
    fontFamily: 'Lora',
    fontWeight: '700',
    marginBottom: 4,
  },
  alertSubSmall: {
    fontSize: 12,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
});
