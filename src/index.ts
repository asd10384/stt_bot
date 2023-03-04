import "./tts/googleTTSAPI";
import { BotClient } from "./classes/BotClient";
import { SlashHandler } from "./classes/Handler";
import { onReady } from "./events/onReady";
import { onInteractionCreate } from "./events/onInteractionCreate";
import { onMessageCreate } from "./events/onMessageCreate";
import { existsSync, mkdirSync, readdir, unlink } from "fs";
import { ttsFilePath } from "./tts/ttsClass";
import { sttFilePath } from "./stt/sttClass";
// import { onmessageReactionAdd } from "./events/onmessageReactionAdd";

export const client = new BotClient();
export const handler = new SlashHandler();

client.onEvent("ready", onReady);
client.onEvent("interactionCreate", onInteractionCreate);
client.onEvent("messageCreate", onMessageCreate);
// client.onEvent("messageReactionAdd", onmessageReactionAdd);

/**
 * https://www.npmjs.com/package/deepspeech
 * https://github.com/dsteinman/deepspeech-simple/blob/master/index.js
 * https://www.assemblyai.com/blog/deepspeech-for-dummies-a-tutorial-and-overview-part-1/
 * 
 */

// TTS 파일 삭제
if (!existsSync(ttsFilePath)) mkdirSync(ttsFilePath);
readdir(ttsFilePath, (err, files) => {
  if (err) console.error(err);
  files.forEach((file) => {
    unlink(`${ttsFilePath}/${file}`, (err) => {
      if (err) return;
    });
  });
});

// STT 파일 삭제
if (!existsSync(sttFilePath)) mkdirSync(sttFilePath);
readdir(sttFilePath, (err, files) => {
  if (err) console.error(err);
  files.forEach((file) => {
    unlink(`${sttFilePath}/${file}`, (err) => {
      if (err) return;
    });
  });
});
