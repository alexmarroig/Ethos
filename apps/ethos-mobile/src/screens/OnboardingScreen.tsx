/**
 * OnboardingScreen — 4 slides swipeáveis, aparece apenas na primeira abertura
 */
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Calendar, FileText, Mic, Shield, Sparkles, Lock } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { Brain, Heart } from '../lib/lucideCompat';

const { width: W, height: H } = Dimensions.get('window');

const ONBOARDING_KEY = 'ethos-onboarding-done';

// ─── Slide definitions ────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'seguranca',
    headline: 'Sua clínica,\nsempre protegida.',
    body: 'Prontuários criptografados, conformidade com o CFP e dados que só você acessa.',
    Icon: Shield,
    accent: '#234e5c',
    bg: '#f0f5f6',
    bgDark: '#0d1f26',
    iconBg: '#234e5c18',
  },
  {
    key: 'sessoes',
    headline: 'Grave e transcreva\ncom um toque.',
    body: 'Inicie a gravação da sessão. O Ethos transcreve automaticamente e gera o rascunho do prontuário.',
    Icon: Mic,
    accent: '#bd3737',
    bg: '#fdf2f2',
    bgDark: '#1e0f0f',
    iconBg: '#bd373718',
  },
  {
    key: 'prontuario',
    headline: 'Prontuários\nem segundos.',
    body: 'A IA organiza a transcrição em queixa, observações, evolução e plano — você só revisa e valida.',
    Icon: FileText,
    accent: '#3a9b73',
    bg: '#f2faf6',
    bgDark: '#0f1e17',
    iconBg: '#3a9b7318',
  },
  {
    key: 'comecar',
    headline: 'Pronto para\ncomeçar?',
    body: 'Cadastre-se em menos de 2 minutos. Sem cartão de crédito, sem burocracia.',
    Icon: Sparkles,
    accent: '#c78f41',
    bg: '#fdf8f1',
    bgDark: '#1e170a',
    iconBg: '#c78f4118',
  },
] as const;

// ─── Dot indicator ────────────────────────────────────────────────────────────
function Dot({ active, accent }: { active: boolean; accent: string }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 24 : 8, { damping: 15 }),
    opacity: withTiming(active ? 1 : 0.35, { duration: 200 }),
  }));
  return (
    <Animated.View
      style={[styles.dot, style, { backgroundColor: active ? accent : '#999' }]}
    />
  );
}

// ─── Single slide ─────────────────────────────────────────────────────────────
function Slide({
  slide,
  isDark,
}: {
  slide: typeof SLIDES[number];
  isDark: boolean;
}) {
  const { Icon, headline, body, accent, bg, bgDark, iconBg } = slide;
  const backgroundColor = isDark ? bgDark : bg;

  return (
    <View style={[styles.slide, { width: W, backgroundColor }]}>
      {/* Icon area */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.iconArea}>
        <View style={[styles.iconOuter, { backgroundColor: iconBg }]}>
          <View style={[styles.iconInner, { backgroundColor: `${accent}30` }]}>
            <Icon size={48} color={accent} strokeWidth={1.5} />
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View entering={FadeIn.delay(150).duration(600)} style={styles.textArea}>
        <Text style={[styles.headline, { color: isDark ? '#f9f7f5' : '#1a2530' }]}>
          {headline}
        </Text>
        <Text style={[styles.body, { color: isDark ? '#9ba1b0' : '#676e7e' }]}>
          {body}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== current) setCurrent(idx);
  };

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: current + 1, animated: true });
    }
  };

  const finish = async () => {
    try { await SecureStore.setItemAsync(ONBOARDING_KEY, '1'); } catch {}
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? SLIDES[current].bgDark : SLIDES[current].bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: isDark ? '#9ba1b0' : '#676e7e' }]}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => <Slide slide={item} isDark={isDark} />}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        bounces={false}
      />

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.key} active={i === current} accent={slide.accent} />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: slide.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {isLast ? 'Criar conta grátis' : 'Próximo'}
          </Text>
        </TouchableOpacity>

        {/* Login link */}
        {isLast && (
          <Animated.View entering={FadeIn.duration(400)}>
            <TouchableOpacity onPress={finish} style={styles.loginLink}>
              <Text style={[styles.loginLinkText, { color: isDark ? '#9ba1b0' : '#676e7e' }]}>
                Já tenho conta —{' '}
                <Text style={{ color: slide.accent, fontWeight: '700' }}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 40,
  },
  iconArea: { alignItems: 'center' },
  iconOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: { alignItems: 'center', gap: 16 },
  headline: {
    fontFamily: 'Lora',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },

  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 16,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 8 },
  dot: { height: 8, borderRadius: 4 },

  cta: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginLink: { paddingVertical: 4 },
  loginLinkText: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center' },
});

export { ONBOARDING_KEY };
