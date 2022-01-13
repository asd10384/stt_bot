import { AudioReceiveStream, createAudioResource, DiscordGatewayAdapterCreator, EndBehaviorType, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { GuildChannel, GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js";
import { sttgetkeyfile } from "./googleapi";
import { SpeechClient } from "@google-cloud/speech";
import run from "./run.js";
import { createWriteStream, writeFileSync } from "fs";
import prism from "prism-media";
import tts from "./tts.js";

sttgetkeyfile();
const sttclient = new SpeechClient({
  keyFile: 'sttgooglettsapi.json',
  fallback: false
});


export default async function start(message: M | I, channel: GuildChannel) {
  const connection = joinVoiceChannel({
    adapterCreator: message.guild!.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    channelId: channel.id,
    guildId: message.guildId!
  });
  stt(message, connection);
}

async function stt(message: M | I, connection: VoiceConnection) {
  connection.receiver.speaking.on("start", async (userId) => {
    console.log(userId);
    const member = message.guild!.members.cache.get(userId);
    if (!member || member.user.bot) return;
    const audioStream = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 250
      }
    });
    let bufferlist: any[] = [];
    audioStream.on("data", (data) => {
      bufferlist.push(data);
    });
    audioStream.on("end", async () => {
      console.log(1);
      let buffer = Buffer.concat(bufferlist);
      const duration = buffer.length / 10500;
      // 20 secounds max dur
      console.log(duration);
      if (duration < 1.0) return;
      try {
        console.log(3);
        let new_buffer = await convert_audio(buffer);
        console.log(4);
        if (!new_buffer) return;
        let out = await transform(buffer, member);
        console.log(5);
        if (out != null) cmd(message, member, out);
        console.log(6);
      } catch (err) {
        console.log(err);
      }
    });
  });
}

async function cmd(message: M | I, member: GuildMember, text: string) {
  if (!text || !text.length) return;

  const voice_prefix = "테스트";
  if (text.trim().startsWith(voice_prefix)) {
    const args = text.trim().slice(voice_prefix.length).trim().split(/ +/g);
    return run(message, args, member);
  }
}

async function transform(buffer: Buffer, member: GuildMember) {
  try {
    const [response] = await sttclient.recognize({
      audio: { content: buffer },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 24000,
        languageCode: "ko-KR"
      }
    });
    console.log(response.results);
    const transcription = response.results!
      .map(result => result.alternatives![0].transcript)
      .join("\n");
    console.log("메세지:", transcription);
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