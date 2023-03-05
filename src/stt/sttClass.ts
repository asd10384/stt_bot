import { OpusEncoder } from "@discordjs/opus";
import { DiscordGatewayAdapterCreator, EndBehaviorType, entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { ChannelType, Guild, GuildMember, VoiceChannel } from "discord.js";
import { FileWriter } from "wav";
import { readFileSync, unlink } from "fs";
import { client } from "../index";
import { Transform } from "stream";
import { TTS } from "../tts/ttsClass";
import { spawn } from "child_process";
import { Logger } from "../utils/Logger";

const randomFile: Set<string> = new Set();

export const sttFilePath: string = (process.env.STT_FILE_PATH) ? (process.env.STT_FILE_PATH.endsWith('/')) ? process.env.STT_FILE_PATH : process.env.STT_FILE_PATH+'/' : '';
const LOG_SERVERID = process.env.STT_TEXT_SERVERID ? process.env.STT_TEXT_SERVERID : "";
const LOG_CHANNELID = process.env.STT_TEXT_CHANNELID ? process.env.STT_TEXT_CHANNELID : "";

export class STT {
  guild: Guild;
  TTS: TTS;
  sttSameTime: number;
  sttList: { channel: VoiceChannel; member: GuildMember; filePath: string; }[];

  constructor(guild: Guild) {
    this.guild = guild;
    this.TTS = new TTS(guild);
    this.sttSameTime = 0;
    this.sttList = [];

    setInterval(async () => {
      if (this.sttSameTime >= 3) return;
      const fileData = this.sttList.shift();
      if (fileData) {
        this.sttSameTime += 1;
        const { channel, filePath, member } = fileData;
        // if (client.debug) Logger.log(`${member.nickname || member.user.username} : 음성 변환중 (${duration})`)
        const text = await this.getSttText(filePath).catch(() => {
          return undefined;
        });
        if (text != undefined && text.length > 0) {
          if (text.startsWith("MBC 뉴스 ") && text.endsWith("입니다.")) return;
          if (client.debug) Logger.log(`${member.nickname || member.user.username} : ${text}`);
          this.logChannel(channel, member, text);
          this.command(channel, text.split(/ +/g), member).catch(() => {});
        }
        // if (client.debug) Logger.log(`${member.nickname || member.user.username} : #내용없음`);
        this.sttSameTime -= 1;
      }
    }, 1000);
  }

  async start(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
      adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
      channelId: channel.id,
      guildId: this.guild.id
    });

    connection.setMaxListeners(0);
    connection.configureNetworking();

    connection.on("stateChange", (oldState, newState) => {
      if (oldState.status === VoiceConnectionStatus.Ready && newState.status === VoiceConnectionStatus.Signalling) {
        connection.configureNetworking();
        const oldNetworking = Reflect.get(oldState, 'networking');
        const newNetworking = Reflect.get(newState, 'networking');
        const networkStateChangeHandler = (_oldNetworkState: any, newNetworkState: any) => {
          console.log(newNetworkState);
          const newUdp = Reflect.get(newNetworkState, 'udp');
          clearInterval(newUdp?.keepAliveInterval);
        }
        oldNetworking?.off('stateChange', networkStateChangeHandler);
        newNetworking?.on('stateChange', networkStateChangeHandler);
      }
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    } catch {
      return;
    }

    const receiver = connection.receiver;
    receiver.speaking.on("start", async (userId) => {
      const member = this.guild.members.cache.get(userId);
      if (!member || member.user.bot) return;
      let randomFileName = Math.random().toString(36).replace(/0?\./g,"");
      while (true) {
        if (randomFile.has(randomFileName)) {
          randomFileName = Math.random().toString(36).replace(/0?\./g,"");
        } else {
          randomFile.add(randomFileName);
          break;
        }
      }
      const audioStream = connection.receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 150
        }
      }).pipe(new OpusDecodingStream({}, new OpusEncoder(16000, 1)))
        .pipe(new FileWriter(`${sttFilePath}/${randomFileName}.wav`, {
          channels: 1,
          sampleRate: 16000
        }));
      audioStream.on("end", async () => {
        const buffer = readFileSync(`${sttFilePath}/${randomFileName}.wav`);
        const duration = buffer.length / 16000 / 2;
        if (duration < 0.82) {
          setTimeout(() => {
            unlink(sttFilePath+randomFileName+".wav", (err) => {
              randomFile.delete(randomFileName);
              if (err) return;
            });
          }, 3000);
          // if (client.debug) Logger.log(`${member.nickname || member.user.username} : 시간짧음 (${duration})`);
          return;
        }
        this.sttList.push({
          channel: channel,
          filePath: `${sttFilePath}/${randomFileName}.wav`,
          member: member
        });
      });
    });
  }

  async command(voiceChannel: VoiceChannel, args: string[], member: GuildMember) {
    const bot = this.guild.members.cache.get(client.user?.id || "");
    const channel = bot?.voice.channel?.type === ChannelType.GuildVoice ? bot.voice.channel : voiceChannel;
    if (args[0] === "안녕") return this.say(channel, `${member.nickname || member.user.username}님 안녕하세요`);
  }

  getSttText(audioPath: string) {
    return new Promise<string>((res, rej) => {
      const result = spawn("python", [ "./python/main.py", audioPath ]);
      result.stdout.on("data", (data) => {
        const text = Buffer.from(data.toString().replace(/b\'|\'/g, ''), 'base64').toString('utf-8');
        return res(text);
      });
      result.stderr.on("data", (data) => {
        const text = Buffer.from(data.toString().replace(/b\'|\'/g, ''), 'base64').toString('utf-8');
        return rej(text);
      });
    });
  }

  say(channel: VoiceChannel, text: string) {
    this.TTS.tts(channel, text);
  }
  
  logChannel(voiceChannel: VoiceChannel, member: GuildMember, text: string) {
    const channel = client.guilds.cache.get(LOG_SERVERID)?.channels.cache.get(LOG_CHANNELID);
    if (channel?.type === ChannelType.GuildText) {
      channel.send({ content: `[<t:${Math.floor(Date.now()/1000)}:D>] (<#${voiceChannel.id}>) ${member.nickname || member.user.username} : ${text}` });
    }
  }
}

class OpusDecodingStream extends Transform {
  encoder: any;
  constructor(options: any, encoder: any) {
    super(options);
    this.encoder = encoder;
  }
  
  _transform(data: any, _encoding: any, callback: any) {
    this.push(this.encoder.decode(data));
    callback();
  }
}
