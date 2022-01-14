import { client } from "..";
import { check_permission as ckper, embed_permission as emper } from "../function/permission";
import { Command } from "../interfaces/Command";
import { I, D } from "../aliases/discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { GuildChannel, GuildMember, Message, MessageActionRow, MessageButton } from "discord.js";
import MDB from "../database/Mongodb";
import start from "../stt/stt";
import { restartsignature } from "../stt/cmd";

/**
 * DB
 * let guildDB = await MDB.get.guild(interaction);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
 * if (!(await ckper(message))) return message.channel.send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

/** stt 명령어 */
export default class SttCommand implements Command {
  /** 해당 명령어 설명 */
  name = "음성";
  visible = true;
  description = "stt";
  information = "빅스비나 시리같은 기능";
  aliases = [ "stt" ];
  metadata = <D>{
    name: this.name,
    description: this.description,
    options: [
      {
        type: "SUB_COMMAND",
        name: "start",
        description: "stt start",
        options: [{
          type: "CHANNEL",
          name: "channel",
          description: "select channel",
          channelTypes: [ "GUILD_VOICE", "GUILD_STAGE_VOICE" ]
        }]
      },
      {
        type: "SUB_COMMAND",
        name: "시작",
        description: "stt 시작",
        options: [{
          type: "CHANNEL",
          name: "channel",
          description: "특정채널에 접속",
          channelTypes: [ "GUILD_VOICE", "GUILD_STAGE_VOICE" ]
        }]
      },
      {
        type: "SUB_COMMAND",
        name: "stop",
        description: "stt stop"
      },
      {
        type: "SUB_COMMAND",
        name: "종료",
        description: "stt 종료"
      },
      {
        type: "SUB_COMMAND",
        name: "채널생성",
        description: "필수아님"
      },
      {
        type: "SUB_COMMAND",
        name: "채널제거",
        description: "생성한 채널 제거"
      },
      {
        type: "SUB_COMMAND",
        name: "리로드",
        description: "시그니쳐 리로드"
      }
    ]
  };

  /** 실행되는 부분 */
  async slashrun(interaction: I) {
    const cmd = interaction.options.getSubcommand();
    if (cmd === "start" || cmd === "시작") {
      var channel = interaction.options.getChannel("channel");
      if (channel) {
        start(interaction, channel as GuildChannel);
        return await interaction.editReply({ content: "done!" });
      } else {
        channel = (interaction.member as GuildMember).voice.channel;
        if (!!channel) {
          start(interaction, channel);
          return await interaction.editReply({ content: "done!" });
        }
        return await interaction.editReply({ embeds: [
          client.mkembed({
            title: `\` 음성을 찾을수없음 \``,
            description: `음성에 들어간뒤 사용해주세요.`,
            color: "DARK_RED"
          })
        ] });
      }
    }
    if (cmd === "stop" || cmd === "종료") {
      const connection = getVoiceConnection(interaction.guildId!);
      connection?.disconnect();
      return await interaction.editReply({ content: "done!" });
    }
    if (cmd === "채널생성") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      return await interaction.editReply({ content: await this.makechannel(interaction) });
    }
    if (cmd === "채널제거") {
      if (!(await ckper(interaction))) return await interaction.editReply({ embeds: [ emper ] });
      return await interaction.editReply({ content: await this.delchannel(interaction) });
    }
    if (cmd === "리로드") {
      return await interaction.editReply({ content: await this.signature() });
    }
  }

  async makechannel(message: I): Promise<string> {
    const guildDB = await MDB.get.guild(message);
    const channel = await message.guild!.channels.create('STT메세지채널', {
      type: "GUILD_TEXT",
      topic: "/음성 종료 명령어로 종료가능"
    });
    guildDB!.sttchannelid = channel.id;
    guildDB!.save().catch((err) => {});
    return `<#${channel.id}> 채널 생성 완료`;
  }
  async delchannel(message: I): Promise<string> {
    const guildDB = await MDB.get.guild(message);
    const channel = message.guild?.channels.cache.get(guildDB!.sttchannelid);
    const name = channel?.name;
    if (channel) channel.delete();
    guildDB!.sttchannelid = "";
    guildDB!.save().catch((err) => {});
    return `**${name}** 채널 제거 완료`;
  }

  async signature(): Promise<string> {
    await restartsignature();
    return "done!";
  }
}