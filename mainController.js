'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'ngResource', 'ngMessages', 'mentio']);

cs142App.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/login-register', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginRegisterController'
            }).
            /*when('/users', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).*/
            when('/users/:userId', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            when('/comments/:userId', {
                templateUrl: 'components/user-comments/user-commentsTemplate.html',
                controller: 'UserCommentsController'
            }).
            when('/photos/:userId', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/favorites', {
                templateUrl: 'components/user-favorites/user-favoritesTemplate.html',
                controller: 'UserFavoritesController'
            }).
            otherwise({
                redirectTo: '/login-register'
            });
    }]);

cs142App.controller('MainController', ['$scope', '$resource', '$rootScope', '$location', '$http', '$mdDialog',
    function ($scope, $resource, $rootScope, $location, $http, $mdDialog) {
        $scope.main = {};
        $scope.main.users = [];
        $scope.main.author = 'To Huynh';
        $scope.main.title = '';
        $scope.main.advanced = false;
        $scope.main.loggedIn = false;
        $scope.main.userFirstName = '';
        $scope.main.user_id = '';
        
        $scope.getVersion = function() {
            var SchemaInfo = $resource('/test/info');
            SchemaInfo.get({}, function(info) {
                $scope.main.versionNum = 'Version ' + info.version;
            }, function errorHandling(err) {
            });
        };
        $scope.userLogout = function() {
            var logout = $resource('/admin/logout');
            logout.save({}, function() {
                $scope.main.loggedIn = false;
                $rootScope.$broadcast('loggedOut');
                $scope.main.title  = '';
                $scope.main.user_id = '';
                $scope.main.userFirstName = '';
                $location.path('/login-register');
                
            }, function errorHandling(err) {
            });
        };
        
        var selectedPhotoFile;   // Holds the last file selected by the user

        // Called on file selection - we simply save a reference to the file in selectedPhotoFile
        $scope.inputFileNameChanged = function (element) {
            selectedPhotoFile = element.files[0];
            $scope.selectPhotoRestriction();
        };

        // Has the user selected a file?
        $scope.inputFileNameSelected = function () {
            return !!selectedPhotoFile;
        };
        
        $scope.selectPhotoRestriction = function() {
            $mdDialog.show({
                controller: 'PhotoDialogController',
                templateUrl: '/components/photo-dialog/photo-dialogTemplate.html',
                parent: angular.element(document.body),
                scope: $scope.$new()
            })
            .then(function(sharing_list) {
                //restrict
                console.log('dialog hide ' + sharing_list.toString());
                $scope.uploadPhoto(true, sharing_list);
            }, function() {
                //let all see
                console.log('dialog cancel');
                $scope.uploadPhoto(false, []);
            });
        };

        // Upload the photo file selected by the user using a post request to the URL /photos/new
        $scope.uploadPhoto = function (restricted, sharing_list) {
            if (!$scope.inputFileNameSelected()) {
                console.error("uploadPhoto called will no selected file");
                return;
            }
            console.log('fileSubmitted', selectedPhotoFile);

            // Create a DOM form and add the file to it under the name uploadedphoto
            var domForm = new FormData();
            domForm.append('uploadedphoto', selectedPhotoFile);
            console.log(domForm);
            console.log('before');
            console.log({restricted: restricted, sharing_list: sharing_list});
            domForm.append('restricted', restricted);
            domForm.append('sharing_list', sharing_list);
            //domForm.append('uploadForm', {restricted: restricted, sharing_list: sharing_list});
            console.log('main form');
            console.log(domForm);

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function successCallback(response){
                // The photo was successfully uploaded. XXX - Do whatever you want on success.
                console.log('uploaded photo');
                $rootScope.$broadcast('photoUploaded');
                var loggedInUser = $scope.main.users.find(function(user) {
                    return user._id === $scope.main.user_id;
                });
                loggedInUser.photo_count++;
                $location.path("/photos/" + $scope.main.user_id);
            }, function errorCallback(response){
                // Couldn't upload the photo. XXX  - Do whatever you want on failure.
                console.error('ERROR uploading photo', response);
            });

        };
        
        $scope.$on('loggedIn', function() {
            $scope.getVersion();
        });
        
        $scope.$on('loggedOut', function() {
            $scope.main.versionNum = '';
        });
        
        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            if (!$scope.main.loggedIn) {
                var login = $resource('/admin/login');
                login.save({}, function(user) {
                    console.log('saved user from request.session.user_id');
                    //$scope.main.loggedIn = true;
                    $scope.main.loggedIn = user;
                    $scope.main.userFirstName = user.first_name;
                    $scope.main.user_id = user._id;
                    $rootScope.$broadcast('loggedIn');
                }, function errorHandling(err) {
                    console.log('not logged in, send to login page');
                    if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                        $location.path("/login-register");
                    }
                });
            }
        
        });
    }]);
