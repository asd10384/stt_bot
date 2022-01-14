import { readFileSync, writeFileSync } from "fs";
import axios from "axios";

// 사이트 -> buffer

const url = "https://m.search.naver.com/p/csearch/ocontent/util/ttsProxy.naver?service=nco_translate&from=pc_search&speech_fmt=mp3&speed=0&passportKey=c3056ee62fe158036f13994a465b015c5aea1893&speaker=mijin&text=%ed%85%8c%ec%8a%a4%ed%8a%b8";
const url2 = `https://signaturesite.netlify.app/file/${encodeURIComponent("찬구")}/${encodeURIComponent("ㅋㅋ뤀삥뽕")}.mp3`;
(async () => {
  const t = await axios.get(url2, { responseType: "arraybuffer" });
  const buffer = Buffer.from(t.data, "utf8");
  writeFileSync("test.mp3", buffer);
  console.log("done!");
})();