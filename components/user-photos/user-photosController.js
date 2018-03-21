'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$routeParams', '$sce', '$resource', 'mentioUtil',
  function($scope, $routeParams, $sce, $resource, mentioUtil) {
    /*
     * Since the route is specified as '/photos/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    console.log('UserPhoto of ', $routeParams.userId);
    $scope.users = [];
    
    $scope.renderHtml = function(input){
        return $sce.trustAsHtml(input);
    };
    
    $scope.getPhotos = function() {
        var User = $resource('/user/:id');
        User.get({id: userId}, function(user) {
            $scope.user = user;
            
            var photoSearchObj = {id: userId};
            if ($routeParams.photoId) {
                photoSearchObj.photoId = $routeParams.photoId;
            }
            
            var Photos = $resource('/photosOfUser/:id', undefined, {'get': {method: 'GET', isArray: true}});
            Photos.get(photoSearchObj, function(photos) {
                $scope.photos = photos;
                var title = $routeParams.photoId ? 'Photo ' + $scope.photos[0].file_name + ' of ' : 'Photos of ';
                $scope.main.title = title + $scope.user.first_name + ' ' + $scope.user.last_name;
            });
            
        });
    };
    
    $scope.getPhotos();
    
    $scope.commentSubmit = function(photo) {
        var mentions = photo.newComment.match(/@\w+/i);
        angular.forEach(mentions, function(mention) {
            var login_name = mention.slice(1);
            $scope.addMention(photo._id, login_name);
        });
        var Comment = $resource('/commentsOfPhoto/' + photo._id);
        
        Comment.save({comment: photo.newComment}, function(comment) {
            console.log('new cmt');
            photo.comments.push(comment);
            delete photo.newComment;
            //photo.newComment = '';
            var loggedInUser = $scope.main.users.find(function(user) {
                return user._id === $scope.main.user_id;
            });
            loggedInUser.comment_count++;
        });
    };
    
    $scope.addMention = function(photo_id, login_name) {
        var addMention = $resource('/mention');
        addMention.save({login_name: login_name, photo_id: photo_id}, function(success) {
            console.log('added mention');
        }, function(err) {
            console.log('unable to add mention');
        });
    };
    
    $scope.isFavorite = function(photo) {
        if ($scope.main.loggedIn) {
            return $scope.main.loggedIn.favorites.includes(photo._id);
        }
        return false;
    };
    
    $scope.toggleFavorite = function(photo) {
        var toggleFavorite = $resource('/favorite');
        toggleFavorite.save({photo_id: photo._id}, function(success) {
            console.log('add fav');
            $scope.main.loggedIn.favorites.push(photo._id);
        }, function(err) {
            console.error('unable to toggle fav');
        });
    };
    
    $scope.selectUser = function(user) {
        //console.log('inside select', user);
        return '@' + user.login_name;
    };
    
    $scope.searchUsers = function(term) {
        //console.log('inside search users', term);
        var users = [];
        angular.forEach($scope.main.users, function(user) {
            if (user.login_name.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                users.push(user);
            }
        });
        $scope.users = users;
    };
    
    $scope.$on('photoUploaded', function() {
        if ($scope.main.loggedIn._id === userId) {
            $scope.getPhotos();
        }
    });
  }]);
