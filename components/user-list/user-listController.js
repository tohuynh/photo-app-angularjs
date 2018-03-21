'use strict';

cs142App.controller('UserListController', ['$scope', '$resource',
    function ($scope, $resource) {
        console.log('User List');
        $scope.$on('loggedIn', function() {
            var Users = $resource('/user/advanced/list', undefined, {'get': {method: 'GET', isArray: true}});
            Users.get({}, function(users) {
                $scope.main.users = users;
                $scope.main.title = 'Users';
            });
        });
        
        $scope.$on('loggedOut', function() {
            delete $scope.main.users;
        });
    }]);

