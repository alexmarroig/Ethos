import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { FileText, Play, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../shared/hooks/useTheme';

type NextSessionCardProps = {
  timeLabel: string;
  patientName: string;
  sessionLabel: string;
  focusText: string;
  onPressSession: () => void;
  onPressRecords: () => void;
};

export const NextSessionCard = React.memo(function NextSessionCard({
  timeLabel,
  patientName,
  sessionLabel,
  focusText,
  onPressSession,
  onPressRecords,
}: NextSessionCardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(800)}>
      <TouchableOpacity
        style={[
          styles.highlightCard,
          {
            backgroundColor: isDark ? '#1e2d35' : '#fff',
            borderWidth: isDark ? 0 : 1,
            borderColor: '#f0f0f0',
          },
        ]}
        onPress={onPressSession}
      >
        <View style={styles.highlightHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.timeLabel, { color: '#00ccdb' }]}>{timeLabel}</Text>
            <Text style={[styles.highlightPatientName, { color: primaryTeal }]}>{patientName}</Text>
            <View style={styles.sessionInfoRow}>
              <FileText size={16} color={theme.mutedForeground} />
              <Text style={[styles.highlightSessionType, { color: theme.mutedForeground }]}>
                {sessionLabel}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.videoButton}>
            <Play size={24} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.highlightDivider} />

        <View style={styles.highlightFooter}>
          <Text style={[styles.focoText, { color: theme.mutedForeground }]}>
            Foco: <Text style={styles.italicText}>{focusText}</Text>
          </Text>
          <TouchableOpacity style={styles.verProntuario} onPress={onPressRecords}>
            <Text style={[styles.verProntuarioText, { color: '#00ccdb' }]}>VER PRONTUÁRIO</Text>
            <ChevronRight size={16} color="#00ccdb" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  highlightCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    marginBottom: 4,
  },
  highlightPatientName: {
    fontSize: 22,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  highlightSessionType: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  videoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00ccdb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00ccdb',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  highlightDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
  },
  highlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  italicText: {
    fontStyle: 'italic',
  },
  verProntuario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verProntuarioText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
});
