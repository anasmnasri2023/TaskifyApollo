const express = require("express");
const { createRoom, getAllRooms, saveScore } = require("../controllers/roomGame.js");
const Router = express.Router();

Router.post("/newRoom", createRoom);
Router.get("/", getAllRooms);
Router.post("/score", saveScore);

module.exports = Router;
