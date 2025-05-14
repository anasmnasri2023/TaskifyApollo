const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teamsSchema = new Schema(
  {
    Name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    creatorid: {
      type: Schema.Types.ObjectId, 
      ref:"users",
      required: true,
    },
    chatRoom: {
      type: Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null
    },
    datecreation: {
      type: Date, 
      default: Date.now,
    },
    pictureprofile: {
      type: String,
    },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "users" },
        role: { type: String, enum: ["ADMIN", "MANAGER", "ENGINEER", "GUEST"], default: "ENGINEER" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("teams", teamsSchema);