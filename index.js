require("dotenv").config();
const express = require("express");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const facebookStrategy = require("passport-facebook").Strategy;

const User = require("./models/User");

const app = express();

app.set("view engine", "ejs");

app.use(session({ secret: process.env.SECRET }));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

// facebook strategy
passport.use(
  new facebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:5000/auth/facebook/callback",
      profileFields: [
        "id",
        "displayName",
        "name",
        "gender",
        "picture.type(large)",
        "email",
      ],
    }, // facebook will send back the token and profile
    function (accessToken, refreshToken, profile, done) {
      // asynchronous
      process.nextTick(function () {
        // find the user in the database based on their facebook id
        User.findOne({ uid: profile.id }, function (err, user) {
          // if there is an error, stop everything and return that
          // ie an error connecting to the database
          if (err) return done(err);

          // if the user is found, then log them in
          if (user) {
            console.log("user found");
            console.log(user);
            return done(null, user); // user found, return that user
          } else {
            // if there is no user found with that facebook id, create them
            var newUser = new User();

            // set all of the facebook information in our user model
            newUser.uid = profile.id; // set the users facebook id
            newUser.name =
              profile.name.givenName + " " + profile.name.familyName; // look at the passport user profile to see how names are returned
            newUser.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
            newUser.pic = profile.photos[0].value;
            // save our user to the database
            newUser.save(function (err) {
              if (err) throw err;

              // if successful, return the new user
              return done(null, newUser);
            });
          }
        });
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

// route middleware to make sure
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) {
    return next();
  }

  // if they aren't redirect them to the home page
  res.redirect("/");
}

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: "email" })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/profile",
    failureRedirect: "/",
  })
);

app.get("/profile", isLoggedIn, (req, res) => {
  console.log(req.user);
  res.render("profile", {
    user: req.user, // get the user out of session and pass to template
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`App is running on port ${PORT}`));
