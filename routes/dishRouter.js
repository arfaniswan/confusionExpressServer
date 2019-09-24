const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Dishes = require('../models/dishes');

const dishRouter = express.Router();
const authenticate = require('../authenticate');
const cors = require('./cors');
dishRouter.use(bodyParser.json());

dishRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    // .all((req, res, next) => {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/plain');
    //     next();
    // })
    .get(cors.cors,(req, res, next) => {
        // res.end('Will send all the dishes to you');
        Dishes.find({})
            .populate('comments.author')
            .then((dishes) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dishes);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    //allowing post operation only to authorised users
    .post(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        // res.end('Will add the dish ' + req.body.name
        //     + 'with details ' + req.body.description);
        Dishes.create(req.body)
            .then((dish) => {
                console.log('Dish created: ', dish);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dish);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .put(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        res.statusCode = 403;
        res.end('Put operation not supported on /dishes');
    })
    .delete(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        // res.end('deleting all the dishes');
        Dishes.remove({})
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

dishRouter.route('/:dishID')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, (req, res, next) => {
        // res.end('Will send the details of the dish: '
        //     + req.params.dishID + " to you");
        Dishes.findById(req.params.dishID)
            //helps to fetch the author data from the user schema
            .populate('comments.author')
            .then((dishes) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dishes);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        res.end("Post operation not supported on /dishes/" + req.params.dishID);
    })
    .put(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        // res.write('Updating the dish ' + req.params.dishID);
        // res.end("Will update the dish: " + req.body.name + ' with details ' + req.body.desc);
        Dishes.findByIdAndUpdate(req.params.dishID, {
            $set: req.body
        }, {
                new: true
            })
            .then((dishes) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dishes);
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        // res.end('Deleting the dish: ' + req.params.dishID);
        Dishes.findByIdAndRemove(req.params.dishID)
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            }, (err) => next(err))
            .catch((err) => next(err));
    });

//routes for handling the comments sub document or array
dishRouter.route('/:dishID/comments')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    // .all((req, res, next) => {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/plain');
    //     next();
    // })
    .get(cors.cors,(req, res, next) => {
        // res.end('Will send all the dishes to you');
        Dishes.findById(req.params.dishID)
            .populate('comments.author')
            .then((dish) => {
                if (dish != null) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish.comments);
                }
                else {
                    err = new Error('Dish ' + req.params.dishID + ' not found');
                    err.status = 404;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    // .post(authenticate.verifyUser, (req, res, next) => {
    // res.end('Will add the dish ' + req.body.name
    //     + 'with details ' + req.body.description);
    .post(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
        Dishes.findById(req.params.dishID)
            .then((dish) => {
                if (dish != null) {
                    req.body.author = req.user._id;
                    dish.comments.push(req.body);
                    dish.save()
                        .then((dish) => {
                            Dishes.findById(dish._id)
                                .populate('comments.author')
                                .then((dish) => {
                                    res.statusCode = 200;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.json(dish);
                                })
                        }, (err) => next(err));
                }
                else {
                    err = new Error('Dish ' + req.params.dishID + ' not found');
                    err.status = 404;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    })

    .put(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
        res.statusCode = 403;
        res.end('Put operation not supported on /dishes'
            + req.params.dishID + ' /comments');
    })
    .delete(cors.corsWithOptions,authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
        // res.end('deleting all the dishes');
        Dishes.findById(req.params.dishID)
            .then((dish) => {
                if (dish != null) {
                    for (var i = dish.comments.length - 1; i >= 0; i--) {
                        dish.comments.id(dish.comments[i]._id).remove();
                    }
                    dish.save()
                        .then((dish) => {
                            Dishes.findById(dish._id)
                                .populate('comments.author')
                                .then((dish) => {
                                    res.statusCode = 200;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.json(dish);
                                })
                        }), (err) => next(err)
                }
                else {
                    err = new Error('Dish ' + req.params.dishID + ' not found');
                    err.status = 404;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    });

dishRouter.route('/:dishID/comments/:commentID')
    .get(cors.cors,(req, res, next) => {
        // res.end('Will send the details of the dish: '
        //     + req.params.dishID + " to you");
        Dishes.findById(req.params.dishID)
            .populate('comments.author')
            .then((dish) => {
                if (dish != null && dish.comments.id(req.params.commentID) != null) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish.comments.id(req.params.commentID));
                }
                else if (dish == null) {
                    err = new Error('Dish ' + req.params.dishID + ' not found');
                    err.status = 404;
                    return next(err);
                }
                else {
                    err = new Error('Comment ' + req.params.commentID + ' not found');
                    err.status = 404;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
        res.end("Post operation not supported on /dishes/" + req.params.dishID +
            '/comments/' + req.params.commentID);
    })
    .put(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
        // res.write('Updating the dish ' + req.params.dishID);
        // res.end("Will update the dish: " + req.body.name + ' with details ' + req.body.desc);
        Dishes.findById(req.params.dishID)
            .then((dish) => {
                if (req.user._id.equals(dish.comments.id(req.params.commentID).author._id)) {
                    if (dish != null && dish.comments.id(req.params.commentID) != null) {
                        if (req.body.rating) {
                            dish.comments.id(req.params.commentID).rating = req.body.rating;
                        }
                        if (req.body.comment) {
                            dish.comments.id(req.params.commentID).comment = req.body.comment;
                        }
                        dish.save()
                            .then((dish) => {
                                Dishes.findById(dish._id)
                                    .populate('comments.author')
                                    .then((dish) => {
                                        res.statusCode = 200;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.json(dish.comments);
                                    })
                            }), (err) => next(err)
                    }
                    else if (dish == null) {
                        err = new Error('Dish ' + req.params.dishID + ' not found');
                        err.status = 404;
                        return next(err);
                    }
                    else {
                        err = new Error('Comment ' + req.params.commentID + ' not found');
                        err.status = 404;
                        return next(err);
                    }
                }
                else {
                    var err = new Error('You are not authorized to update the comment');
                    err.status = 403;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
        // res.end('Deleting the dish: ' + req.params.dishID);
        Dishes.findById(req.params.dishID)
            .then((dish) => {
                if (req.user._id.equals(dish.comments.id(req.params.commentID).author._id)) {
                    if (dish != null) {
                        dish.comments.id(req.params.commentID).remove();
                        dish.save()
                            .then((dish) => {
                                Dishes.findById(dish._id)
                                    .populate('comments.author')
                                    .then((dish) => {
                                        res.statusCode = 200;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.json(dish.comments);
                                    })
                            }), (err) => next(err)
                    }
                    else if (dish == null) {
                        err = new Error('Dish ' + req.params.dishID + ' not found');
                        err.status = 404;
                        return next(err);
                    }
                    else {
                        err = new Error('Comment ' + req.params.commentID + ' not found');
                        err.status = 404;
                        return next(err);
                    }
                }
                else {
                    var err = new Error('You are not authorized to delete the comment');
                    err.status = 403;
                    return next(err);
                }
            }, (err) => next(err))
            .catch((err) => next(err));
    });

module.exports = dishRouter;