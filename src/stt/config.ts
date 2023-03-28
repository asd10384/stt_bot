import { GuildMember } from "discord.js";

const hello = [
  "{name}님 안녕하세요.",
  "{name}님 반갑습니다."
];

const callName = [
  "{name}님 저를 부르셨나요?",
  "네 무엇이든 물어보세요.",
  "네 저는 GPT입니다."
];

const death = [
  "전원을 종료합니다.",
  "GPT를 종료합니다."
];

export const randomText = (name: "hello" | "callName" | "death", member: GuildMember): string => {
  let list: string[] = [ "네" ];
  if (name == "hello") list = hello;
  if (name == "callName") list = callName;
  if (name == "death") list = death;
  return list[Math.floor(Math.random()*list.length)].replace("{name}", member.nickname || member.user.username);
}
