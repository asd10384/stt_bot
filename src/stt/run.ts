import { GuildMember } from "discord.js";
import { I, M } from "../aliases/discord.js";
import tts from "./tts";

export default async function run(message: M | I, args: string[], member: GuildMember) {
  let saytext: string = "";
  let saylist: string[] = [];
  const text = args.join(" ");
  if (!text) {
    saylist = [ "네 듣고있어요.", "부르셨나요?" ];
  }
  if (text === "안녕") {
    saylist = [ "안녕하세요." ];
  }
  if (text === "지금 몇 시야") {
    saylist = [ `지금은 ${time()} 입니다.` ];
  }
  if (text === "죽어" || text === "뒤져") {
    saylist = [ "어떻게 그렇게 심한말을...", `${member.nickname ? member.nickname : member.user.username} 님 저는 죽지 않아요.` ];
  }
  if (args.length >= 3 && parseFloat(args[0]) !== NaN && ["+", "-", "*", "나누기"].includes(args[1]) && (args[2].endsWith("은") || args[2].endsWith("는")) && parseFloat(args[2].slice(0,-1)) !== NaN) {
    switch (args[1]) {
      case "+":
        saytext = `${args[0]} 더하기 ${args[2]} ${parseFloat(args[0]) + parseFloat(args[2].slice(0,-1))} 입니다.`;
        break;
      case "-":
        saytext = `${args[0]} 빼기 ${args[2]} ${parseFloat(args[0]) - parseFloat(args[2].slice(0,-1))} 입니다.`;
        break;
      case "*":
        saytext = `${args[0]} 곱하기 ${args[2]} ${parseFloat(args[0]) * parseFloat(args[2].slice(0,-1))} 입니다.`;
        break;
      case "나누기":
        saytext = `${args[0]} 나누기 ${args[2]} ${parseFloat(args[0]) / parseFloat(args[2].slice(0,-1))} 입니다.`;
        break;
    }
  }
  if (args[args.length-1] === "뭐야") {
    args.pop();
    if (!args || args.length === 0) return;
    let searchtext = args.join(" ");
    if (
      searchtext[searchtext.length-1] === "은"
      || searchtext[searchtext.length-1] === "는"
      || searchtext[searchtext.length-1] === "이"
      || searchtext[searchtext.length-1] === "가"
    ) searchtext = searchtext.slice(0,-1);
    saytext = search(searchtext);
  }
  if (saylist.length > 0 && saytext.length === 0) saytext = saylist[Math.floor(Math.random() * saylist.length)];
  return tts(message.guildId!, saytext);
}

function time() {
  const date = new Date();
  const hour = date.getHours();
  const min = date.getMinutes();
  return `${hour > 12 ? "오후" : "오전"} ${hour > 12 ? hour-12 : hour}시 ${min}분`;
}

function search(text: string): string {
  return `${text} 에 대해서 저는 잘 모르겠어요.`;
}