// src/features/sessions/screens/SessionHubScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Alert, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Mic, MicOff, Play, Pause, Square, Trash2, Upload, FileText, Send, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useNotifications } from '../../../contexts/NotificationsContext';
import { postAudioToSession, triggerTranscription, saveClinicalNote } from '../../../shared/services/api/sessions';

type Tab = 'record' | 'upload' | 'write';

// ─── Waveform dots ────────────────────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View style={waveStyles.row}>
      {dots.map((i) => (
        <Animated.View
          key={i}
          style={[waveStyles.dot, {
            height: active ? 4 + Math.random() * 28 : 4,
            opacity: active ? 0.6 + Math.random() * 0.4 : 0.3,
          }]}
        />
      ))}
    </View>
  );
}
const waveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 },
  dot: { width: 3, backgroundColor: '#00f2ff', borderRadius: 2 },
});

// ─── Tab: Gravar ──────────────────────────────────────────────────────────────
function RecordTab({ onReady }: { onReady: (uri: string) => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [doneUri, setDoneUri] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const intervalRef = useRef<any>(null);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permissão negada', 'Habilite o microfone nas configurações.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setIsPaused(false);
      setDoneUri(null);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      Alert.alert('Erro ao iniciar gravação');
    }
  };

  const pauseResume = async () => {
    if (!recording) return;
    if (isPaused) { await recording.startAsync(); setIsPaused(false); intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000); }
    else { await recording.pauseAsync(); setIsPaused(true); clearInterval(intervalRef.current); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(intervalRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setIsRecording(false);
    setIsPaused(false);
    if (uri) { setDoneUri(uri); onReady(uri); }
  };

  const discard = () => {
    clearInterval(intervalRef.current);
    setRecording(null); setIsRecording(false); setIsPaused(false); setDuration(0); setDoneUri(null);
    onReady('');
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <View style={tabStyles.container}>
      <View style={[tabStyles.badge, { backgroundColor: 'rgba(0,242,255,0.1)' }]}>
        <Text style={tabStyles.badgeText}>🔒 ENCRYPTION ACTIVE</Text>
      </View>

      <Text style={tabStyles.timer}>{fmt(duration)}</Text>
      <Text style={tabStyles.timerLabel}>
        {doneUri ? 'GRAVAÇÃO CONCLUÍDA' : isRecording ? (isPaused ? 'PAUSADO' : 'GRAVANDO...') : 'PRONTO PARA INICIAR'}
      </Text>

      <Waveform active={isRecording && !isPaused} />

      <View style={tabStyles.controls}>
        <TouchableOpacity style={tabStyles.iconBtn} onPress={discard}>
          <Trash2 size={22} color={duration > 0 ? '#ef4444' : '#666'} />
        </TouchableOpacity>

        {!isRecording && !doneUri ? (
          <TouchableOpacity style={tabStyles.mainBtn} onPress={startRecording}>
            <Play size={28} color="#fff" />
          </TouchableOpacity>
        ) : isRecording ? (
          <>
            <TouchableOpacity style={tabStyles.mainBtn} onPress={pauseResume}>
              {isPaused ? <Play size={28} color="#fff" /> : <Pause size={28} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={tabStyles.iconBtn} onPress={stopRecording}>
              <Square size={22} color="#00f2ff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={[tabStyles.mainBtn, { backgroundColor: '#22c55e' }]}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓ OK</Text>
          </View>
        )}

        <TouchableOpacity style={tabStyles.iconBtn} onPress={() => setMicEnabled((m) => !m)}>
          {micEnabled ? <Mic size={22} color="#00f2ff" /> : <MicOff size={22} color="#666" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab: Enviar Áudio ────────────────────────────────────────────────────────
function UploadTab({ onReady }: { onReady: (uri: string) => void }) {
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'] });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (asset) { setFile({ name: asset.name, uri: asset.uri }); onReady(asset.uri); }
  };

  return (
    <View style={tabStyles.container}>
      <TouchableOpacity style={uploadStyles.area} onPress={pick}>
        <Upload size={48} color="#00f2ff" style={{ opacity: 0.7 }} />
        <Text style={uploadStyles.label}>Toque para selecionar arquivo de áudio</Text>
        <Text style={uploadStyles.formats}>.m4a · .mp3 · .wav</Text>
      </TouchableOpacity>
      {file && (
        <View style={uploadStyles.fileRow}>
          <FileText size={18} color="#00f2ff" />
          <Text style={uploadStyles.fileName} numberOfLines={1}>{file.name}</Text>
          <TouchableOpacity onPress={() => { setFile(null); onReady(''); }}>
            <Trash2 size={16} color='#ef4444' />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const uploadStyles = StyleSheet.create({
  area: { borderWidth: 2, borderColor: '#00f2ff40', borderStyle: 'dashed', borderRadius: 24, paddingVertical: 48, alignItems: 'center', gap: 14, marginTop: 24 },
  label: { color: '#fff', fontFamily: 'Inter', fontSize: 16, textAlign: 'center', opacity: 0.8 },
  formats: { color: '#00f2ff', fontFamily: 'Inter', fontSize: 13, opacity: 0.6 },
  fileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10, backgroundColor: 'rgba(0,242,255,0.08)', padding: 14, borderRadius: 12 },
  fileName: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 14 },
});

// ─── Tab: Escrever ────────────────────────────────────────────────────────────
function WriteTab({ onReady }: { onReady: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ flex: 1, paddingTop: 16 }}>
      <TextInput
        style={writeStyles.input}
        multiline
        placeholder="Descreva a sessão com suas próprias palavras..."
        placeholderTextColor="#666"
        value={text}
        onChangeText={(t) => { setText(t); onReady(t.length >= 20 ? t : ''); }}
        textAlignVertical="top"
      />
      <Text style={writeStyles.counter}>{text.length} caracteres{text.length < 20 && text.length > 0 ? ` (mín. 20)` : ''}</Text>
    </View>
  );
}
const writeStyles = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 16, lineHeight: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, minHeight: 200 },
  counter: { color: '#666', fontFamily: 'Inter', fontSize: 12, textAlign: 'right', marginTop: 8 },
});

const tabStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 32, gap: 16 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#00f2ff', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1 },
  timer: { fontSize: 72, color: '#fff', fontFamily: 'Inter', fontWeight: '200', letterSpacing: -2 },
  timerLabel: { color: '#666', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 16 },
  mainBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#234e5c', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SessionHubScreen({ navigation, route }: any) {
  const { patientName = 'Paciente', time = '', sessionId, status } = route.params ?? {};
  const { addNotification, addPendingJob } = useNotifications();
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [payload, setPayload] = useState('');   // uri for record/upload, text for write
  const [sending, setSending] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  const canSend = payload.length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    try {
      if (activeTab === 'write') {
        if (sessionId) {
          try { await saveClinicalNote(sessionId, payload); } catch { Alert.alert('Erro ao salvar. Tente novamente.'); setSending(false); return; }
        }
        addNotification({ type: 'prontuario_gerado', title: 'Prontuário salvo', body: patientName,
          document: { id: `doc-${Date.now()}`, title: `Sessão — ${patientName}`, patient: patientName, status: 'rascunho', date: new Date().toLocaleDateString('pt-BR'), content: payload } });
        navigation.goBack();
        return;
      }

      // Record or Upload — post audio then transcribe
      let jobId = '';
      if (sessionId) {
        try { await postAudioToSession(sessionId, payload); }
        catch { Alert.alert('Erro ao enviar áudio. Tente novamente.'); setSending(false); return; }

        try { jobId = await triggerTranscription(sessionId); }
        catch { Alert.alert('Áudio salvo, mas transcrição falhou. Você será notificado quando disponível.'); }
      }

      addPendingJob({ jobId, patientName, sessionId: sessionId ?? '' });
      navigation.goBack();
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'record', label: '🎙️ Gravar' },
    { key: 'upload', label: '📁 Áudio' },
    { key: 'write', label: '✍️ Texto' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.patientName}>{patientName}</Text>
          {time ? <Text style={styles.sessionTime}>{time}</Text> : null}
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => { setActiveTab(t.key); setPayload(''); }}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'record' && <RecordTab onReady={setPayload} />}
        {activeTab === 'upload' && <UploadTab onReady={setPayload} />}
        {activeTab === 'write' && <WriteTab onReady={setPayload} />}
      </View>

      {/* Send button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
          {sending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Enviar para prontuário</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0f12' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  patientName: { color: '#fff', fontSize: 17, fontFamily: 'Inter', fontWeight: '700', textAlign: 'center' },
  sessionTime: { color: '#666', fontSize: 13, fontFamily: 'Inter', textAlign: 'center', marginTop: 2 },
  moreBtn: { padding: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#234e5c' },
  tabText: { color: '#666', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  sendBtn: { height: 64, borderRadius: 20, backgroundColor: '#234e5c', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
});
