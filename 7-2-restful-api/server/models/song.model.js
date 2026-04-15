import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title:  { type: String, required: true, trim: true },
  artist: { type: String, required: true, trim: true },
  year:   { type: Number, min: 1000, max: 9999 }
}, { timestamps: true });

export const Song = mongoose.model("Song", songSchema);
