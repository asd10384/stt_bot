import "dotenv/config";
import { Configuration, OpenAIApi } from "openai";

const KEY = process.env.CHAT_GPT_KEY || "";

const openai = new OpenAIApi(new Configuration({
  apiKey: KEY
}));

export const getChatText = (text: string, guildId: string) => new Promise<string | undefined>((res) => {
  if (KEY.length == 0) return res(undefined);
  openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        name: guildId,
        content: "너의 이름은 GPT이고 우리는 친구야. 너는 내가하는 모든 말에 3문장이하, 100글자 이하로 답해야해."
      },
      {
        role: "user",
        name: guildId,
        content: text
      }
    ]
  }).then((val) => {
    return res(val.data.choices.length > 0 ? val.data.choices[0].message?.content : undefined);
  }).catch(() => {
    return res(undefined);
  });
});