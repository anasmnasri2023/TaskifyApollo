const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teamPostSchema = new Schema(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "teams",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "file"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    comments: [
      {
        content: {
          type: String,
          required: true,
        },
        author: {
          type: Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("teamPosts", teamPostSchema);