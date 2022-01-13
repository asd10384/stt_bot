import { GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js";
import tts from "./tts";

export default async function run(message: M | I, args: string[], member: GuildMember) {
  let saytext: string = "";
  let saylist: string[] = [];
  if (!args[0]) {
    saylist = [ "네 듣고있어요.", "부르셨나요?" ];
  }
  if (args[0] === "안녕") {
    saylist = [ "안녕하세요." ];
  }
  if (saytext.length > 0 && saylist.length > 0) saytext = saylist[Math.floor(Math.random() * saylist.length-1)];
  return tts(message.guildId!, saytext);
}