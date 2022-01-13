import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
config();

export interface guild_type extends Document {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  sttchannelid: string;
}

const GuildSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array },
  sttchannelid: { type: String }
});

export const guild_model = model<guild_type>(`Guild`, GuildSchema);