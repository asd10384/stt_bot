import sys
import base64
import whisper

model = whisper.load_model(name="small", device="cpu")

audio = whisper.load_audio(sys.argv[1])
audio = whisper.pad_or_trim(audio)

mel = whisper.log_mel_spectrogram(audio).to(model.device)

options = whisper.DecodingOptions(
  language="ko",
  fp16=False
)

result = whisper.decode(model, mel, options)

print(base64.b64encode(result.text.encode("utf-8")))
