"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 * /photos/new    - Uploads new photo for login user
 * /admin/login   - Logins in user
 * /admin/logout  - Logouts user
 * /mentionsOfUser/:id - Returns an array containing all Mention object belonging to User with the _id of id.
 * /mention       - Adds a mention
 * /favoritesOfUser - Return an array containing all Photo object that has been favorited by the login user.
 * /favorite      - Adds new favorite photo for login user.
 * /tagsOfPhoto/:photo_id - Returns an array containing all Tag object belonging to Photo with the _id of photo_id.
 * /commentsOfUser/:id - Returns an array containing all Comment object belonging to User with the _id of id.
 * /commentsOfPhoto/:photo_id - Returns an array containing all Comment object belonging to Photo with the _id of photo_id.
 */

var mongoose = require('mongoose');
var async = require('async');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
var fs = require('fs');
var cs142password = require('./cs142password.js');


// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var app = express();

// XXX - Your submission should work without this line
//var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6', {useMongoClient: true});

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});

app.use(function(request, response, next){
    if (!request.session.user_id){
        if (request.originalUrl === '/admin/login' || request.originalUrl === '/user') {
            next();
        } else if (request.originalUrl === '/admin/logout'){
            response.status(400).send('No user logged in');
            //return;
        } else {
            response.status(401).send('Unauthorized, require user login');
            //return;
        }
    } else {
        next();
    }
    
});

app.post('/admin/login', function(request, response) {
    if (request.session.user_id) {
        User.findOne({_id: request.session.user_id}, function(err, user) {
            if (!err && user) {
                response.status(200).send(JSON.stringify(user));
            } else {
                response.status(400).send(JSON.stringify('unable to login with body.user_id'));
            }
        });
        
    } else if (request.body.login_name) {
        var login_name = request.body.login_name.toLowerCase();
        var password = request.body.password;
        User.findOne({login_name: login_name}, function(err, user) {
            if (err) {
                response.status(400).send('Could not find user: ' + login_name + ', error: ' + err.toString());
                return;
            }
            if (!user) {
                response.status(400).send('Login name does not exist');
                return;
            }
            if (cs142password.doesPasswordMatch(user.password_digest, user.salt, password)) {
                request.session.user_id = user._id;
                request.session.login_name = user.login_name;
                response.status(200).send(JSON.stringify(user));
            } else {
                response.status(400).send('Wrong password');
            }
            
        });
    } else {
        response.status(400).send('Not logged in');
    }
});

app.post('/admin/logout', function(request, response) {
    request.session.destroy(function(err) {
        if (err) {
            response.status(400).send(JSON.stringify('Unable to logout and destroy session: ' + err.toString()));
        } else {
            response.status(200).send('Logged out!');
        }
    });
});

/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function (request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
});

app.post('/user', function(request, response) {
    console.log(request.body);
    var login_name = request.body.login_name.toLowerCase();
    var password = request.body.password;
    var first_name = request.body.first_name;
    var last_name = request.body.last_name;
    var location = request.body.location;
    var description = request.body.description;
    var occupation = request.body.occupation;
    
    if (login_name === '' || password === '' || first_name === '' || last_name === '') {
        response.status(400).send('Empty login name, password, first name, or last name');
        return;
    }
    User.findOne({login_name: login_name}, function(err, userObj) {
        if (!err && userObj) {
            response.status(400).send('Login name is taken.');
            return;
        }
        var passwordEntry = cs142password.makePasswordEntry(password);
        User.create({login_name: login_name, password_digest: passwordEntry.hash, salt: passwordEntry.salt, first_name: first_name, last_name: last_name, location: location, description: description, occupation: occupation}, function(err, newUserObj) {
            if (err) {
                response.status(400).send('Unable to create user: ' + login_name + ', error:' + err.toString());
                return;
            }
            console.log('Create new user: ' + login_name);
            response.status(200).send(JSON.stringify(newUserObj));
        });
    });
});

/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function (request, response) {
    User.find({}, '_id first_name last_name login_name', function(err, users) {
        if(!err && users) {
            response.status(200).send(JSON.stringify(users));
        } else {
            console.log('Users not found.');
            response.status(400).send('Not found');
        }
    });
});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
    var id = request.params.id;
    User.findOne({_id: id}, '_id first_name last_name location description occupation', function(err, user) {
        if(!err && user) {
            response.status(200).send(JSON.stringify(user));
        } else {
            console.log('User with _id:' + id + ' not found.');
            response.status(400).send('Not found');
        }
        
    });
    
    //if (user === null) {
    //    console.log('User with _id:' + id + ' not found.');
    //    response.status(400).send('Not found');
    //    return;
    //}
    //response.status(200).send(user);
});

/*
 * URL /mentionsOfUser/:id - Return all mentions of User(id)
 */
app.get('/mentionsOfUser/:id', function(request, response) {
    var id = request.params.id;
    console.log('getting mentions of user id', id);
    
    User.findOne({'_id': mongoose.Types.ObjectId(id)}, 'login_name', function(err, mUserObj) {
        if (err || !mUserObj) {
            response.status(400).send('unable to find mentioned user get mentions');
            return;
        }
        var mUser = JSON.parse(JSON.stringify(mUserObj));
    
        Photo.find({'mentions': {$all: [mUser.login_name]}}, '_id file_name user_id', function(err, photosObj) {
            if (err || !photosObj) {
                response.status(400).send(JSON.stringify(err));
                return;
            }
            var photos = JSON.parse(JSON.stringify(photosObj));
            async.each(photos, function(photo, doneCallback) {
                User.findOne({'_id': mongoose.Types.ObjectId(photo.user_id)}, '_id first_name last_name', function(err, userObj) {
                    if (err || !userObj) {
                        response.status(400).send('unable to find photo owner user in get mentions');
                    } else {
                        var user = JSON.parse(JSON.stringify(userObj));
                        photo.owner = user;
                        delete photo.user_id;
                        doneCallback();
                    }
                });
            }, function(err) {
                if (err) {
                    response.status(400).send(JSON.stringify(err));
                } else {
                    response.status(200).send(JSON.stringify(photos));
                }
            });
            
        });
    });
});
 
/*
 * URL /mention - add a mention
 */
app.post('/mention', function(request, response) {
    //var user_id = request.body.user_id;
    var login_name = request.body.login_name;
    var photo_id = request.body.photo_id;
    console.log('adding mention to', photo_id);
    User.findOne({login_name: login_name}, function(err, userObj) {
        if (err || !userObj) {
            response.status(400).send('invalid login name for adding mention');
            return;
        }
        Photo.findOne({'_id': mongoose.Types.ObjectId(photo_id)}, function(err, photoObj) {
            if (err || !photoObj) {
                response.status(400).send('unable to get photo in adding mention');
                return;
            }
            var photo = JSON.parse(JSON.stringify(photoObj));
            if (photo.mentions.indexOf(login_name) === -1) {
                console.log('login name not found, will add');
                photoObj.mentions.push(login_name);
                photoObj.save(function(err) {
                    if (err) {
                        response.status(400).send('unable to add mention');
                    } else {
                        response.status(200).send('added mention');
                    }
                });
            }
        });
    });
});

/*
 * URL /favoritesOfUser - Return the favorite Photos for logged in User
 */
app.get('/favoritesOfUser', function(request, response) {
    var id = mongoose.Types.ObjectId(request.session.user_id);
    User.findOne({_id: id}, 'favorites', function(err, userObj) {
        if (err || !userObj) {
            response.status(400).send('unable find user in getting favs');
            return;
        }
        Photo.find({'_id': {$in: userObj.favorites}}, '_id file_name date_time', function(err, photosObj) {
            if (err || !photosObj) {
                response.status(400).send('unable to get favorites');
            } else {
                response.status(200).send(JSON.stringify(photosObj));
            }
        });
        /*var favorites = JSON.parse(JSON.stringify(userObj)).favorites;
        userObj.favorites = [];
        async.each(favorites, function(photo_id, doneCallback) {
            
            Photo.findOne({$and: [{_id: mongoose.Types.ObjectId(photo_id)}, {$or: [{'restricted': false}, {'user_id': mongoose.Types.ObjectId(request.session.user_id)}, {'sharing_list': {$all:[mongoose.Types.ObjectId(request.session.user_id)]}}]} ]}, '_id file_name date_time', function(err, photoObj) {
                if (!err || photoObj) {
                    userObj.favorites.push(photoObj);
                }
                doneCallback();    
            });
        }, function(err) {
            if (err) {
                JSON.status(400).send('unable to get favorites');
            } else {
                JSON.status(200).send(JSON.stringify(userObj.favorites));
            }
            
        });*/
        
    });
});

/*
 * URL /favorite - delete/add favorite photo for logged in user
 */
app.post('/favorite', function(request, response) {
    console.log('photo id', request.body.photo_id);
    User.findOne({_id:  mongoose.Types.ObjectId(request.session.user_id)}, 'favorites', function(err, userObj) {
        if (err || !userObj) {
            response.status(400).send('unable to find user in delete/add fav');
            return;
        }
        console.log(userObj.favorites);
        var favoriteIndex = -1;
        var photo_id =  request.body.photo_id;
        var user = JSON.parse(JSON.stringify(userObj));
        for (var i = 0; i < user.favorites.length; i++) {
            console.log(user.favorites[i], photo_id);
            if (user.favorites[i] === photo_id) {
                console.log('found');
                favoriteIndex = i;
                break;
            }        
        }
        if (favoriteIndex === -1) {
            userObj.favorites.push(photo_id);
            console.log('adding');
        } else {
            userObj.favorites.splice(favoriteIndex,1);
            console.log('removing');
        }
        userObj.save(function(err) {
            if (err) {
                response.status(400).send('unable to delete/add fav');
            } else {
                console.log('deleled/added fav');
                console.log(userObj.favorites);
                response.status(200).send('deleted/added fav');
            }
        });
        
        
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function (request, response) {
    var id = request.params.id;
    var photoSearchObj = {user_id: id};
    if (request.query.photoId) {
        photoSearchObj._id = request.query.photoId;
    }
        
    //var photos = cs142models.photoOfUserModel(id);
    Photo.find(photoSearchObj, '_id user_id comments file_name date_time restricted sharing_list tags', function(err, photosObject) {
        if(err || !photosObject) {
            console.log('Photos for user with _id:' + id + ' not found.');
            response.status(400).send('Photos not found');
        } else {
            var photos = JSON.parse(JSON.stringify(photosObject));
            var visible_photos = photos.filter(function(photo) {
                return !photo.restricted || (photo.user_id === request.session.user_id || photo.sharing_list.includes(request.session.user_id));
            });
            async.each(visible_photos, function(photo, donePhotoCallback) {
                var comments = photo.comments;
                async.each(comments, function(comment, doneCommentCallback) {
                    User.findOne({_id: comment.user_id}, '_id first_name last_name', function(userCommentErr, user) {
                        if(userCommentErr) {
                            response.status(400).send(JSON.stringify(userCommentErr));
                        } else {
                            delete comment.user_id;
                            comment.user = JSON.parse(JSON.stringify(user));
                            doneCommentCallback();
                        }
                        
                        
                    });
                }, function(commentsErr) {
                    if(commentsErr) {
                        response.status(500).send(JSON.stringify(commentsErr));
                    } else {
                        for(var i = 0; i < photo.comments.length; i++){
                            photo.comments[i] = comments[i];
                        }
                        
                        donePhotoCallback();
                    }
                });
            }, function(photosErr) {
                if(photosErr) {
                    response.status(500).send(JSON.stringify(photosErr));
                } else {
                    response.status(200).send(JSON.stringify(visible_photos));
                }
            });
        }
    });
    
        
    //if (photos.length === 0) {
    //    console.log('Photos for user with _id:' + id + ' not found.');
    //    response.status(400).send('Not found');
     //   return;
    //}
    //response.status(200).send(photos);
});

app.post('/photos/new', function(request, response) {
    
    processFormBody(request, response, function(err) {
        if (err || !request.file) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var timestamp = new Date().valueOf();
        var filename = 'U' + String(timestamp) + request.file.originalname;
        console.log(request.body.restricted);
        console.log(request.body.sharing_list);
        var uploadForm = {restricted: request.body.restricted === 'true', sharing_list: request.body.sharing_list ? request.body.sharing_list.split(',') : [] };
        //var uploadForm = JSON.parse(request.body.uploadForm);
        console.log(uploadForm);
        
        fs.writeFile('./images/' + filename, request.file.buffer, function(err) {
            if (err) {
                response.status(400).send(JSON.stringify(err));
                return;
            }
            Photo.create({file_name: filename, date_time: timestamp, user_id: request.session.user_id, restricted: uploadForm.restricted, sharing_list: uploadForm.sharing_list}, function(err, photoObj) {
                if (!err && photoObj) {
                    console.log('Uploaded photo with id ', photoObj._id);
                    console.log(photoObj.restricted);
                    console.log(photoObj.sharing_list);
                    response.status(200).send('uploaded photo');
                    //response.status(200).send(JSON.stringify(photoObj));
                } else {
                    response.status(400).send('unable to create photo');
                    //response.status(400).send(JSON.stringify(err));
                }
            });
        });
    });
});

/*
 * URL /tagsOfPhoto/:photo_id - add/remove tag to Photo(id)
 */
app.post('/tagsOfPhoto/:photo_id', function(request, response) {
    var photo_id = request.params.photo_id;
    Photo.findOne({'_id': mongoose.Types.ObjectId(photo_id)}, function(err, photoObj) {
        if (err || !photoObj) {
            response.status(400).send('unable to find photo with id');
            return;
        }
        var tagObj = {x: request.body.x, 
            y: request.body.y, 
            width: request.body.width, 
            height: request.body.height, 
            user_id: mongoose.Types.ObjectId(request.body.user_id),
            user_name: request.body.user_name
        };
        var tagIndex = -1;
        for (var i = 0; i < photoObj.tags.length; i++) {
            if (photoObj.tags[i].x === tagObj.x &&
            photoObj.tags[i].y === tagObj.y &&
            photoObj.tags[i].width === tagObj.width &&
            photoObj.tags[i].height === tagObj.height &&
            photoObj.tags[i].user_id === tagObj.user_id &&
            photoObj.tags[i].user_name === tagObj.user_name) {
                tagIndex = i;
                console.log('found tag');
                break;
            }
        }
        if (tagIndex === -1) {
            photoObj.tags.push(tagObj);
            console.log('adding tag');
        } else {
            photoObj.tags.splice(tagIndex, 1);
            console.log('removing tag');
        }
        photoObj.save(function(err) {
            if (err) {
                response.status(400).send('unable to ' + tagIndex === -1 ? 'add': 'remove' + ' tag');
            } else {
               response.status(200).send(tagIndex === -1 ? 'added': 'removed'  + ' tag');
            }
        });
           
    });
});



app.get('/commentsOfUser/:id', function(request, response) {
    var id = request.params.id;
    Photo.aggregate([{$unwind: '$comments'}, 
        {$match: {'comments.user_id': mongoose.Types.ObjectId(id)}},
        {$match: {$or: [{'restricted': false}, {'user_id': mongoose.Types.ObjectId(request.session.user_id)}, {'sharing_list': {$all:[mongoose.Types.ObjectId(request.session.user_id)]}}]}}
    ], function(userCmtErr, photosObj) {
        if (userCmtErr) {
            response.status(400).send(JSON.stringify(userCmtErr));
        } else {
            //var photos = JSON.parse(JSON.stringify(photosObj));
            //var visible_photos = photos.filter(function(photo) {
            //    return !photo.restricted || (photo.user_id === request.session.user_id || photo.sharing_list.includes(request.session.user_id));
            //});
            response.status(200).send(JSON.stringify(photosObj));
        }
    });
});

/*
 * URL /commentsOfPhoto/:photo_id - add comment to Photo(id)
 */
app.post('/commentsOfPhoto/:photo_id', function(request, response) {
    if (request.body.comment === '') {
        response.status(400).send('Empty comment not allowed!');
        return;
    }
    User.findOne({_id: request.session.user_id}, '_id first_name last_name', function(err, user) {
        if (!err && user) {
            Photo.findOne({_id: request.params.photo_id}, function(err, photo) {
                if (!err && photo) {
                    var commentObj = {user_id: mongoose.Types.ObjectId(request.session.user_id), date_time: new Date(), comment: request.body.comment};
                    photo.comments.push(commentObj);
                    photo.save(function(err) {
                        if (err) {
                            response.status(400).send(JSON.stringify(err));
                        } else {
                            commentObj.user = user;
                            delete commentObj.user_id;
                            response.status(200).send(JSON.stringify(commentObj));
                        }
                    });
                } else {
                    response.status(400).send(JSON.stringify(err));
                }
            });
        } else {
            response.status(400).send(JSON.stringify(err));
        }
    });
});

app.get('/user/advanced/list', function(request, response) {
    User.find({}, '_id first_name last_name login_name', function(err, usersObj) {
        if (err || !usersObj) {
            console.log('Users not found.');
            response.status(400).send('Not found');
            return;
        }
        var users = JSON.parse(JSON.stringify(usersObj));
        async.each(users, function(user, doneUserCallback) {
            Photo.aggregate([{$match: {'user_id': mongoose.Types.ObjectId(user._id)}},
                {$match: {$or: [{'restricted': false}, {'user_id': mongoose.Types.ObjectId(request.session.user_id)}, {'sharing_list': {$all:[mongoose.Types.ObjectId(request.session.user_id)]}}]}},
                {$group: {_id: 'photo_result', photo_count: {$sum: 1}}}
            ], function(err, photo_result) {
                if (err || !photo_result) {
                    response.status(400).send(JSON.stringify('photo count err ' + user.first_name));
                    //response.status(400).send(JSON.stringify(photoCountErr));
                } else {
                    user.photo_count = photo_result[0] ? photo_result[0].photo_count : 0;
                    Photo.aggregate([ {$unwind: '$comments'},
                        {$match: {'comments.user_id': mongoose.Types.ObjectId(user._id)}},
                        {$match: {$or: [{'restricted': false}, {'user_id': mongoose.Types.ObjectId(request.session.user_id)}, {'sharing_list': {$all:[mongoose.Types.ObjectId(request.session.user_id)]}}]}},
                        {$group: {_id: 'comment_result', comment_count: {$sum: 1}}}
                    ], function(err, comment_result) {
                        if (err || !comment_result) {
                            //response.status(400).send(JSON.stringify(err));
                            response.status(400).send(JSON.stringify('cmt count err'));
                        } else {
                            console.log(comment_result);
                            user.comment_count = comment_result[0] ? comment_result[0].comment_count : 0;
                            //response.status(200).send(JSON.stringify(result));
                            doneUserCallback();
                        }
                        
                    });
                    
                }
            });
        }, function(err) {
            if (err) {
                //response.status(400).send(JSON.stringify(err));
                response.status(400).send(JSON.stringify('users err'));
            } else {
                response.status(200).send(JSON.stringify(users));
            }
        });
            
        
    });
    
});

var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});

