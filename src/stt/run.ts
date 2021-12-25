import { GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js";
import tts from "./tts";

export default async function run(message: M | I, args: string[], member: GuildMember) {
  var saytext = "";
  if (!args[0]) {
    saytext = "네?";
  }
  if (args[0] === "안녕") {
    saytext = "안녕하세요";
  }
  return tts(message.guildId!, saytext);
}