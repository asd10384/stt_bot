import { client } from "../index";
import { Command } from "../interfaces/Command";
// import { Logger } from "../utils/Logger";
import { Message, EmbedBuilder, ApplicationCommandOptionType, ChatInputApplicationCommandData, CommandInteraction, ChannelType, Guild, VoiceChannel, TextChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
// import { check_permission as ckper, embed_permission as emper } from "../utils/Permission";
// import { QDB } from "../databases/Quickdb";

/**
 * DB
 * let guildDB = await QDB.get(interaction.guild!);
 * 
 * check permission(role)
 * if (!(await ckper(interaction))) return await interaction.followUp({ embeds: [ emper ] });
 * if (!(await ckper(message))) return (message.channel as TextChannel).send({ embeds: [ emper ] }).then(m => client.msgdelete(m, 1));
 */

export default class implements Command {
  /** 해당 명령어 설명 */
  name = "stt";
  visible = true;
  description = "speech to text";
  information = "speech to text";
  aliases: string[] = [];
  metadata: ChatInputApplicationCommandData = {
    name: this.name,
    description: this.description,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "start",
        description: "start bot",
        options: [{
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ ChannelType.GuildVoice ],
          name: "channel",
          description: "channel",
          required: true
        }]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "stop",
        description: "stop bot"
      }
    ]
  };
  msgmetadata?: { name: string; des: string; }[] = undefined;

  /** 실행되는 부분 */
  async slashRun(interaction: CommandInteraction) {
    const cmd = interaction.options.data[0];
    if (cmd.name === "start") {
      const data = cmd.options ? cmd.options[0]?.channel : undefined;
      if (data) return await interaction.followUp({ content: this.start(interaction.guild!, data as VoiceChannel) });
    }
    if (cmd.name === "stop") {
      getVoiceConnection(interaction.guildId!)?.disconnect();
      getVoiceConnection(interaction.guildId!)?.destroy();
      return await interaction.followUp({ content: "done!" });
    }
    return await interaction.followUp({ embeds: [ this.help() ] });
  }
  async messageRun(message: Message, _args: string[]) {
    return (message.channel as TextChannel).send({ embeds: [
      client.mkembed({
        title: `제작중...`,
        color: "DarkRed"
      })
    ] }).then(m => client.msgdelete(m, 1));
  }

  help(): EmbedBuilder {
    return client.help(this.metadata.name, this.metadata, this.msgmetadata)!;
  }

  start(guild: Guild, channel: VoiceChannel): string {
    client.getSTT(guild).start(channel);
    return "done!";
  }
}