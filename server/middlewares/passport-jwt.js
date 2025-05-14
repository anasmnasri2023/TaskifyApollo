const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const usersModel = require("../models/users");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.PRIVATE_KEY
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        console.log('🔍 JWT Payload:', jwt_payload);
        const user = await usersModel.findOne({ _id: jwt_payload.id });
        if (user) {
          console.log('✅ User found:', user._id);
          return done(null, user);
        } else {
          console.log('❌ User not found for ID:', jwt_payload.id);
          return done(null, false);
        }
      } catch (error) {
        console.error('❌ JWT Strategy Error:', error);
        return done(error, false);
      }
    })
  );
};