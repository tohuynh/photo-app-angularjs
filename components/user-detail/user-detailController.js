'use strict';

cs142App.controller('UserDetailController', ['$scope', '$routeParams', '$resource',
  function ($scope, $routeParams, $resource) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    console.log('UserDetail of ', userId);
    
    var User = $resource('/user/:id');
    User.get({id: userId}, function(user) {
        $scope.user = user;
        $scope.main.title = 'Details of ' + $scope.user.first_name + ' ' + $scope.user.last_name;
    });
    
    var Mentions = $resource('/mentionsOfUser/:id', undefined, {'get': {method: 'GET', isArray: true}});
    Mentions.get({id: userId}, function(mentions) {
        $scope.mentions = mentions;
    });
  }]);
