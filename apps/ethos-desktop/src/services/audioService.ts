export type AudioAsset = {
  id: string;
  sessionId: string;
  filePath: string;
  createdAt: string;
};

const audios = new Map<string, AudioAsset>();

export const audioService = {
  attach: (sessionId: string, filePath: string) => {
    const audio: AudioAsset = {
      id: crypto.randomUUID(),
      sessionId,
      filePath,
      createdAt: new Date().toISOString(),
    };
    audios.set(audio.id, audio);
    return audio;
  },
  remove: (id: string) => {
    audios.delete(id);
  },
};
