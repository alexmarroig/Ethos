import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Sparkles, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface CalendarHeaderProps {
  title: string;
  subtitle: string;
  loading?: boolean;
  isDark: boolean;
  onCommandPress: () => void;
  onPlusPress: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  title,
  subtitle,
  loading,
  isDark,
  onCommandPress,
  onPlusPress,
}) => {
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <View>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
        <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      </View>
      <View style={styles.actions}>
        {loading && <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />}
        <TouchableOpacity 
          style={[styles.roundButton, { backgroundColor: isDark ? '#1e2228' : '#f0f4f3' }]} 
          onPress={onCommandPress}
          activeOpacity={0.7}
        >
          <Sparkles size={19} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.roundButton, { backgroundColor: theme.primary }]} 
          onPress={onPlusPress}
          activeOpacity={0.8}
        >
          <Plus size={20} color={theme.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  subtitle: { 
    fontFamily: 'Inter', 
    fontSize: 12, 
    textTransform: 'capitalize',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: { 
    fontFamily: 'Lora', 
    fontSize: 26, 
    fontWeight: '700' 
  },
  actions: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
});
