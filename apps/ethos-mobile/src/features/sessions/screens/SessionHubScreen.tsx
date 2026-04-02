// apps/ethos-mobile/src/screens/SessionHubScreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

import { Audio } from 'expo-av';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  makeMutable,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  ChevronLeft,
  Clock,
  MoreVertical,
  Pause,
  Play,
  Save,
  Shield,
  Trash2,
} from 'lucide-react-native';

import { colors } from '../theme/colors';
import {
  fetchJob,
  saveClinicalNote,
  startTranscriptionJob,
  updateSessionStatus,
} from '../services/api/sessions';

// =====================
// HELPERS
// =====================
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const buildDraft = (patient: string, time: string, text: string) => `
Paciente: ${patient}
Sessão: ${time}

Transcrição inicial:
${text}

Observações clínicas:
`;

// =====================
// COMPONENT
// =====================
export default function SessionHubScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const session = route?.params?.session;
  const patientName = route?.params?.patientName || 'Paciente';
  const sessionTime =
    route?.params?.time ||
    (session?.scheduled_at
      ? new Date(session.scheduled_at).toLocaleString('pt-BR')
      : 'Sessão');

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveform = useRef(Array.from({ length: 20 }, () => makeMutable(5))).current;

  // =====================
  // EFFECT
  // =====================
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      waveform.forEach((v) => {
        v.value = withRepeat(
          withTiming(15 + Math.random() * 30, { duration: 300 }),
          -1,
          true
        );
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      waveform.forEach((v) => (v.value = withTiming(5)));
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // =====================
  // ACTIONS
  // =====================
  const start = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permissão negada');

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();

      setRecording(rec);
      setIsRecording(true);
      setIsPaused(false);
    } catch {
      Alert.alert('Erro ao iniciar gravação');
    }
  };

  const stop = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    setRecording(null);
    setIsRecording(false);
    setProcessing(true);

    try {
      const rawText = `Sessão de ${patientName} (${formatTime(duration)})`;

      const job = await startTranscriptionJob(session.id, rawText);

      let result;
      for (let i = 0; i < 12; i++) {
        const j = await fetchJob(job.job_id);
        if (j.status === 'completed') {
          result = j;
          break;
        }
        await wait(300);
      }

      const note =
        result?.draft_note_id ||
        (await saveClinicalNote(
          session.id,
          buildDraft(patientName, sessionTime, rawText)
        )).id;

      await updateSessionStatus(session.id, 'completed');

      navigation.navigate('ClinicalNoteEditor', {
        noteId: note,
        sessionId: session.id,
        patientName,
      });
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao processar');
    } finally {
      setProcessing(false);
      setDuration(0);
    }
  };

  // =====================
  // UI
  // =====================
  return (
    <View style={[styles.container, { backgroundColor: '#15171a' }]}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.patient}>{patientName}</Text>
          <Text style={styles.time}>{sessionTime}</Text>
        </View>

        <MoreVertical size={24} color="#fff" />
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <Text style={styles.timer}>{formatTime(duration)}</Text>

        <View style={styles.wave}>
          {waveform.map((v, i) => (
            <Wave key={i} value={v} />
          ))}
        </View>

        {processing && <ActivityIndicator color="#fff" />}
      </View>

      {/* CONTROLS */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setDuration(0)}>
          <Trash2 size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.main}
          onPress={() => (!isRecording ? start() : setIsPaused(!isPaused))}
        >
          {isRecording ? (
            <Pause size={30} color="#fff" />
          ) : (
            <Play size={30} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={stop}>
          <Save size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =====================
// WAVE
// =====================
const Wave = ({ value }: any) => {
  const style = useAnimatedStyle(() => ({
    height: value.value,
  }));
  return <Animated.View style={[styles.bar, style]} />;
};

// =====================
// STYLES
// =====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  headerInfo: { alignItems: 'center' },
  patient: { color: '#fff', fontSize: 18 },
  time: { color: '#aaa', fontSize: 12 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timer: { color: '#fff', fontSize: 60 },
  wave: { flexDirection: 'row', gap: 4, marginTop: 20 },
  bar: { width: 3, backgroundColor: '#234e5c' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 40 },
  main: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#234e5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
});