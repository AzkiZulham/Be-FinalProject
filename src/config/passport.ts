import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,        // <-- harus ada
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // <-- harus ada
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);
      return done(null, profile);
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ["id", "emails", "name", "displayName"],
    },
    (accessToken, refreshToken, profile, done) => {
      // console.log('Access Token:', accessToken);
      // console.log('Refresh Token:', refreshToken);
      return done(null, profile);
    }
  )
);

export default passport;

// console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("FACEBOOK_CLIENT_ID:", process.env.FACEBOOK_CLIENT_ID);
