const express = require("express");
const Router = express();
const Login = require("../controllers/auth/Login");
const { ChangePassword } = require("../controllers/auth/ChangePassword");
const passport = require("passport");
const { CheckMail, ResetPassword } = require("../controllers/auth/Reset");
const { getAcessToken , getUsertData  } = require("../controllers/auth/loginGithub");
const { getAccessTokenGoogle , getUserDataGoogle  } = require("../controllers/auth/GoogleAuth");

Router.post("/login", Login);

Router.get("/getAccessToken",getAcessToken) ;
Router.get("/getUserData",getUsertData) ;

Router.get("/google/getAccessToken", getAccessTokenGoogle);
Router.get("/google/getUserData", getUserDataGoogle);

Router.post(
  "/change_password",
  passport.authenticate("jwt", { session: false }),
  ChangePassword
);
Router.post("/__check_mail", CheckMail);
Router.post("/__reset_password", ResetPassword);

module.exports = Router;
