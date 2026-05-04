import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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
  FileText,
  Mic,
  MoreVertical,
  Pause,
  Play,
  Shield,
  Square,
  BookOpen,
} from 'lucide-react-native';

import { colors } from '../theme/colors';
import {
  fetchJob,
  saveClinicalNote,
  startTranscriptionJob,
  updateSessionStatus,
} from '../services/api/sessions';

// ─── Types ───────────────────────────────────────────────────────────────────
type HubState = 'IDLE' | 'GRAVANDO' | 'PAUSADO' | 'PROCESSANDO' | 'CONCLUIDO';

type TranscriptResult = {
  transcript: string;
  draftNoteId: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const buildDraftContent = ({
  patientName,
  sessionTime,
  rawText,
}: {
  patientName: string;
  sessionTime: string;
  rawText: string;
}) =>
  [
    `Paciente: ${patientName}`,
    `Sessao: ${sessionTime}`,
    '',
    '--- RASCUNHO GERADO POR TRANSCRICAO ---',
    rawText,
    '',
    'Queixa principal:',
    '',
    'Observacoes clinicas:',
    '',
    'Evolucao terapeutica:',
    '',
    'Plano terapeutico:',
    '',
  ].join('\n');

// ─── WaveBar ─────────────────────────────────────────────────────────────────
const WaveBar = ({ animatedValue }: { animatedValue: ReturnType<typeof makeMutable> }) => {
  const style = useAnimatedStyle(() => ({ height: animatedValue.value }));
  return <Animated.View style={[styles.waveBar, style]} />;
};

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function SessionHubScreen({ navigation, route }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const session = route?.params?.session;
  const patientName: string = route?.params?.patientName || 'Paciente';
  const sessionTime: string =
    route?.params?.time ||
    (session?.scheduled_at
      ? new Date(session.scheduled_at).toLocaleString('pt-BR')
      : 'Sessao em andamento');

  const [hubState, setHubState] = useState<HubState>('IDLE');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformValues = useRef(Array.from({ length: 24 }, () => makeMutable(5))).current;

  // Waveform animation
  useEffect(() => {
    if (hubState === 'GRAVANDO') {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      waveformValues.forEach((v) => {
        v.value = withRepeat(
          withTiming(10 + Math.random() * 40, { duration: 250 + Math.random() * 350 }),
          -1,
          true,
        );
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      waveformValues.forEach((v) => {
        v.value = withTiming(hubState === 'IDLE' ? 5 : 5);
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hubState, waveformValues]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const perm = await Audio.getPermissionsAsync();
      const finalPerm = perm.granted ? perm : await Audio.requestPermissionsAsync();

      if (!finalPerm.granted) {
        Alert.alert(
          'Permissao necessaria',
          finalPerm.canAskAgain
            ? 'Permita o uso do microfone para gravar a sessao.'
            : 'O microfone foi bloqueado. Ative nas configuracoes.',
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

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setHubState('GRAVANDO');
    } catch (err) {
      Alert.alert('Erro', 'Nao foi possivel iniciar a gravacao.');
    }
  };

  const handlePauseResume = async () => {
    if (!recording) return;
    if (hubState === 'GRAVANDO') {
      await recording.pauseAsync();
      setHubState('PAUSADO');
    } else if (hubState === 'PAUSADO') {
      await recording.startAsync();
      setHubState('GRAVANDO');
    }
  };

  const handleStop = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setHubState('PROCESSANDO');

      if (!session?.id) {
        Alert.alert('Gravacao salva', uri ? 'Gravacao concluida localmente.' : 'Gravacao encerrada.');
        setHubState('IDLE');
        setDuration(0);
        return;
      }

      setProcessingStep('Enviando audio...');
      const rawText = `Sessao registrada em ${sessionTime}. Duracao: ${formatTime(duration)}. Arquivo: ${uri ?? 'nao disponivel'}.`;

      setProcessingStep('Transcrevendo audio...');
      const transcription = await startTranscriptionJob(session.id, rawText);

      // Poll for job completion
      let completedJob: any = null;
      for (let i = 0; i < 20; i++) {
        setProcessingStep(`Transcrevendo... (${i + 1}/20)`);
        const job = await fetchJob(transcription.job_id);
        if (job.status === 'completed') { completedJob = job; break; }
        if (job.status === 'failed') throw new Error('A transcricao falhou.');
        await wait(3000);
      }

      if (!completedJob) throw new Error('A transcricao demorou mais do esperado.');

      setProcessingStep('Gerando rascunho clinico...');
      const draftContent = buildDraftContent({ patientName, sessionTime, rawText });
      const note = completedJob.draft_note_id
        ? { id: completedJob.draft_note_id }
        : await saveClinicalNote(session.id, draftContent);

      const transcriptText: string = completedJob?.data?.transcript ?? rawText;
      await updateSessionStatus(session.id, 'completed');

      setResult({ transcript: transcriptText, draftNoteId: note.id });
      setTranscriptPreview(transcriptText.slice(0, 220));
      setHubState('CONCLUIDO');
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Nao foi possivel processar a sessao.');
      setHubState('IDLE');
    } finally {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      } catch {}
    }
  };

  const handleDiscard = () => {
    if (hubState === 'GRAVANDO' || hubState === 'PAUSADO') {
      Alert.alert('Descartar gravacao?', 'A gravacao atual sera perdida.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (recording) await recording.stopAndUnloadAsync();
            } catch {}
            setRecording(null);
            setHubState('IDLE');
            setDuration(0);
          },
        },
      ]);
    } else {
      setHubState('IDLE');
      setDuration(0);
      setResult(null);
    }
  };

  // ─── Render states ──────────────────────────────────────────────────────────
  const renderIdle = () => (
    <Animated.View entering={FadeIn} style={styles.idleContainer}>
      <View style={styles.sessionInfoBox}>
        <Text style={styles.sessionInfoLabel}>SESSAO</Text>
        <Text style={styles.sessionInfoPatient}>{patientName}</Text>
        <Text style={styles.sessionInfoTime}>{sessionTime}</Text>
        {session?.duration_minutes ? (
          <View style={styles.durationBadge}>
            <Clock size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.durationText}>{session.duration_minutes} min previstos</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
        <Mic size={32} color="#fff" />
        <Text style={styles.startButtonText}>Iniciar Gravacao</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRecording = () => (
    <Animated.View entering={FadeIn} style={styles.recordingContainer}>
      <Animated.View entering={FadeIn.delay(200)} style={styles.securityBadge}>
        <Shield size={14} color="#3a9b73" />
        <Text style={styles.securityText}>CRIPTOGRAFADO</Text>
        {hubState === 'PAUSADO' && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>PAUSADO</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600)} style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(duration)}</Text>
        <Text style={styles.recordingStatus}>
          {hubState === 'PAUSADO' ? 'PAUSADO' : 'GRAVANDO...'}
        </Text>
      </Animated.View>

      <View style={styles.waveformContainer}>
        {waveformValues.map((v, i) => (
          <WaveBar key={i} animatedValue={v} />
        ))}
      </View>

      <Animated.View entering={SlideInDown.duration(500)} style={styles.recordingControls}>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardBtnText}>Descartar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pauseBtn, { backgroundColor: hubState === 'PAUSADO' ? '#3a9b73' : 'rgba(255,255,255,0.1)' }]}
          onPress={() => void handlePauseResume()}
        >
          {hubState === 'GRAVANDO' ? (
            <Pause size={28} color="#fff" fill="#fff" />
          ) : (
            <Play size={28} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.stopBtn} onPress={() => void handleStop()}>
          <Square size={20} color="#fff" fill="#fff" />
          <Text style={styles.stopBtnText}>Finalizar</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  const renderProcessing = () => (
    <Animated.View entering={FadeIn} style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#234e5c" style={{ marginBottom: 24 }} />
      <Text style={styles.processingTitle}>Processando sessao</Text>
      <Text style={styles.processingStep}>{processingStep}</Text>
      <Text style={styles.processingHint}>Aguarde, isso pode levar alguns instantes...</Text>
    </Animated.View>
  );

  const renderConcluded = () => (
    <Animated.View entering={FadeIn} style={styles.concludedContainer}>
      <View style={styles.concludedBadge}>
        <Text style={styles.concludedBadgeText}>✓  SESSAO CONCLUIDA</Text>
      </View>

      <Text style={styles.concludedTitle}>Sessao de {patientName}</Text>
      <Text style={styles.concludedSubtitle}>Duracao: {formatTime(duration)}</Text>

      {transcriptPreview ? (
        <View style={styles.transcriptPreview}>
          <Text style={styles.transcriptPreviewLabel}>PREVIEW DA TRANSCRICAO</Text>
          <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.transcriptText}>{transcriptPreview}...</Text>
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() =>
            navigation.navigate('ProntuarioScreen', {
              sessionId: session?.id,
              patientId: session?.patient_id,
              patientName,
              noteId: result?.draftNoteId,
            })
          }
          activeOpacity={0.85}
        >
          <BookOpen size={20} color="#fff" />
          <Text style={styles.actionButtonPrimaryText}>Abrir Prontuario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() =>
            navigation.navigate('ReportWizard', {
              sessionId: session?.id,
              patientId: session?.patient_id,
              patientName,
            })
          }
          activeOpacity={0.85}
        >
          <FileText size={20} color="#234e5c" />
          <Text style={styles.actionButtonSecondaryText}>Gerar Relatorio</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.returnBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.returnBtnText}>Voltar para o inicio</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerPatient}>{patientName}</Text>
          <Text style={styles.headerTime}>{sessionTime}</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MoreVertical size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {hubState === 'IDLE' && renderIdle()}
        {(hubState === 'GRAVANDO' || hubState === 'PAUSADO') && renderRecording()}
        {hubState === 'PROCESSANDO' && renderProcessing()}
        {hubState === 'CONCLUIDO' && renderConcluded()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15171a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerInfo: { alignItems: 'center', flex: 1 },
  headerPatient: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Lora',
    fontWeight: '700',
  },
  headerTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  body: {
    flex: 1,
  },

  // IDLE
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 48,
  },
  sessionInfoBox: {
    alignItems: 'center',
    gap: 6,
  },
  sessionInfoLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sessionInfoPatient: {
    color: '#fff',
    fontFamily: 'Lora',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionInfoTime: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Inter',
    fontSize: 14,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  durationText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter',
    fontSize: 12,
  },
  startButton: {
    backgroundColor: '#bd3737',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 40,
    elevation: 8,
    shadowColor: '#bd3737',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  startButtonText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
  },

  // RECORDING
  recordingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(58,155,115,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  securityText: {
    color: '#3a9b73',
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  pausedBadge: {
    backgroundColor: '#edbd2a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  pausedBadgeText: {
    color: '#15171a',
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  timerContainer: { alignItems: 'center' },
  timerText: {
    color: '#fff',
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '200',
  },
  recordingStatus: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 60,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#234e5c',
    borderRadius: 2,
    minHeight: 4,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  discardBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flex: 1,
    alignItems: 'center',
  },
  discardBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter',
    fontSize: 14,
  },
  pauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#234e5c',
    flex: 1,
    justifyContent: 'center',
  },
  stopBtnText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },

  // PROCESSING
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  processingTitle: {
    color: '#fff',
    fontFamily: 'Lora',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  processingStep: {
    color: '#234e5c',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  processingHint: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter',
    fontSize: 13,
    textAlign: 'center',
  },

  // CONCLUDED
  concludedContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  concludedBadge: {
    backgroundColor: 'rgba(58,155,115,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  concludedBadgeText: {
    color: '#3a9b73',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  concludedTitle: {
    color: '#fff',
    fontFamily: 'Lora',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  concludedSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter',
    fontSize: 14,
  },
  transcriptPreview: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    maxHeight: 120,
  },
  transcriptPreviewLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  transcriptScroll: { flex: 1 },
  transcriptText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#234e5c',
    paddingVertical: 18,
    borderRadius: 16,
  },
  actionButtonPrimaryText: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(35,78,92,0.15)',
    borderWidth: 1.5,
    borderColor: '#234e5c',
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionButtonSecondaryText: {
    color: '#234e5c',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },
  returnBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  returnBtnText: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter',
    fontSize: 14,
  },
});
