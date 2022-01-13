import { client } from "../index.js";
import { I, M } from "../aliases/discord.js";
import { GuildBasedChannel, GuildMember } from "discord.js";
import { config } from "dotenv";
import MDB from "../database/Mongodb";
config();

const sttmessagechannelid: string | undefined = (process.env.STT_MESSAGE_CHANNEL_ID) ? process.env.STT_MESSAGE_CHANNEL_ID : undefined;

export default async function sendmessage(message: M | I, member: GuildMember, text: string) {
  let channel: GuildBasedChannel | undefined = undefined;
  if (client.debug) {
    channel = message.guild?.channels.cache.get(sttmessagechannelid!);
  } else {
    const guildDB = await MDB.module.guild.findOne({ id: message.guildId! });
    if (guildDB && guildDB.sttchannelid && guildDB.sttchannelid.length > 0) channel = message.guild?.channels.cache.get(guildDB!.sttchannelid!);
  }
  if (channel && (channel.type == "GUILD_TEXT")) {
    channel.send({
      content: `**${member.nickname ? member.nickname : member.user.username}** : ${text}`
    });
  }
}