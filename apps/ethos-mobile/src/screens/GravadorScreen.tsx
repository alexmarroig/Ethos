import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  loadRecordingSettings,
  saveRecordingSettings,
} from "../storage/recordingSettings";

type RecordingEntry = {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  createdAt: string;
};

type RecordingStatus = "idle" | "recording" | "paused" | "stopping";

type PlaybackStatus = {
  id: string | null;
  isPlaying: boolean;
};

const STORAGE_KEY = "ethos.mobile.recordings";
const RECORDINGS_DIR = `${FileSystem.documentDirectory ?? ""}recordings`;

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const ensureRecordingDir = async () => {
  if (!RECORDINGS_DIR) return;
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
};

const loadStoredRecordings = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecordingEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const GravadorScreen = () => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(
    "idle"
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    id: null,
    isPlaying: false,
  });
  const [manualDeletionEnabled, setManualDeletionEnabled] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef<number>(0);

  const persistRecordings = useCallback(async (items: RecordingEntry[]) => {
    setRecordings(items);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const computeElapsed = useCallback(
    (statusOverride?: RecordingStatus) => {
      if (!startTimeRef.current) return 0;
      const status = statusOverride ?? recordingStatus;
      const now =
        status === "paused" && pausedAtRef.current
          ? pausedAtRef.current
          : Date.now();
      return Math.max(0, now - startTimeRef.current - pausedTotalRef.current);
    },
    [recordingStatus]
  );

  const currentDurationLabel = useMemo(
    () => formatDuration(elapsedMs),
    [elapsedMs]
  );

  useEffect(() => {
    void (async () => {
      await ensureRecordingDir();
      const stored = await loadStoredRecordings();
      const settings = await loadRecordingSettings();
      setRecordings(stored);
      setManualDeletionEnabled(settings.manualDeletionEnabled);
    })();
  }, []);

  useEffect(() => {
    if (recordingStatus === "idle") {
      setElapsedMs(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setElapsedMs(computeElapsed());
    }, 500);
    return () => clearInterval(interval);
  }, [computeElapsed, recordingStatus]);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
      void recordingRef.current?.stopAndUnloadAsync();
      recordingRef.current = null;
    };
  }, []);

  const handleStart = async () => {
    if (recordingStatus !== "idle") return;
    setErrorMessage(null);
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setRecordingStatus("recording");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao iniciar gravação."
      );
    }
  };

  const handlePauseResume = async () => {
    if (!recordingRef.current) return;
    setErrorMessage(null);
    try {
      if (recordingStatus === "recording") {
        await recordingRef.current.pauseAsync();
        pausedAtRef.current = Date.now();
        setRecordingStatus("paused");
      } else if (recordingStatus === "paused") {
        await recordingRef.current.startAsync();
        if (pausedAtRef.current) {
          pausedTotalRef.current += Date.now() - pausedAtRef.current;
        }
        pausedAtRef.current = null;
        setRecordingStatus("recording");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao atualizar a gravação."
      );
    }
  };

  const handleStop = async () => {
    if (!recordingRef.current) return;
    if (recordingStatus === "stopping") return;
    setRecordingStatus("stopping");
    setErrorMessage(null);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const status = await recordingRef.current.getStatusAsync();
      const uri = recordingRef.current.getURI();
      if (uri) {
        await ensureRecordingDir();
        const timestamp = Date.now();
        const target = `${RECORDINGS_DIR}/gravacao-${timestamp}.m4a`;
        await FileSystem.moveAsync({ from: uri, to: target });
        const createdAt = new Date().toISOString();
        const entry: RecordingEntry = {
          id: `gravacao-${timestamp}`,
          name: `Gravação ${formatDate(createdAt)}`,
          uri: target,
          durationMs: status.durationMillis ?? computeElapsed("recording"),
          createdAt,
        };
        await persistRecordings([entry, ...recordings]);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao finalizar gravação."
      );
    } finally {
      recordingRef.current = null;
      startTimeRef.current = null;
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setRecordingStatus("idle");
    }
  };

  const performDelete = async (entry: RecordingEntry) => {
    try {
      await FileSystem.deleteAsync(entry.uri, { idempotent: true });
      const updated = recordings.filter((item) => item.id !== entry.id);
      await persistRecordings(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a gravação."
      );
    }
  };

  const handleDelete = (entry: RecordingEntry) => {
    if (!manualDeletionEnabled) {
      Alert.alert(
        "Exclusão manual desativada",
        "Ative a exclusão manual nas configurações avançadas para remover áudios."
      );
      return;
    }
    Alert.alert(
      "Excluir gravação",
      "Tem certeza de que deseja excluir este áudio? Esta ação não apaga dados automaticamente do vault, apenas remove o arquivo selecionado.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => void performDelete(entry) },
      ]
    );
  };

  const handleToggleManualDeletion = async (value: boolean) => {
    setManualDeletionEnabled(value);
    await saveRecordingSettings({ manualDeletionEnabled: value });
  };

  const handleRename = (entry: RecordingEntry) => {
    setEditingId(entry.id);
    setEditingName(entry.name);
  };

  const handleRenameSave = async (entry: RecordingEntry) => {
    const updated = recordings.map((item) =>
      item.id === entry.id
        ? { ...item, name: editingName.trim() || item.name }
        : item
    );
    await persistRecordings(updated);
    setEditingId(null);
    setEditingName("");
  };

  const handlePlayback = async (entry: RecordingEntry) => {
    setErrorMessage(null);
    try {
      if (playbackStatus.id === entry.id && playbackStatus.isPlaying) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlaybackStatus({ id: null, isPlaying: false });
        return;
      }
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: entry.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaybackStatus({ id: entry.id, isPlaying: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlaybackStatus({ id: null, isPlaying: false });
          void sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao reproduzir gravação."
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gravador</Text>
        <Text style={styles.subtitle}>
          Grave sessões de áudio e gerencie seus arquivos localmente.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>
              {recordingStatus === "recording"
                ? "Gravando"
                : recordingStatus === "paused"
                ? "Pausado"
                : recordingStatus === "stopping"
                ? "Finalizando"
                : "Pronto"}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Duração</Text>
            <Text style={styles.metaValue}>{currentDurationLabel}</Text>
          </View>
        </View>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            onPress={handleStart}
            disabled={recordingStatus !== "idle"}
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              recordingStatus !== "idle" && styles.buttonDisabled,
              pressed && recordingStatus === "idle" && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Iniciar</Text>
          </Pressable>
          <Pressable
            onPress={handlePauseResume}
            disabled={
              recordingStatus !== "recording" &&
              recordingStatus !== "paused"
            }
            style={({ pressed }) => [
              styles.button,
              styles.buttonSecondary,
              recordingStatus !== "recording" &&
                recordingStatus !== "paused" &&
                styles.buttonDisabled,
              pressed &&
                (recordingStatus === "recording" ||
                  recordingStatus === "paused") &&
                styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {recordingStatus === "paused" ? "Retomar" : "Pausar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleStop}
            disabled={
              recordingStatus === "idle" || recordingStatus === "stopping"
            }
            style={({ pressed }) => [
              styles.button,
              styles.buttonDanger,
              (recordingStatus === "idle" ||
                recordingStatus === "stopping") &&
                styles.buttonDisabled,
              pressed &&
                recordingStatus !== "idle" &&
                recordingStatus !== "stopping" &&
                styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Parar</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Configurações avançadas</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Permitir exclusão manual de áudios</Text>
            <Text style={styles.settingDescription}>
              Nenhuma rotina automática remove áudios do vault. A exclusão só ocorre quando
              habilitada e confirmada pelo psicólogo.
            </Text>
          </View>
          <Switch
            value={manualDeletionEnabled}
            onValueChange={handleToggleManualDeletion}
            thumbColor={manualDeletionEnabled ? "#38BDF8" : "#94A3B8"}
            trackColor={{ false: "#1F2937", true: "#0EA5E9" }}
          />
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Gravações salvas</Text>
        {recordings.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma gravação encontrada.</Text>
        ) : (
          <View style={styles.list}>
            {recordings.map((recording) => (
              <View key={recording.id} style={styles.listItem}>
                <View style={styles.listItemHeader}>
                  <View style={styles.listItemInfo}>
                    {editingId === recording.id ? (
                      <TextInput
                        value={editingName}
                        onChangeText={setEditingName}
                        style={styles.input}
                      />
                    ) : (
                      <Text style={styles.listItemTitle}>{recording.name}</Text>
                    )}
                    <Text style={styles.listItemMeta}>
                      {formatDate(recording.createdAt)} · {" "}
                      {formatDuration(recording.durationMs)}
                    </Text>
                  </View>
                  <View style={styles.listActions}>
                    {editingId === recording.id ? (
                      <Pressable
                        onPress={() => void handleRenameSave(recording)}
                        style={({ pressed }) => [
                          styles.smallButton,
                          styles.buttonSuccess,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Salvar</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleRename(recording)}
                        style={({ pressed }) => [
                          styles.smallButton,
                          styles.buttonNeutral,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.smallButtonText}>Renomear</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => void handlePlayback(recording)}
                      style={({ pressed }) => [
                        styles.smallButton,
                        styles.buttonPrimary,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.smallButtonText}>
                        {playbackStatus.id === recording.id &&
                        playbackStatus.isPlaying
                          ? "Parar"
                          : "Ouvir"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.listActionsRow}>
                  <Pressable
                    onPress={() => void handleDelete(recording)}
                    style={({ pressed }) => [
                      styles.smallButton,
                      styles.buttonDanger,
                      pressed && styles.buttonPressed,
                    ]}
                    disabled={!manualDeletionEnabled}
                  >
                    <Text style={styles.smallButtonText}>Excluir</Text>
                  </Pressable>
                  {!manualDeletionEnabled ? (
                    <View style={styles.deletionDisabled}>
                      <Text style={styles.deletionDisabledText}>Exclusão manual desativada</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#0B1120",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 8,
    color: "#94A3B8",
  },
  card: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  settingsCard: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    flex: 1,
    gap: 6,
  },
  settingLabel: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  settingDescription: {
    color: "#94A3B8",
    fontSize: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  errorText: {
    color: "#FCA5A5",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  buttonPrimary: {
    backgroundColor: "#2563EB",
  },
  buttonSecondary: {
    backgroundColor: "#0EA5E9",
  },
  buttonDanger: {
    backgroundColor: "#DC2626",
  },
  buttonSuccess: {
    backgroundColor: "#22C55E",
  },
  buttonNeutral: {
    backgroundColor: "#334155",
  },
  buttonDisabled: {
    backgroundColor: "#1E293B",
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  deletionDisabled: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#475569",
    alignSelf: "flex-start",
  },
  deletionDisabledText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  listSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    color: "#94A3B8",
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  listItemMeta: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 12,
  },
  listActions: {
    flexDirection: "row",
    gap: 8,
  },
  listActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  smallButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: "#E2E8F0",
  },
});
