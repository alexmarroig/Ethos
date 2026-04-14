import argparse
import json
import sys
import os
from faster_whisper import WhisperModel

def transcribe(audio_path, model_path, output_path):
    print(f"[whisper] audio={audio_path}", file=sys.stderr)
    print(f"[whisper] model={model_path}", file=sys.stderr)
    print(f"[whisper] output={output_path}", file=sys.stderr)

    # Load model
    # device="cpu" as per requirements
    model = WhisperModel(model_path, device="cpu", compute_type="int8")
    print("[whisper] model_loaded", file=sys.stderr)

    segments, info = model.transcribe(audio_path, beam_size=5, language="pt")
    print(f"[whisper] detected_language={info.language}", file=sys.stderr)

    result_segments = []
    full_text = ""

    for segment in segments:
        result_segments.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })
        full_text += segment.text + " "

    result = {
        "language": info.language,
        "full_text": full_text.strip(),
        "segments": result_segments
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("[whisper] transcription_written", file=sys.stderr)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        transcribe(args.audio, args.model, args.output)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
