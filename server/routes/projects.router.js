const express = require("express");
const Router = express.Router();
const Controllers = require("../controllers/projects");
const passport = require("passport");

Router.post(
  "/projects",
  passport.authenticate("jwt", { session: false }),
  Controllers.Add
);

Router.get(
  "/projects",
  passport.authenticate("jwt", { session: false }),
  Controllers.GetAll
);

Router.get(
  "/projects/:id",
  passport.authenticate("jwt", { session: false }),
  Controllers.GetOne
);

Router.put(
  "/projects/:id",
  passport.authenticate("jwt", { session: false }),
  Controllers.UpdateOne
);

Router.delete(
  "/projects/:id",
  passport.authenticate("jwt", { session: false }),
  Controllers.DeleteOne
);

module.exports = Router;