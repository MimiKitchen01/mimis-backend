import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ 'google.id': profile.id });

        if (user) {
          // Update user's Google info
          user.google.accessToken = accessToken;
          user.google.refreshToken = refreshToken;
          await user.save();
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google account to existing user
          user.google = {
            id: profile.id,
            accessToken,
            refreshToken
          };
          await user.save();
          return done(null, user);
        }

        // Create new user
        const newUser = await User.create({
          email: profile.emails[0].value,
          fullName: profile.displayName,
          imageUrl: profile.photos[0]?.value,
          isVerified: true, // Google accounts are pre-verified
          google: {
            id: profile.id,
            accessToken,
            refreshToken
          }
        });

        done(null, newUser);
      } catch (error) {
        logger.error('Google auth error:', error);
        done(error, false);
      }
    }
  )
);

export default passport;
