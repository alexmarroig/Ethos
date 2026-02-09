import { NativeModules } from "react-native";

type WhisperResult = {
  text: string;
};

type WhisperModule = {
  transcribe: (input: { audioPath: string; modelPath: string }) => Promise<WhisperResult>;
};

const resolveWhisperModule = (): WhisperModule => {
  const module = (NativeModules as Record<string, unknown>).WhisperRN as WhisperModule | undefined;
  if (!module || typeof module.transcribe !== "function") {
    throw new Error("Whisper RN não está disponível neste build.");
  }
  return module;
};

export const transcribeWithWhisper = async (audioPath: string, modelPath: string) => {
  const whisper = resolveWhisperModule();
  return whisper.transcribe({ audioPath, modelPath });
};
