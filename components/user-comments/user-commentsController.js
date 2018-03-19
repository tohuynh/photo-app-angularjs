'use strict';

cs142App.controller('UserCommentsController', ['$scope', '$routeParams', '$resource',
  function ($scope, $routeParams, $resource) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    
    var User = $resource('/user/:id');
    User.get({id: userId}, function(user) {
        $scope.user = user;
        $scope.main.title = 'Comments by ' + $scope.user.first_name + ' ' + $scope.user.last_name;
    });
    
    var Photos = $resource('/commentsOfUser/:id', undefined, {'get': {method: 'GET', isArray: true}});
    Photos.get({id: userId}, function(photos) {
        $scope.photos = photos;
    });
  }]);