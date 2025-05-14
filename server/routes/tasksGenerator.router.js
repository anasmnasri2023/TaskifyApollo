const express = require("express");
const Router = express();
const Controllers = require("../controllers/giminiTaskGenerator");

Router.post(
  "/generateTasks",  Controllers.GenerateTasks
);
module.exports = Router;
