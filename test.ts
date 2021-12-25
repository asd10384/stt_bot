// Imports the Google Cloud client library
import speech from "@google-cloud/speech";
import { readFileSync } from "fs";

// Creates a client
const client = new speech.SpeechClient({
  keyFile: 'sttgooglettsapi.json',
  fallback: false
});

async function quickstart() {
  // The path to the remote LINEAR16 file
  const file = readFileSync(`testmsg.wav`);

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code

  // Detects speech in the audio file
  const [response] = await client.recognize({
    audio: {
      content: file.toString("base64")
    },
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 24000,
      languageCode: "ko-KR"
    }
  });
  const transcription = response.results!
    .map((result) => result!.alternatives![0].transcript!)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
}
quickstart();