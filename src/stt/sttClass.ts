import { OpusEncoder } from "@discordjs/opus";
import { DiscordGatewayAdapterCreator, EndBehaviorType, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { ChannelType, Guild, GuildMember, VoiceChannel } from "discord.js";
import { FileWriter } from "wav";
import { readFile, readFileSync, unlink } from "fs";
import { client } from "../index";
import { Transform } from "stream";
import { TTS } from "../tts/ttsClass";
import { Logger } from "../utils/Logger";
import axios from "axios";
import { getChatText } from "../gpt/chatGpt";
import { randomText } from "./config";

type lanCode = "korean" | "english" | "japanese" | "chinese" | "spanish" | "french" | "german" | "russian" | "vietnam" | "arabic" | "thailand" | "portuguese";

const randomFile: Set<string> = new Set();

export const sttFilePath: string = (process.env.STT_FILE_PATH) ? (process.env.STT_FILE_PATH.endsWith('/')) ? process.env.STT_FILE_PATH : process.env.STT_FILE_PATH+'/' : '';
const LOG_SERVERID = process.env.STT_TEXT_SERVERID || "";
const LOG_CHANNELID = process.env.STT_TEXT_CHANNELID || "";
const KEY: string[] = process.env.STT_KEY?.length != 0 ? process.env.STT_KEY?.replace(/ +/g,'').split(",") || [] : [];

const languageCode: lanCode = "korean";

const deleteFileList: { time: number; randomFileName: string; }[] = [];

setInterval(() => {
  if (deleteFileList.length == 0) return;
  if (!deleteFileList[0]) return;
  if (deleteFileList[0].time < Date.now()) {
    const filePath = deleteFileList.shift();
    if (filePath?.randomFileName) unlink(sttFilePath+filePath.randomFileName+".wav", (err) => {
      if (err) return;
      randomFile.delete(filePath.randomFileName);
    });
  }
}, 4000);

export class STT {
  guild: Guild;
  TTS: TTS;
  sttSameTime: number;
  keyNum: number;

  constructor(guild: Guild) {
    this.guild = guild;
    this.TTS = new TTS(guild);
    this.sttSameTime = 0;
    this.keyNum = 0;
  }

  async start(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
      adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
      channelId: channel.id,
      guildId: this.guild.id
    });

    connection.setMaxListeners(0);
    // connection.configureNetworking();

    // connection.on("stateChange", (oldState, newState) => {
    //   if (oldState.status === VoiceConnectionStatus.Ready && newState.status === VoiceConnectionStatus.Signalling) {
    //     connection.configureNetworking();
    //     const oldNetworking = Reflect.get(oldState, 'networking');
    //     const newNetworking = Reflect.get(newState, 'networking');
    //     const networkStateChangeHandler = (_oldNetworkState: any, newNetworkState: any) => {
    //       console.log(newNetworkState);
    //       const newUdp = Reflect.get(newNetworkState, 'udp');
    //       clearInterval(newUdp?.keepAliveInterval);
    //     }
    //     oldNetworking?.off('stateChange', networkStateChangeHandler);
    //     newNetworking?.on('stateChange', networkStateChangeHandler);
    //   }
    // });

    await entersState(connection, VoiceConnectionStatus.Ready, 20e3).catch(() => {});

    const receiver = connection.receiver;
    receiver.speaking.on("start", async (userId) => {
      const member = this.guild.members.cache.get(userId);
      if (!member) return;
      if (member.user.bot) return;
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
          deleteFileList.push({
            randomFileName: randomFileName,
            time: Date.now() + 3000
          });
          if (client.debug) Logger.log(`${member.nickname || member.user.username} : 시간짧음 (${duration})`);
          return;
        }
        if (client.debug) Logger.log(`${member.nickname || member.user.username} : 음성 변환중 (${duration})`);
        this.make(channel, randomFileName, member).catch(() => {});
      });
    });
  }

  async make(channel: VoiceChannel, randomFileName: string, member: GuildMember) {
    const { text, err } = await this.getSttText(sttFilePath+randomFileName+".wav");
    if (err) {
      // this.logChannel(channel, member, `STT오류발생 : ${err}`);
      return;
    }
    if (text != undefined && text.length > 1) {
      let args = text.replace(/\.+/g,'').split(/ +/g);
      if (this.checkSayGpt(args[0])) args[0] = "GPT야";
      if (client.debug) Logger.log(`${member.nickname || member.user.username} : ${text}`);
      this.logChannel(channel, member, text);
      this.command(channel, args, member).catch(() => {});
    }
    deleteFileList.push({
      randomFileName: randomFileName,
      time: Date.now() + 5000
    });
    // if (client.debug) Logger.log(`${member.nickname || member.user.username} : #내용없음`);
  }

  async command(voiceChannel: VoiceChannel, args: string[], member: GuildMember) {
    const bot = this.guild.members.cache.get(client.user?.id || "");
    const channel = bot?.voice.channel?.type === ChannelType.GuildVoice ? bot.voice.channel : voiceChannel;
    if (args[0] === "안녕") return this.say(channel, randomText("hello", member));
    if (this.checkSayGpt(args[0])) {
      if (!args[1]) return this.say(channel, randomText("callName", member));
      if ([ "중지", "종료", "죽어" ].includes(args[1])) {
        await this.say(channel, randomText("death", member));
        getVoiceConnection(this.guild.id)?.disconnect();
        getVoiceConnection(this.guild.id)?.destroy();
        return;
      }
      let text = await getChatText(args.slice(1).join(" "), this.guild.id);
      if (!text) return;
      if (text.startsWith("하세요")) text = "안녕" + text;
      return this.say(channel, text);
    }
  }

  checkSayGpt(text: string): boolean {
    const checkSayGpt = text.match(/(?:GPT|지피티|GP키)(?:야|아)(.*)/);
    if (checkSayGpt && checkSayGpt[1].length == 0) return true;
    return false;
  }

  getSttText(filePath: string) {
    return new Promise<{ text?: string; err?: string }>((res) => {
      if (KEY.length == 0) return res({ err: "key를 찾을수없음" });
      const NOWKEY = KEY[this.keyNum++];
      if (this.keyNum >= KEY.length) this.keyNum = 0;
      readFile(filePath, { encoding: "base64" }, (err, data) => {
        if (err) return res({ err: "audio file 을 찾을수 없음" });
        axios.post(`http://aiopen.etri.re.kr:8000/WiseASR/Recognition`, {
          "argument": {
            "language_code": languageCode,
            "audio": data
          }
        }, {
          headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
            "Authorization": NOWKEY,
            "Accept-Encoding": "*"
          },
          responseType: "json"
        }).then((val) => {
          /* { result: number; return_type: string; return_object: { recognized: string; } } */
          return res({ text: val.data?.return_object?.recognized });
        }).catch((err) => {
          return res({ err: err.response?.data?.reason });
        })
      });
    });
  }

  async say(channel: VoiceChannel, text: string) {
    await this.TTS.tts(channel, text).catch(() => {});
    return;
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
