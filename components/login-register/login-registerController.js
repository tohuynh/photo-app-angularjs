'use strict';

cs142App.controller('LoginRegisterController', ['$scope', '$resource', '$location', '$rootScope','$mdDialog', function ($scope, $resource, $location, $rootScope, $mdDialog) {

    $scope.loginForm = {};
    $scope.registerForm = {};
    $scope.registerMe = false;
    $scope.loginSubmit = function() {
        var login = $resource('/admin/login');
        login.save({login_name: $scope.loginForm.login_name, password: $scope.loginForm.password}, function(user) {
            $scope.main.loggedIn = user;
            $scope.main.userFirstName = user.first_name;
            $scope.main.user_id = user._id;
            $rootScope.$broadcast('loggedIn');
            $location.path('/users/' + user._id);
            
        }, function errorHandling(err) {
            $mdDialog.show(
			      $mdDialog.alert()
			        .clickOutsideToClose(true)
			        .title('Login Error')
			        .textContent(err.data)
			        .ariaLabel(err.data)
			        .ok('Got it!')
            );
        });
    };
    
    $scope.registerSubmit = function() {
        console.log($scope.registerForm );
        var register = $resource('/user');
        register.save({login_name: $scope.registerForm.login_name, 
            	password: $scope.registerForm.password, 
            	first_name: $scope.registerForm.first_name, 
            	last_name: $scope.registerForm.last_name, 
            	location: $scope.registerForm.location,
            	description: $scope.registerForm.description, 
                occupation: $scope.registerForm.occupation
        }, function() {
            $scope.loginForm.login_name = $scope.registerForm.login_name;
            $scope.loginForm.password = $scope.registerForm.password;
            $scope.registerMe = false;
            $scope.registerForm = {};
            $scope.loginSubmit();
        }, function(err) {
            $mdDialog.show(
			      $mdDialog.alert()
			        .clickOutsideToClose(true)
			        .title('Registration Error')
			        .textContent(err.data)
			        .ariaLabel(err.data)
			        .ok('Got it!')
            );
        });
    };

}]);

(function() {

    cs142App.directive('compareTo', compareTo);

    compareTo.$inject = [];

    function compareTo() {

        return {
            require: "ngModel",
            scope: {
                compareTolValue: "=compareTo"
            },
            link: function(scope, element, attributes, ngModel) {
                ngModel.$validators.compareTo = function(modelValue) {
                    return modelValue === scope.compareTolValue;
                };

                scope.$watch("compareTolValue", function() {
                    ngModel.$validate();
                });
            }
        };
    }
})();