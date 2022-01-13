import { client } from "../index.js";
import { DiscordGatewayAdapterCreator, EndBehaviorType, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { GuildChannel, GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js.js";
import { sttgetkeyfile } from "./googleapi";
import { SpeechClient } from "@google-cloud/speech";
import run from "./run.js";
import { readdir, readFileSync, unlink } from "fs";
import { Transform } from "stream";
import { FileWriter } from "wav";
import { OpusEncoder } from "@discordjs/opus";
import sendmessage from "./sendmessage.js";

sttgetkeyfile();
const sttclient = new SpeechClient({
  keyFile: 'sttgooglettsapi.json',
  fallback: false
});
const sttfilepath: string = (process.env.STT_FILE_PATH) ? (process.env.STT_FILE_PATH.endsWith('/')) ? process.env.STT_FILE_PATH : process.env.STT_FILE_PATH+'/' : '';
const voice_prefix_list: string[] = (process.env.VOICE_PREFIX_LIST) ? eval(process.env.VOICE_PREFIX_LIST) : [ "테스트" ];
voice_prefix_list.sort((a, b) => {
  return b.length - a.length;
});

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
    if (!member/* || member.user.bot*/) return;
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
      if (client.debug) console.log(member.nickname ? member.nickname : member.user.username, duration);
      if (duration < 0.815) {
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
        if (out != null && out.length != 0) {
          cmd(message, member, out);
          sendmessage(message, member, out);
        }
      } catch (err) {
        if (client.debug) console.log(err);
      }
    });
  });
}

async function cmd(message: M | I, member: GuildMember, text: string) {
  for (let voice_prefix of voice_prefix_list) {
    if (text.trim().startsWith(voice_prefix)) {
      const args = text.trim().slice(voice_prefix.length).trim().split(/ +/g);
      run(message, args, member);
      break;
    }
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
    if (client.debug) console.log(`${member.nickname ? member.nickname : member.user.username} 메세지:`, transcription);
    setTimeout(() => {
      unlink(sttfilepath+filename+".wav", (err) => {
        randomfile.delete(filename);
        if (err) return;
      });
    }, 1500);
    return transcription;
  } catch (err) {
    if (client.debug) console.log(err);
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