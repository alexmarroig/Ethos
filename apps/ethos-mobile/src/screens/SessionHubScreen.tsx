import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
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
import { ChevronLeft, Clock, MoreVertical, Pause, Play, Save, Shield, Trash2 } from 'lucide-react-native';

import { colors } from '../theme/colors';
import { fetchJob, saveClinicalNote, startTranscriptionJob, updateSessionStatus } from '../services/api/sessions';

const wait = (timeoutMs: number) => new Promise((resolve) => setTimeout(resolve, timeoutMs));

const buildDraftContent = ({
  patientName,
  sessionTime,
  rawText,
}: {
  patientName: string;
  sessionTime: string;
  rawText: string;
}) => [
  `Paciente: ${patientName}`,
  `SessÃƒÂ£o: ${sessionTime}`,
  '',
  'Rascunho inicial gerado a partir da transcriÃƒÂ§ÃƒÂ£o:',
  rawText,
  '',
  'ObservaÃƒÂ§ÃƒÂµes clÃƒÂ­nicas:',
  '',
].join('\n');

export default function SessionHubScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const session = route?.params?.session;
  const patientName = route?.params?.patientName || 'Paciente';
  const sessionTime = route?.params?.time || (session?.scheduled_at ? new Date(session.scheduled_at).toLocaleString('pt-BR') : 'SessÃƒÂ£o em andamento');

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isProcessingDraft, setIsProcessingDraft] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const waveformValues = useRef(Array.from({ length: 20 }, () => makeMutable(5))).current;

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((current) => current + 1);
      }, 1000);

      waveformValues.forEach((value) => {
        value.value = withRepeat(
          withTiming(15 + Math.random() * 35, { duration: 300 + Math.random() * 300 }),
          -1,
          true,
        );
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      waveformValues.forEach((value) => {
        value.value = withTiming(5);
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isRecording, waveformValues]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      const currentPermission = await Audio.getPermissionsAsync();
      const permission =
        currentPermission.granted ? currentPermission : await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permissao necessaria',
          permission.canAskAgain
            ? 'Permita o uso do microfone para gravar a sessao.'
            : 'O microfone foi bloqueado. Ative a permissao nas configuracoes do Android para continuar.',
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const created = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(created.recording);
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.warn('[SessionHub] Falha ao iniciar gravacao', error);
      Alert.alert('Erro', 'NÃƒÂ£o foi possÃƒÂ­vel iniciar a gravaÃƒÂ§ÃƒÂ£o.');
    }
  };

  const waitForCompletedJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const job = await fetchJob(jobId);
      if (job.status === 'completed') return job;
      if (job.status === 'failed') throw new Error('A transcriÃƒÂ§ÃƒÂ£o falhou.');
      await wait(250);
    }

    throw new Error('A transcriÃƒÂ§ÃƒÂ£o demorou mais do que o esperado.');
  };

  const handleStop = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (!session?.id) {
        Alert.alert('GravaÃƒÂ§ÃƒÂ£o salva', uri ? 'A gravaÃƒÂ§ÃƒÂ£o foi concluÃƒÂ­da localmente.' : 'A gravaÃƒÂ§ÃƒÂ£o foi encerrada.');
        setDuration(0);
        return;
      }

      setIsProcessingDraft(true);

      const rawText = `SessÃƒÂ£o registrada em ${sessionTime}. DuraÃƒÂ§ÃƒÂ£o aproximada: ${formatTime(duration)}. Arquivo local: ${uri ?? 'nÃƒÂ£o disponÃƒÂ­vel'}.`;
      const transcription = await startTranscriptionJob(session.id, rawText);
      const completedJob = await waitForCompletedJob(transcription.job_id);
      const draftNoteId = completedJob.draft_note_id
        ?? (await saveClinicalNote(session.id, buildDraftContent({ patientName, sessionTime, rawText }))).id;
      await updateSessionStatus(session.id, 'completed');
      setDuration(0);

      navigation.navigate('ClinicalNoteEditor', {
        noteId: draftNoteId,
        sessionId: session.id,
        patientId: session.patient_id,
        patientName,
      });
    } catch (error: any) {
      console.warn('[SessionHub] Falha ao gerar rascunho clinico', error);
      Alert.alert('Erro', error?.message ?? 'NÃƒÂ£o foi possÃƒÂ­vel gerar o rascunho clÃƒÂ­nico.');
    } finally {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      } catch (audioModeError) {
        console.warn('[SessionHub] Falha ao restaurar modo de audio', audioModeError);
      }
      setIsProcessingDraft(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#15171a' }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.sessionTime}>{sessionTime}</Text>
        </View>
        <TouchableOpacity>
          <MoreVertical size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.recorderBody}>
        <Animated.View entering={FadeIn.delay(300)} style={styles.securityBadge}>
          <Shield size={16} color="#3a9b73" />
          <Text style={styles.securityText}>ENCRYPTION ACTIVE</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800)} style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(duration)}</Text>
          <Text style={styles.recordingStatus}>
            {isProcessingDraft
              ? 'GERANDO RASCUNHO CLÃƒÂNICO...'
              : isRecording
                ? (isPaused ? 'PAUSADO' : 'GRAVANDO...')
                : 'PRONTO PARA INICIAR'}
          </Text>
        </Animated.View>

        <View style={styles.waveformContainer}>
          {waveformValues.map((value, index) => (
            <WaveBar key={index} animatedValue={value} />
          ))}
        </View>

        {isProcessingDraft ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.processingText}>TranscriÃƒÂ§ÃƒÂ£o concluÃƒÂ­da, preparando nota...</Text>
          </View>
        ) : null}
      </View>

      <Animated.View entering={SlideInDown.duration(600)} style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.secondaryControl} onPress={() => { setDuration(0); setIsRecording(false); }}>
            <Trash2 size={24} color="#fff" opacity={0.6} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainControl, { backgroundColor: isRecording && !isPaused ? '#3a9b73' : '#234e5c', opacity: isProcessingDraft ? 0.6 : 1 }]}
            onPress={() => {
              if (isProcessingDraft) return;
              if (!isRecording) void handleStart();
              else setIsPaused((current) => !current);
            }}
            disabled={isProcessingDraft}
          >
            {isRecording && !isPaused ? <Pause size={32} color="#fff" fill="#fff" /> : <Play size={32} color="#fff" fill="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryControl} onPress={() => void handleStop()} disabled={isProcessingDraft}>
            <Save size={24} color="#fff" opacity={0.6} />
          </TouchableOpacity>
        </View>

        <View style={styles.micToggleContainer}>
          <View style={[styles.micToggle, { backgroundColor: '#272b34' }]}>
            <Clock size={20} color="#fff" />
            <Text style={styles.micToggleText}>{session?.duration_minutes ? `${session.duration_minutes} min previstos` : 'SessÃƒÂ£o livre'}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const WaveBar = ({ animatedValue }: any) => {
  const style = useAnimatedStyle(() => ({
    height: animatedValue.value,
  }));
  return <Animated.View style={[styles.waveBar, style]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerInfo: {
    alignItems: 'center',
  },
  patientName: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  sessionTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  recorderBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(58, 155, 115, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 40,
  },
  securityText: {
    color: '#318260',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timerText: {
    color: '#fff',
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  recordingStatus: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -10,
    textAlign: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 60,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#234e5c',
    borderRadius: 2,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  processingText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter',
    fontSize: 13,
  },
  controlsContainer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  mainControl: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  secondaryControl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micToggleContainer: {
    alignItems: 'center',
  },
  micToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  micToggleText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});

