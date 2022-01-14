import { ttsgetkeyfile } from "./googleapi";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createAudioPlayer, createAudioResource, getVoiceConnection } from "@discordjs/voice";
import { readdir, readdirSync, unlink, writeFileSync } from "fs";
import axios from "axios";
import { signaturesiteurl } from "./getsignature";

ttsgetkeyfile();
const ttsclient = new TextToSpeechClient({
  keyFile: 'ttsgooglettsapi.json',
  fallback: false
});

const ttsfilepath: string = (process.env.TTS_FILE_PATH) ? (process.env.TTS_FILE_PATH.endsWith('/')) ? process.env.TTS_FILE_PATH : process.env.TTS_FILE_PATH+'/' : '';
const fileformat: {
  ttsformat: "AUDIO_ENCODING_UNSPECIFIED" | "LINEAR16" | "MP3" | "OGG_OPUS",
  fileformat: "mp3" | "wav" | "ogg"
} = {
  ttsformat: 'MP3',
  fileformat: 'mp3'
};

const randomfile: Set<string> = new Set();
readdir(ttsfilepath, (err, files) => {
  if (err) console.error(err);
  files.forEach((file) => {
    unlink(ttsfilepath+file, (err) => {
      if (err) return;
    });
  });
});

export default async function tts(guildId: string, text: string, mp3file?: boolean) {
  const connection = getVoiceConnection(guildId);
  if (!connection) return undefined;
  const Player = createAudioPlayer();
  const subscription = connection.subscribe(Player);
  let randomfilename = Math.random().toString(36).replace(/0?\./g,"");
  while (true) {
    if (randomfile.has(randomfilename)) {
      randomfilename = Math.random().toString(36).replace(/0?\./g,"");
    } else {
      randomfile.add(randomfilename);
      break;
    }
  }
  let file: string | undefined = undefined;
  if (mp3file) {
    if (!text) return undefined;
    const mp3 = await axios.get(`${signaturesiteurl}/file/${encodeURI(text)}.mp3`, { responseType: "arraybuffer" });
    const buffer = Buffer.from(mp3.data);
    file = await makefile(randomfilename, undefined, buffer);
  } else {
    file = await makefile(randomfilename, text);
  }
  if (!file) return undefined;
  const resource = createAudioResource(file, {
    inlineVolume: true
  });
  resource.volume?.setVolume(0.7);
  Player.play(resource);
  setTimeout(() => {
    if (file) {
      unlink(file, (err) => {
        randomfile.delete(randomfilename);
        if (err) return;
      });
    }
  }, 2500);
  return subscription;
}

async function makefile(fileURL: string, text: string | undefined, buffer?: Buffer): Promise<string | undefined> {
  let output: any = undefined;
  if (text) {
    output = await gettext(text);
  } else {
    output = buffer;
  }
  if (!output) return undefined;
  let filename = `${ttsfilepath}${fileURL}.${fileformat.fileformat}`;
  writeFileSync(filename, output);
  return filename;
}

async function gettext(text: string) {
  let response: any;
  try {
    response = await ttsclient.synthesizeSpeech({
      input: {text: text},
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Standard-A'
      },
      audioConfig: {
        audioEncoding: fileformat.ttsformat, // 형식
        speakingRate: 0.905, // 속도
        pitch: 0, // 피치
        // sampleRateHertz: 16000, // 헤르츠
        // effectsProfileId: ['medium-bluetooth-speaker-class-device'] // 효과 https://cloud.google.com/text-to-speech/docs/audio-profiles
      },
    });
    if (!response) return null;
    return response[0].audioContent;
  } catch(err) {
    response = await ttsclient.synthesizeSpeech({
      input: {text: text},
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Standard-A'
      },
      audioConfig: {
        audioEncoding: fileformat.ttsformat, // 형식
        speakingRate: 0.905, // 속도
        pitch: 0, // 피치
        // sampleRateHertz: 16000, // 헤르츠
        // effectsProfileId: ['medium-bluetooth-speaker-class-device'] // 효과 https://cloud.google.com/text-to-speech/docs/audio-profiles
      },
    });
    if (!response) return null;
    return response[0].audioContent;
  }
}