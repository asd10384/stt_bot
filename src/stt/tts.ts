import { ttsgetkeyfile } from "./googleapi";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createAudioPlayer, createAudioResource, getVoiceConnection } from "@discordjs/voice";
import { readdir, readdirSync, unlink, writeFileSync } from "fs";

ttsgetkeyfile();
const ttsclient = new TextToSpeechClient({
  keyFile: 'ttsgooglettsapi.json',
  fallback: false
});

const ttsfilemaxlength: number = 8;
const ttsfilepath: string = (process.env.TTS_FILE_PATH) ? (process.env.TTS_FILE_PATH.endsWith('/')) ? process.env.TTS_FILE_PATH : process.env.TTS_FILE_PATH+'/' : '';
const fileformat: {
  ttsformat: "AUDIO_ENCODING_UNSPECIFIED" | "LINEAR16" | "MP3" | "OGG_OPUS",
  fileformat: "mp3" | "wav" | "ogg"
} = {
  ttsformat: 'MP3',
  fileformat: 'mp3'
};
let ttsfilelist: string[] = [];

readdir(ttsfilepath, (err, files) => {
  if (err) console.error(err);
  files.forEach((file) => {
    unlink(ttsfilepath+file, (err) => {
      if (err) return;
    });
  });
});
setInterval(() => {
  const files = readdirSync(ttsfilepath);
  if (!files || files.length < ttsfilemaxlength+1) return;
  for (let i=0; i<files.length-ttsfilemaxlength; i++) {
    let filename = ttsfilelist.shift();
    unlink(ttsfilepath+filename+'.'+fileformat.fileformat, (err) => {
      if (err) return;
    });
  }
}, 1000 * 15);

export default async function tts(guildId: string, text: string) {
  const connection = getVoiceConnection(guildId);
  if (!connection) return undefined;
  const Player = createAudioPlayer();
  const subscription = connection.subscribe(Player);
  const filename = (Math.random() * Number(guildId)).toString().replace('.','');
  const file = await makefile(filename, text);
  if (!file) return undefined;
  const resource = createAudioResource(file, {
    inlineVolume: true
  });
  resource.volume?.setVolume(0.7);
  Player.play(resource);
  return subscription;
}

async function makefile(fileURL: string, text: string): Promise<string | undefined> {
  let output = await gettext(text);
  if (!output) return undefined;
  let filename = `${ttsfilepath}${fileURL}.${fileformat.fileformat}`;
  writeFileSync(filename, output);
  ttsfilelist.push(fileURL);
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