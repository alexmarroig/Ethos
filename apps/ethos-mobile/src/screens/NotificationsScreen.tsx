// src/screens/NotificationsScreen.tsx
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme, Alert,
} from 'react-native';
import { ChevronLeft, CheckCircle, Clock, CreditCard } from 'lucide-react-native';
import { useTheme } from '../shared/hooks/useTheme';
import { useNotifications, AppNotification } from '../contexts/NotificationsContext';

const ICON_MAP = {
  prontuario_gerado: { Icon: CheckCircle, color: '#22c55e' },
  sessao_pendente: { Icon: Clock, color: '#f97316' },
  pagamento: { Icon: CreditCard, color: '#00ccdb' },
};

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { Icon, color } = ICON_MAP[item.type];

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: isDark ? '#1e2126' : '#fff', borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconWrapper, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.foreground }]}>{item.title}</Text>
        <Text style={[styles.body, { color: theme.mutedForeground }]}>{item.body}</Text>
        <Text style={[styles.time, { color: theme.mutedForeground }]}>
          {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: '#00ccdb' }]} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const { notifications, markAllRead } = useNotifications();
  const primaryTeal = '#234e5c';

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const handlePress = (n: AppNotification) => {
    if (n.type === 'prontuario_gerado' && n.document) {
      navigation.navigate('DocumentDetail', { document: n.document });
    } else {
      Alert.alert(n.title, n.body);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Notificações</Text>
        <View style={{ width: 36 }} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Nenhuma notificação por enquanto
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={() => handlePress(item)} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  list: { paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginBottom: 2 },
  body: { fontSize: 13, fontFamily: 'Inter' },
  time: { fontSize: 12, fontFamily: 'Inter', marginTop: 4, opacity: 0.7 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Inter' },
});
