import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../shared/hooks/useTheme';

type ProgressItem = {
  label: string;
  percent: number;
  color: string;
};

type FinanceSummaryCardProps = {
  totalLabel: string;
  totalValue: string;
  trendBadge: string;
  progressItems: ProgressItem[];
};

export const FinanceSummaryCard = React.memo(function FinanceSummaryCard({
  totalLabel,
  totalValue,
  trendBadge,
  progressItems,
}: FinanceSummaryCardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  return (
    <Animated.View entering={FadeInDown.delay(400).duration(800)}>
      <View
        style={[
          styles.financeCardLarge,
          { backgroundColor: isDark ? '#272b34' : '#fff', borderColor: theme.border },
        ]}
      >
        <View style={styles.financeHeaderLarge}>
          <View>
            <Text style={[styles.financeLabelLarge, { color: theme.mutedForeground }]}>
              {totalLabel}
            </Text>
            <Text style={[styles.financeValueLarge, { color: primaryTeal }]}>{totalValue}</Text>
          </View>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{trendBadge}</Text>
          </View>
        </View>

        {progressItems.map((item, index) => (
          <View key={index} style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: theme.mutedForeground }]}>
                {item.label}
              </Text>
              <Text style={[styles.progressPercent, { color: theme.foreground }]}>
                {item.percent}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.percent}%` as any, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  financeCardLarge: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 40,
  },
  financeHeaderLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  financeLabelLarge: {
    fontSize: 13,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  financeValueLarge: {
    fontSize: 32,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  percentBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentText: {
    color: '#16a34a',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  progressPercent: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
