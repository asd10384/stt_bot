import "dotenv/config";
import { createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, PlayerSubscription, VoiceConnectionStatus } from "@discordjs/voice";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { Guild, VoiceChannel } from "discord.js";
import { unlink, writeFile } from "fs";

export const ttsFilePath: string = (process.env.TTS_FILE_PATH) ? (process.env.TTS_FILE_PATH.endsWith('/')) ? process.env.TTS_FILE_PATH.slice(0, -1) : process.env.TTS_FILE_PATH : '';
const ttsfilelist = new Set<string>();

const ttsClient = new TextToSpeechClient({
  keyFile: "googlettsapi.json",
  fallback: false
});

const fileformat: {
  ttsformat: "AUDIO_ENCODING_UNSPECIFIED" | "LINEAR16" | "MP3" | "OGG_OPUS",
  fileformat: "mp3" | "wav" | "ogg"
} = {
  ttsformat: 'MP3',
  fileformat: 'mp3'
};

export class TTS {
  guild: Guild;
  playerSubscription: PlayerSubscription | undefined;

  constructor(guild: Guild) {
    this.guild = guild;
    this.playerSubscription = undefined;
  }

  async tts(channel: VoiceChannel | null, text: string) {
    // text = replacetext(this.guild, text);
    if (!channel) return;
    
    let randomfilename = Math.random().toString(36).replace(/0?\./g,"");
    while (true) {
      if (ttsfilelist.has(randomfilename)) {
        randomfilename = Math.random().toString(36).replace(/0?\./g,"");
      } else {
        ttsfilelist.add(randomfilename);
        break;
      }
    }
    const file = await this.makeTTS(randomfilename, text).catch(() => {
      return undefined;
    });
    if (!file) return;
    await this.play(channel.id, file, randomfilename).catch(() => {});
    return;
  }

  async play(channelID: string, fileURL: string, filename: string, options?: { volume?: number }) {
    const connection = joinVoiceChannel({
      adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
      guildId: this.guild.id,
      channelId: channelID
    });
    if (!connection) return;
    connection.setMaxListeners(0);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
      this.playerSubscription?.player.stop();
      const Player = createAudioPlayer();
      Player.setMaxListeners(0);
      const resource = createAudioResource(fileURL, {
        inlineVolume: true
      });
      resource.volume?.setVolume((options && options.volume) ? options.volume : 1);
      Player.play(resource);
      const subscription = connection.subscribe(Player);
      this.playerSubscription = subscription;
    } catch {
      this.playerSubscription = undefined;
    }
    setTimeout(() => {
      try {
        unlink(`${ttsFilePath}/${filename}.${fileformat.fileformat}`, (err) => {
          if (ttsfilelist.has(filename)) ttsfilelist.delete(filename);
          if (err) return;
        });
      } catch (err) {}
    }, 5000);
    return;
  }

  async makeTTS(fileURL: string, text: string) {
    return new Promise<string | undefined>(async (res) => {
      const output = await this.getText(text);
      if (!output) return res(undefined);
      let filename: string | undefined = `${ttsFilePath}/${fileURL}.${fileformat.fileformat}`;
      writeFile(filename, output, {}, (err) => {
        if (err) return res(undefined);
        return res(filename);
      });
    });
  }

  async getText(text: string) {
    return new Promise<string | Uint8Array | undefined>(async (res) => {
      const response = await ttsClient.synthesizeSpeech({
        input: { text: text },
        voice: {
          languageCode: 'ko-KR',
          name: 'ko-KR-Standard-A'
        },
        audioConfig: {
          audioEncoding: fileformat.ttsformat, // 형식
          speakingRate: 1.105, // 속도 0.905
          pitch: 0, // 피치
          // sampleRateHertz: 16000, // 헤르츠
          // effectsProfileId: ['medium-bluetooth-speaker-class-device'] // 효과 https://cloud.google.com/text-to-speech/docs/audio-profiles
        }
      }).catch(() => {
        return undefined;
      });
      if (!response || !response[0] || !response[0].audioContent) return res(undefined);
      return res(response[0].audioContent);
    });
  }
}