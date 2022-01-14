import { I, M } from "../aliases/discord.js";
import { GuildMember } from "discord.js";
import run from "./run.js";
import { config } from "dotenv";
import { getsignature } from "./getsignature";
import tts from "./tts.js";
config();

const voice_prefix_list: string[] = (process.env.VOICE_PREFIX_LIST) ? eval(process.env.VOICE_PREFIX_LIST) : [ "테스트" ];
voice_prefix_list.sort((a, b) => {
  return b.length - a.length;
});

let checksig = false;
var signature_check_obj: { [key: string]: string } = {};
var snlist: string[] = [];
var sncheck = /defaultRegExpmessage/gi;

export async function restartsignature() {
  const sig = await getsignature();
  signature_check_obj = sig[1];
  snlist = Object.keys(signature_check_obj);
  sncheck = new RegExp(Object.keys(signature_check_obj).join('|'), 'gi');
}

export default async function cmd(message: M | I, member: GuildMember, text: string) {
  if (!checksig) {
    checksig = true;
    await restartsignature();
  }
  const scobj: { [key: string]: string } = signature_check_obj;
  if (sncheck.test(text.trim())) {
    await tts(message.guildId!, scobj[text.trim()], true);
    return;
  }
  for (let voice_prefix of voice_prefix_list) {
    if (text.trim().startsWith(voice_prefix)) {
      const args = text.trim().slice(voice_prefix.length).trim().split(/ +/g);
      run(message, args, member);
      break;
    }
  }
}