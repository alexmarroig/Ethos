import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  buildRecordingUri,
  ensureRecordingsDir,
  loadRecordings,
  RecordingEntry,
  RECORDINGS_DIR,
  saveRecordings,
} from "../storage/recordingsStorage";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "gravacao";

export const RecorderScreen = () => {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "recording" | "paused" | "stopping">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordingDuration = useMemo(() => formatDuration(elapsedMs), [elapsedMs]);

  const updateRecordings = useCallback(
    (updater: (prev: RecordingEntry[]) => RecordingEntry[]) => {
      setRecordings((prev) => {
        const next = updater(prev);
        saveRecordings(next);
        return next;
      });
    },
    []
  );

  const computeElapsed = useCallback(() => {
    if (!startTimeRef.current) return 0;
    const now = status === "paused" && pausedAtRef.current ? pausedAtRef.current : Date.now();
    return Math.max(0, now - startTimeRef.current - pausedTotalRef.current);
  }, [status]);

  const clearIntervalTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startIntervalTimer = () => {
    clearIntervalTimer();
    intervalRef.current = setInterval(() => {
      setElapsedMs(computeElapsed());
    }, 500);
  };

  useEffect(() => {
    const load = async () => {
      await ensureRecordingsDir();
      const stored = await loadRecordings();
      setRecordings(stored);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      clearIntervalTimer();
      soundRef.current?.unloadAsync();
      recordingRef.current?.stopAndUnloadAsync();
    };
  }, []);

  const handleStart = async () => {
    if (status !== "idle") return;
    setErrorMessage(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage("Permissão de microfone necessária para gravar.");
        return;
      }
      await ensureRecordingsDir();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setStatus("recording");
      startIntervalTimer();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao iniciar gravação.");
    }
  };

  const handlePause = async () => {
    if (status !== "recording" || !recordingRef.current) return;
    await recordingRef.current.pauseAsync();
    pausedAtRef.current = Date.now();
    setStatus("paused");
    clearIntervalTimer();
  };

  const handleResume = async () => {
    if (status !== "paused" || !recordingRef.current) return;
    await recordingRef.current.startAsync();
    if (pausedAtRef.current) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    setStatus("recording");
    startIntervalTimer();
  };

  const finalizeRecordingFile = async (recording: Audio.Recording, recordingId: string) => {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) {
      throw new Error("Não foi possível salvar o arquivo.");
    }
    const extension = uri.split(".").pop() || "m4a";
    const targetUri = buildRecordingUri(recordingId, extension);
    await FileSystem.moveAsync({ from: uri, to: targetUri });
    return targetUri;
  };

  const handleStop = async () => {
    if (status === "idle" || status === "stopping" || !recordingRef.current) return;
    setStatus("stopping");
    clearIntervalTimer();
    try {
      if (status === "paused" && pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      const finalDuration = computeElapsed();
      const recordingId = `gravacao-${Date.now()}`;
      const fileUri = await finalizeRecordingFile(recordingRef.current, recordingId);
      const createdAt = new Date().toISOString();
      const name = currentName.trim() || `Gravação ${formatDate(createdAt)}`;
      const newRecording: RecordingEntry = {
        id: recordingId,
        name,
        durationMs: finalDuration,
        createdAt,
        fileUri,
      };
      updateRecordings((prev) => [newRecording, ...prev]);
      setCurrentName("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao finalizar gravação.");
    } finally {
      recordingRef.current = null;
      startTimeRef.current = null;
      pausedAtRef.current = null;
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setStatus("idle");
    }
  };

  const handleDelete = async (entry: RecordingEntry) => {
    try {
      await FileSystem.deleteAsync(entry.fileUri, { idempotent: true });
      updateRecordings((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao excluir gravação.");
    }
  };

  const handleExport = async (entry: RecordingEntry) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Exportação indisponível", "Compartilhamento não suportado neste dispositivo.");
        return;
      }
      await Sharing.shareAsync(entry.fileUri, {
        dialogTitle: "Exportar gravação",
        mimeType: "audio/m4a",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao exportar gravação.");
    }
  };

  const handleRename = async (entry: RecordingEntry) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditingName("");
      return;
    }
    const extension = entry.fileUri.split(".").pop() || "m4a";
    const slug = sanitizeFileName(trimmed);
    const targetUri = `${RECORDINGS_DIR}/${slug}-${entry.id}.${extension}`;

    try {
      if (targetUri !== entry.fileUri) {
        await FileSystem.moveAsync({ from: entry.fileUri, to: targetUri });
      }
      updateRecordings((prev) =>
        prev.map((item) =>
          item.id === entry.id ? { ...item, name: trimmed, fileUri: targetUri } : item
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao renomear gravação.");
      updateRecordings((prev) =>
        prev.map((item) => (item.id === entry.id ? { ...item, name: trimmed } : item))
      );
    } finally {
      setEditingId(null);
      setEditingName("");
    }
  };

  const handlePlay = async (entry: RecordingEntry) => {
    try {
      if (playingId === entry.id && soundRef.current) {
        const statusInfo = await soundRef.current.getStatusAsync();
        if (statusInfo.isLoaded && statusInfo.isPlaying) {
          await soundRef.current.pauseAsync();
          setPlayingId(null);
          return;
        }
      }

      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: entry.fileUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(entry.id);
      sound.setOnPlaybackStatusUpdate((statusInfo) => {
        if (statusInfo.isLoaded && statusInfo.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao reproduzir gravação.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Gravador</Text>
        <Text style={styles.subtitle}>Grave sessões de áudio e gerencie arquivos localmente.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.statusValue}>
              {status === "recording"
                ? "Gravando"
                : status === "paused"
                  ? "Pausado"
                  : status === "stopping"
                    ? "Finalizando"
                    : "Pronto"}
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Duração</Text>
            <Text style={styles.statusValue}>{recordingDuration}</Text>
          </View>
          {status === "stopping" ? <ActivityIndicator color="#38BDF8" /> : null}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Nome da gravação"
          placeholderTextColor="#94A3B8"
          value={currentName}
          onChangeText={setCurrentName}
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.button, status !== "idle" && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={status !== "idle"}
          >
            <Text style={styles.buttonText}>Iniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, status === "idle" && styles.buttonDisabled]}
            onPress={status === "paused" ? handleResume : handlePause}
            disabled={status === "idle" || status === "stopping"}
          >
            <Text style={styles.buttonText}>{status === "paused" ? "Retomar" : "Pausar"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopButton, status === "idle" && styles.buttonDisabled]}
            onPress={handleStop}
            disabled={status === "idle" || status === "stopping"}
          >
            <Text style={styles.buttonText}>Parar</Text>
          </TouchableOpacity>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Gravações salvas</Text>
        {isLoading ? (
          <ActivityIndicator color="#38BDF8" />
        ) : recordings.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma gravação encontrada.</Text>
        ) : (
          recordings.map((entry) => (
            <View key={entry.id} style={styles.recordingCard}>
              <View style={styles.recordingHeader}>
                <View style={{ flex: 1 }}>
                  {editingId === entry.id ? (
                    <TextInput
                      style={styles.editInput}
                      value={editingName}
                      onChangeText={setEditingName}
                    />
                  ) : (
                    <Text style={styles.recordingTitle}>{entry.name}</Text>
                  )}
                  <Text style={styles.recordingMeta}>
                    {formatDate(entry.createdAt)} • {formatDuration(entry.durationMs)}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  {editingId === entry.id ? (
                    <>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.confirmButton]}
                        onPress={() => handleRename(entry)}
                      >
                        <Text style={styles.smallButtonText}>Salvar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallButton, styles.neutralButton]}
                        onPress={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                      >
                        <Text style={styles.smallButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.smallButton, styles.neutralButton]}
                      onPress={() => {
                        setEditingId(entry.id);
                        setEditingName(entry.name);
                      }}
                    >
                      <Text style={styles.smallButtonText}>Renomear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  style={[styles.smallButton, styles.primaryButton]}
                  onPress={() => handlePlay(entry)}
                >
                  <Text style={styles.smallButtonText}>
                    {playingId === entry.id ? "Pausar" : "Reproduzir"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, styles.neutralButton]}
                  onPress={() => handleExport(entry)}
                >
                  <Text style={styles.smallButtonText}>Exportar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, styles.dangerButton]}
                  onPress={() => handleDelete(entry)}
                >
                  <Text style={styles.smallButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.recordingPath}>{entry.fileUri}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  content: {
    padding: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    color: "#F8FAFC",
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
  },
  card: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statusValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F8FAFC",
    backgroundColor: "#0F172A",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  stopButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  errorText: {
    color: "#FCA5A5",
  },
  listSection: {
    gap: 16,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    color: "#94A3B8",
  },
  recordingCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  recordingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  recordingTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
  },
  recordingMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
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
  primaryButton: {
    backgroundColor: "#1D4ED8",
  },
  neutralButton: {
    backgroundColor: "#334155",
  },
  confirmButton: {
    backgroundColor: "#22C55E",
  },
  dangerButton: {
    backgroundColor: "#DC2626",
  },
  editInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#F8FAFC",
    backgroundColor: "#0F172A",
  },
  recordingPath: {
    color: "#64748B",
    fontSize: 11,
  },
});
