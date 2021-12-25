import { config } from "dotenv";
import { writeFileSync } from "fs";
config();

export function ttsgetkeyfile() {
  var option = {
      "type": process.env.TYPE,
      "project_id": process.env.PROJECT_ID,
      "private_key_id": process.env.PRIVATE_KEY_ID,
      "private_key": process.env.PRIVATE_KEY!.replace(/\\n/gm,'\n'),
      "client_email": process.env.CLIENT_EMAIL,
      "client_id": process.env.CLIENT_ID,
      "auth_uri": process.env.AUTH_URI,
      "token_uri": process.env.TOKEN_URI,
      "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
      "client_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL
  };
  console.log("tts파일 로딩 완료");
  writeFileSync(`ttsgooglettsapi.json`, JSON.stringify(option).replace(/\{/g,'{\n').replace(/\}/g,'\n}').replace(/\,/g, ',\n'));
}

export function sttgetkeyfile() {
    var option = {
        "type": process.env.STYPE,
        "project_id": process.env.SPROJECT_ID,
        "private_key_id": process.env.SPRIVATE_KEY_ID,
        "private_key": process.env.SPRIVATE_KEY!.replace(/\\n/gm,'\n'),
        "client_email": process.env.SCLIENT_EMAIL,
        "client_id": process.env.SCLIENT_ID,
        "auth_uri": process.env.SAUTH_URI,
        "token_uri": process.env.STOKEN_URI,
        "auth_provider_x509_cert_url": process.env.SAUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": process.env.SAUTH_PROVIDER_X509_CERT_URL
    };
    console.log("sst파일 로딩 완료");
    writeFileSync(`sttgooglettsapi.json`, JSON.stringify(option).replace(/\{/g,'{\n').replace(/\}/g,'\n}').replace(/\,/g, ',\n'));
}