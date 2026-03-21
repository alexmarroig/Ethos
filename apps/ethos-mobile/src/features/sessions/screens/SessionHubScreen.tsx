// ethos-mobile/src/screens/SessionHubScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { ChevronLeft, MoreVertical, Shield, Trash2, Play, Pause, Save, Mic, MicOff } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, interpolate,
    FadeIn, FadeInDown, SlideInDown
} from 'react-native-reanimated';
import { startTranscriptionJob } from '../services/api/sessions';

export default function SessionHubScreen({ navigation, route }: any) {
    const isDark = useColorScheme() === 'dark';
    const theme = isDark ? colors.dark : colors.light;
    const patientName = route?.params?.patientName || "Mariana Albuquerque";
    const sessionTime = route?.params?.time || "14:00 - 14:50";

    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation values
    const waveformValues = Array.from({ length: 20 }).map(() => useSharedValue(5));

    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

            // Animate waveform
            waveformValues.forEach((val, i) => {
                val.value = withRepeat(
                    withTiming(15 + Math.random() * 35, { duration: 300 + Math.random() * 300 }),
                    -1,
                    true
                );
            });
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            waveformValues.forEach(val => val.value = withTiming(5));
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording, isPaused]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    async function handleStart() {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setIsPaused(false);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
        }
    }

    async function handleStop() {
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setIsRecording(false);
            setRecording(null);
            setDuration(0);
            Alert.alert("Sucesso", "Gravação salva localmente com sucesso.");
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: '#15171a' }]}>
            <StatusBar barStyle="light-content" />

            {/* Dark Header */}
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

            {/* Recorder Body */}
            <View style={styles.recorderBody}>
                <Animated.View entering={FadeIn.delay(300)} style={styles.securityBadge}>
                    <Shield size={16} color="#3a9b73" />
                    <Text style={styles.securityText}>ENCRYPTION ACTIVE</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(800)} style={styles.timerContainer}>
                    <Text style={styles.timerText}>{formatTime(duration)}</Text>
                    <Text style={styles.recordingStatus}>{isRecording ? (isPaused ? 'PAUSADO' : 'GRAVANDO...') : 'PRONTO PARA INICIAR'}</Text>
                </Animated.View>

                {/* Waveform Visualization */}
                <View style={styles.waveformContainer}>
                    {waveformValues.map((val, i) => (
                        <WaveBar key={i} animatedValue={val} />
                    ))}
                </View>
            </View>

            {/* Bottom Controls */}
            <Animated.View entering={SlideInDown.duration(600)} style={styles.controlsContainer}>
                <View style={styles.controlRow}>
                    <TouchableOpacity style={styles.secondaryControl} onPress={() => { setDuration(0); setIsRecording(false); }}>
                        <Trash2 size={24} color="#fff" opacity={0.6} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.mainControl, { backgroundColor: isRecording && !isPaused ? '#3a9b73' : '#234e5c' }]}
                        onPress={() => {
                            if (!isRecording) handleStart();
                            else setIsPaused(!isPaused);
                        }}
                    >
                        {isRecording && !isPaused ? <Pause size={32} color="#fff" fill="#fff" /> : <Play size={32} color="#fff" fill="#fff" />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryControl} onPress={handleStop}>
                        <Save size={24} color="#fff" opacity={0.6} />
                    </TouchableOpacity>
                </View>

                <View style={styles.micToggleContainer}>
                    <TouchableOpacity style={[styles.micToggle, { backgroundColor: '#272b34' }]}>
                        <Mic size={24} color="#fff" />
                        <Text style={styles.micToggleText}>Microfone Ligado</Text>
                    </TouchableOpacity>
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
    }
});
