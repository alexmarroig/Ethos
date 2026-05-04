/**
 * InAppNotificationBanner — Toast que aparece no topo quando uma notificação
 * chega com o app em foreground. Auto-dismiss em 4s. Toque navega para destino.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Mic,
  UserCheck,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { AppNotification } from '../contexts/NotificationsContext';

const { width: W } = Dimensions.get('window');
const BANNER_W = W - 32;
const AUTO_DISMISS_MS = 4000;

const TYPE_CONFIG: Record<string, { Icon: any; color: string }> = {
  prontuario_gerado:    { Icon: BookOpen,    color: '#3a9b73' },
  sessao_pendente:      { Icon: Clock,       color: '#edbd2a' },
  sessao_amanha:        { Icon: Calendar,    color: '#234e5c' },
  pagamento:            { Icon: CreditCard,  color: '#c78f41' },
  pagamento_vencido:    { Icon: AlertCircle, color: '#bd3737' },
  prontuario_pendente:  { Icon: FileText,    color: '#c78f41' },
  transcricao_pronta:   { Icon: Mic,         color: '#3a9b73' },
  novo_agendamento:     { Icon: UserCheck,   color: '#234e5c' },
  formulario_atribuido: { Icon: CheckCircle, color: '#3a9b73' },
  documento_disponivel: { Icon: FileText,    color: '#234e5c' },
  cobranca_pendente:    { Icon: CreditCard,  color: '#bd3737' },
};

const DEFAULT = { Icon: Bell, color: '#676e7e' };

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ color, duration }: { color: string; duration: number }) {
  const width = useSharedValue(BANNER_W - 32);
  useEffect(() => {
    width.value = withTiming(0, { duration });
  }, []);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.fill, style, { backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 2, backgroundColor: 'transparent', marginTop: 8, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2, borderRadius: 1 },
});

// ─── Banner component ─────────────────────────────────────────────────────────
interface Props {
  notification: AppNotification | null;
  onDismiss: () => void;
  onPress: (notification: AppNotification) => void;
}

export function InAppNotificationBanner({ notification, onDismiss, onPress }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    'worklet';
    translateY.value = withTiming(-120, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss, opacity, translateY]);

  useEffect(() => {
    if (!notification) return;

    // Slide in
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    // Auto dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [notification?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!notification) return null;

  const cfg = TYPE_CONFIG[notification.type] ?? DEFAULT;
  const { Icon, color } = cfg;

  return (
    <Animated.View
      style={[
        styles.banner,
        animStyle,
        {
          top: insets.top + 8,
          backgroundColor: isDark ? theme.card : '#fff',
          shadowColor: color,
          borderColor: `${color}30`,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={0.9}
        onPress={() => {
          if (dismissTimer.current) clearTimeout(dismissTimer.current);
          dismiss();
          onPress(notification);
        }}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Icon size={20} color={color} strokeWidth={1.8} />
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.body, { color: theme.mutedForeground }]} numberOfLines={2}>
            {notification.body}
          </Text>
          <ProgressBar color={color} duration={AUTO_DISMISS_MS} />
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={() => {
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            dismiss();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={theme.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textArea: { flex: 1 },
  title: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  body: { fontFamily: 'Inter', fontSize: 13, lineHeight: 18 },
});
