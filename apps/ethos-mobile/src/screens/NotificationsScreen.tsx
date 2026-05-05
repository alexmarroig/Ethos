/**
 * NotificationsScreen — Central de notificações com grouping inteligente e ações
 */
import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Mic,
  X,
} from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { colors } from '../theme/colors';
import { AppNotification, useNotifications } from '../contexts/NotificationsContext';
import { BellOff, UserCheck } from '../lib/lucideCompat';

// ─── Notification config per type ─────────────────────────────────────────────
type NotifType = AppNotification['type'];

const TYPE_CONFIG: Record<
  string,
  { Icon: any; color: string; label: string; action?: string }
> = {
  prontuario_gerado: {
    Icon: BookOpen,
    color: '#3a9b73',
    label: 'Prontuário',
    action: 'Abrir',
  },
  sessao_pendente: {
    Icon: Clock,
    color: '#edbd2a',
    label: 'Sessão',
    action: 'Ver agenda',
  },
  sessao_amanha: {
    Icon: Calendar,
    color: '#234e5c',
    label: 'Lembrete',
    action: 'Ver sessão',
  },
  pagamento: {
    Icon: CreditCard,
    color: '#c78f41',
    label: 'Financeiro',
    action: 'Ver cobrança',
  },
  pagamento_vencido: {
    Icon: AlertCircle,
    color: '#bd3737',
    label: 'Vencido',
    action: 'Cobrar',
  },
  prontuario_pendente: {
    Icon: FileText,
    color: '#c78f41',
    label: 'Pendente',
    action: 'Completar',
  },
  transcricao_pronta: {
    Icon: Mic,
    color: '#3a9b73',
    label: 'Transcrição',
    action: 'Ver rascunho',
  },
  novo_agendamento: {
    Icon: UserCheck,
    color: '#234e5c',
    label: 'Agendamento',
    action: 'Responder',
  },
  formulario_atribuido: {
    Icon: CheckCircle,
    color: '#3a9b73',
    label: 'Formulário',
    action: 'Responder',
  },
  documento_disponivel: {
    Icon: FileText,
    color: '#234e5c',
    label: 'Documento',
    action: 'Abrir',
  },
  cobranca_pendente: {
    Icon: CreditCard,
    color: '#bd3737',
    label: 'Cobrança',
    action: 'Ver',
  },
};

const DEFAULT_CONFIG = { Icon: Bell, color: '#676e7e', label: 'Notificação', action: undefined };

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(ts: Date): string {
  const diff = Date.now() - ts.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

// ─── Day grouping ─────────────────────────────────────────────────────────────
function groupByDay(notifications: AppNotification[]): {
  title: string;
  data: AppNotification[];
}[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, AppNotification[]> = {
    Hoje: [],
    Ontem: [],
    'Esta semana': [],
    Anteriores: [],
  };

  for (const n of notifications) {
    const d = new Date(n.timestamp);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= today.getTime()) groups['Hoje'].push(n);
    else if (d.getTime() >= yesterday.getTime()) groups['Ontem'].push(n);
    else if (d.getTime() >= weekAgo.getTime()) groups['Esta semana'].push(n);
    else groups['Anteriores'].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

// ─── Notification Item ────────────────────────────────────────────────────────
function NotifItem({
  item,
  onPress,
  onDismiss,
  theme,
  index,
}: {
  item: AppNotification;
  onPress: () => void;
  onDismiss: () => void;
  theme: typeof colors.light;
  index: number;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG;
  const { Icon, color, label, action } = cfg;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: item.read ? theme.card : `${color}08`,
            borderColor: item.read ? theme.border : `${color}30`,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Unread bar */}
        {!item.read && (
          <View style={[styles.unreadBar, { backgroundColor: color }]} />
        )}

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Icon size={20} color={color} strokeWidth={1.8} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.contentTop}>
            <View style={[styles.labelChip, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.labelText, { color }]}>{label}</Text>
            </View>
            <Text style={[styles.timeText, { color: theme.mutedForeground }]}>
              {relativeTime(new Date(item.timestamp))}
            </Text>
          </View>
          <Text style={[styles.titleText, { color: theme.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]} numberOfLines={2}>
            {item.body}
          </Text>

          {/* Action button */}
          {action && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: `${color}50` }]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionText, { color }]}>{action}</Text>
              <ChevronRight size={13} color={color} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dismiss */}
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color={theme.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, theme }: { title: string; count: number; theme: typeof colors.light }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCount, { backgroundColor: theme.secondary }]}>
        <Text style={[styles.sectionCountText, { color: theme.mutedForeground }]}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const { notifications, markAllRead, dismissNotification } = useNotifications();

  const sections = useMemo(() => groupByDay([...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )), [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePress = useCallback((item: AppNotification) => {
    if (item.type === 'prontuario_gerado' && item.document) {
      navigation.navigate('DocumentDetail', { document: item.document });
    } else if (item.type === 'transcricao_pronta' && item.noteId) {
      navigation.navigate('Prontuario', { noteId: item.noteId });
    } else if (item.type === 'sessao_pendente' || item.type === 'sessao_amanha') {
      navigation.navigate('Calendar');
    } else if (item.type === 'pagamento' || item.type === 'pagamento_vencido' || item.type === 'cobranca_pendente') {
      navigation.navigate('Finance');
    } else if (item.type === 'novo_agendamento') {
      navigation.navigate('Availability');
    } else if (item.type === 'formulario_atribuido') {
      navigation.navigate('Forms');
    }
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color={theme.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>Lidas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Empty */}
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.secondary }]}>
            <BellOff size={32} color={theme.mutedForeground} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Tudo em dia</Text>
          <Text style={[styles.emptyBody, { color: theme.mutedForeground }]}>
            Nenhuma notificação no momento. Você receberá alertas de sessões, prontuários e cobranças aqui.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} count={section.data.length} theme={theme} />
          )}
          renderItem={({ item, index }) => (
            <NotifItem
              item={item}
              index={index}
              theme={theme}
              onPress={() => handlePress(item)}
              onDismiss={() => dismissNotification?.(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 40 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '700' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  markAllBtn: { width: 50, alignItems: 'flex-end' },
  markAllText: { fontFamily: 'Inter', fontSize: 13, fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionCountText: { fontFamily: 'Inter', fontSize: 11, fontWeight: '600' },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  contentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  labelText: { fontFamily: 'Inter', fontSize: 10, fontWeight: '700' },
  timeText: { fontFamily: 'Inter', fontSize: 11 },
  titleText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },
  bodyText: { fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  actionText: { fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  dismissBtn: { padding: 2, flexShrink: 0 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, gap: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Lora', fontSize: 20, fontWeight: '600' },
  emptyBody: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
