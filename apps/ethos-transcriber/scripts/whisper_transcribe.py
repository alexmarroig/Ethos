import json
import sys
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except Exception as exc:
    print("faster-whisper is required. Install it in the worker environment.", file=sys.stderr)
    raise exc


def run_transcription(audio_path: str, model_path: str):
    model = WhisperModel(model_path, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, beam_size=5, language="pt")
    segment_list = [
        {
            "start": float(segment.start),
            "end": float(segment.end),
            "text": segment.text.strip(),
        }
        for segment in segments
    ]
    full_text = " ".join(segment["text"] for segment in segment_list).strip()
    return {
        "language": info.language,
        "full_text": full_text,
        "segments": segment_list,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    if not Path(args.audio).exists():
        raise FileNotFoundError(args.audio)

    result = run_transcription(args.audio, args.model)

    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False)


if __name__ == "__main__":
    main()
