const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('./cors');
var authenticate = require('../authenticate');
const Dishes = require('../models/dishes');

const Favs = require('../models/favorite');

const favoriteRouter = express.Router();

favoriteRouter.use(bodyParser.json());


/*
Routes required:

1. get -> /favorite [of a logged in user]
2. post-> /favorite/dishid [of a logged in user, add that dish as favorite of that user]
3. post -> /favorite [add an array of favorite dish ids]
4. delete -> favorite/dishid [delete this dish from favorites of logged in user]
5. delete -> /favorite [delete all faovrites of that user and also delete the entire document]

*/

favoriteRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser,(req,res,next) => {
    //get all favorites of logged in user ::::::::::::
    Favs.find({})
    .populate('user')
    .populate('dishes')
    .then((favorites) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(favorites);
    }, (err) => next(err))
    .catch((err) => next(err));

})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
   //add the array of dish ids to favorites ::::::::::::
   //check if dish id is valid
   Favs.findOne({user: req.user._id})
   .then((favorite) => {
       if (favorite) {
           for (var i=0; i<req.body.length; i++) {
               if (favorite.dishes.indexOf(req.body[i]._id) === -1) {
                   favorite.dishes.push(req.body[i]._id);
               }
           }
           favorite.save()
           .then((favorite) => {
               console.log('Favorite Created ', favorite);
               res.statusCode = 200;
               res.setHeader('Content-Type', 'application/json');
               res.json(favorite);
           }, (err) => next(err)); 
       }
       else {
           Favorites.create({"user": req.user._id, "dishes": req.body})
           .then((favorite) => {
               console.log('Favorite Created ', favorite);
               res.statusCode = 200;
               res.setHeader('Content-Type', 'application/json');
               res.json(favorite);
           }, (err) => next(err));
       }
   }, (err) => next(err))
   .catch((err) => next(err)); 


})
.put(cors.corsWithOptions, authenticate.verifyUser,(req, res, next) => {
    //not supported
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
})
.delete(cors.corsWithOptions, authenticate.verifyUser,(req, res, next) => {
    //delete all favorites ::::::::::::
    Favs.findOneAndRemove({"user": req.user._id})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err)); 
});

favoriteRouter.route('/:dishId')
.options(cors.corsWithOptions, authenticate.verifyUser, (req, res) => { res.sendStatus(200); })
.get(cors.cors,(req,res,next) => {
   //not supported
   res.statusCode = 403;
    res.end('GET operation not supported on /favorites/dishID');
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
   //post it as favorite ::::::::::::
   Favs.findOne({user: req.user._id})
   .then((favorite) => {
       if (favorite) {            
           if (favorite.dishes.indexOf(req.params.dishId) === -1) {
               favorite.dishes.push(req.params.dishId)
               favorite.save()
               .then((favorite) => {
                   console.log('Favorite Created ', favorite);
                   res.statusCode = 200;
                   res.setHeader('Content-Type', 'application/json');
                   res.json(favorite);
               }, (err) => next(err))
           }
       }
       else {
           Favs.create({"user": req.user._id, "dishes": [req.params.dishId]})
           .then((favorite) => {
               console.log('Favorite Created ', favorite);
               res.statusCode = 200;
               res.setHeader('Content-Type', 'application/json');
               res.json(favorite);
           }, (err) => next(err))
       }
   }, (err) => next(err))
   .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser,(req, res, next) => {
   //not supported
   res.statusCode = 403;
   res.end('PUT operation not supported on /favorites/dishID');
})
.delete(cors.corsWithOptions, authenticate.verifyUser,(req, res, next) => {
   //delete that specific dish from the favorites ::::::::::::

   Favs.findOne({user: req.user._id})
   .then((favorite) => {
       if (favorite) {            
           index = favorite.dishes.indexOf(req.params.dishId);
           if (index >= 0) {
               favorite.dishes.splice(index, 1);
               favorite.save()
               .then((favorite) => {
                   console.log('Favorite Deleted ', favorite);
                   res.statusCode = 200;
                   res.setHeader('Content-Type', 'application/json');
                   res.json(favorite);
               }, (err) => next(err));
           }
           else {
               err = new Error('Dish ' + req.params.dishId + ' not found');
               err.status = 404;
               return next(err);
           }
       }
       else {
           err = new Error('Favorites not found');
           err.status = 404;
           return next(err);
       }
   }, (err) => next(err))
   .catch((err) => next(err));


});




module.exports = favoriteRouter;
