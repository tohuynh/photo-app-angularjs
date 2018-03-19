'use strict';

cs142App.controller('UserListController', ['$scope', '$resource',
    function ($scope, $resource) {
        

        //console.log('window.cs142models.userListModel()', window.cs142models.userListModel());
        
        /*$scope.FetchModel('/user/list', function(response) {
            $scope.$apply(function() {
                $scope.users = response;
                $scope.main.title = 'Users';
            });
        });*/
        //var advanced = $scope.main.advanced ? 'advanced' : '';
        $scope.$on('loggedIn', function() {
            //User logged-in now, TODO: do something here, maybe
            
            var Users = $resource('/user/advanced/list', undefined, {'get': {method: 'GET', isArray: true}});
            Users.get({}, function(users) {
                $scope.main.users = users;
                $scope.main.title = 'Users';
            });
        });
        
        $scope.$on('loggedOut', function() {
            //User logged-in now, TODO: do something here, maybe
            delete $scope.main.users;
        });
    }]);

