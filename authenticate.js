var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken');

var config = require('./config');
var FacebookTokenStrategy = require('passport-facebook-token');

var User = require('./models/user');

exports.local = passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = function(user) {
    console.log('getting token');

    //return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZDgzYzJhNzVhYjg0ODA2ZTAxMjQyNzEiLCJpYXQiOjE1Njg5MTcwMTYsImV4cCI6MTU2ODkyMDYxNn0.-k5pyV3K2D3VyylfhugoSPsFgd-OaGmr_ocTA6RTVL8';
    return jwt.sign(user, config.secretKey, 
        {expiresIn: 3600})
};

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = config.secretKey;

exports.jwtPassport = passport.use(new JwtStrategy(opts,
    (jwt_payload, done) => {
        console.log("printing...JWT Payload: ");
        User.findOne({_id: jwt_payload._id},(err, user) => {
            if (err) {
                return done(err, false);
            }
            else if (user) {
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        })
    }));

exports.verifyUser = passport.authenticate('jwt', {session:false});


exports.verifyAdmin = (req, res, next) => {
    if(req.user.admin){
        console.log("Admin verified");
        next();
    }
    else {
        res.statusCode = 403;
        var err = new Error('You are not authorized to perform this operation');
        err.status = 403;
        return next(err);
    }
}



exports.facebookPassport = passport.use(new FacebookTokenStrategy({
    clientID: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret
}, (accessToken, refreshToken, profile, done) => {
    User.findOne({facebookId: profile.id}, (err, user) => {
        if (err) {
            return done(err, false);
        }
        if (!err && user !== null) {
            return done(null, user);
        }
        else {
            user = new User({ username: profile.displayName });
            user.facebookId = profile.id;
            user.firstname = profile.name.givenName;
            user.lastname = profile.name.familyName;
            user.save((err, user) => {
                if (err)
                    return done(err, false);
                else
                    return done(null, user);
            })
        }
    });
}
));