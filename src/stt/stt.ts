import { AudioReceiveStream, createAudioResource, DiscordGatewayAdapterCreator, EndBehaviorType, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { GuildChannel, GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js.js";
import { sttgetkeyfile } from "./googleapi";
import { SpeechClient } from "@google-cloud/speech";
import run from "./run.js";
import { createWriteStream, readdir, readFileSync, unlink, writeFileSync } from "fs";
import { Transform } from "stream";
import { FileWriter } from "wav";
import { OpusEncoder } from "@discordjs/opus";

sttgetkeyfile();
const sttclient = new SpeechClient({
  keyFile: 'sttgooglettsapi.json',
  fallback: false
});
const sttfilepath: string = (process.env.STT_FILE_PATH) ? (process.env.STT_FILE_PATH.endsWith('/')) ? process.env.STT_FILE_PATH : process.env.STT_FILE_PATH+'/' : '';
const voice_prefix: string = (process.env.VOICE_PREFIX) ? process.env.VOICE_PREFIX : '테스트';

readdir(sttfilepath, (err, files) => {
  if (err) console.error(err);
  files.forEach((file) => {
    unlink(sttfilepath+file, (err) => {
      if (err) return;
    });
  });
});
const randomfile: Set<string> = new Set();

export default async function start(message: M | I, channel: GuildChannel) {
  const connection = joinVoiceChannel({
    adapterCreator: message.guild!.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    channelId: channel.id,
    guildId: message.guildId!
  });
  stt(message, connection);
}

async function stt(message: M | I, connection: VoiceConnection) {
  await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
  const receiver = connection.receiver;
  receiver.speaking.on("start", async (userId) => {
    const member = message.guild!.members.cache.get(userId);
    if (!member || member.user.bot) return;
    let randomfilename = Math.random().toString(36).replace(/0?\./g,"");
    while (true) {
      if (randomfile.has(randomfilename)) {
        randomfilename = Math.random().toString(36).replace(/0?\./g,"");
      } else {
        randomfile.add(randomfilename);
        break;
      }
    }
    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 250
      }
    }).pipe(new OpusDecodingStream({}, new OpusEncoder(16000, 1)))
      .pipe(new FileWriter(`${sttfilepath}/${randomfilename}.wav`, {
        channels: 1,
        sampleRate: 16000
      }));
    audioStream.on("end", async () => {
      const buffer = readFileSync(`${sttfilepath}/${randomfilename}.wav`);
      const duration = buffer.length / 16000 / 2;
      console.log(member.nickname ? member.nickname : member.user.username, duration);
      if (duration < 0.8) {
        setTimeout(() => {
          unlink(sttfilepath+randomfilename+".wav", (err) => {
            randomfile.delete(randomfilename);
            if (err) return;
          });
        }, 1000);
        return;
      }
      try {
        let out = await transform(buffer, member, randomfilename);
        if (out != null) cmd(message, member, out);
      } catch (err) {
        console.log(err);
      }
    });
  });
}

async function cmd(message: M | I, member: GuildMember, text: string) {
  if (!text || !text.length) return;

  if (text.trim().startsWith(voice_prefix)) {
    const args = text.trim().slice(voice_prefix.length).trim().split(/ +/g);
    return run(message, args, member);
  }
}

async function transform(buffer: Buffer, member: GuildMember, filename: string) {
  try {
    const [response] = await sttclient.recognize({
      audio: { content: buffer },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "ko-KR"
      }
    });
    const transcription = response.results!
      .map(result => result.alternatives![0].transcript)
      .join("\n");
    console.log(`${member.nickname ? member.nickname : member.user.username} 메세지:`, transcription);
    setTimeout(() => {
      unlink(sttfilepath+filename+".wav", (err) => {
        randomfile.delete(filename);
        if (err) return;
      });
    }, 1500);
    return transcription;
  } catch (err) {
    console.log(err);
  }
}

async function convert_audio(buffer: Buffer) {
  try {
    // stereo to mono channel
    const data = new Int16Array(buffer);
    const ndata = new Int16Array(data.length/2);
    for (let i=0, j=0; i<data.length; i+=4) {
      ndata[j++] = data[i];
      ndata[j++] = data[i+1];
    }
    return Buffer.from(ndata);
  } catch (err) {
    console.log(err);
  }
}

class OpusDecodingStream extends Transform {
  encoder: any;
  constructor(options: any, encoder: any) {
    super(options);
    this.encoder = encoder;
  }
  
  _transform(data: any, encoding: any, callback: any) {
    this.push(this.encoder.decode(data));
    callback();
  }
}