'use strict';

cs142App.controller('PhotoDialogController', ['$scope', '$mdDialog', function($scope, $mdDialog) {
    
    $scope.users = $scope.main.users.filter(function(user) {
        return user._id !== $scope.main.user_id;
    });
    
    $scope.selectAll = function() {
        $mdDialog.cancel();
    };
    
    $scope.selectRestricted = function() {
        var sharing_list = [];
        $scope.users.forEach(function(user) {
            if (user.selected) {
                console.log('selected ' + user.first_name + ' ' + user.last_name);
                sharing_list.push(user._id);
            }
        });
        $mdDialog.hide(sharing_list);
    };
}]);