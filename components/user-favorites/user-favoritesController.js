'use strict';
cs142App.controller('UserFavoritesController', ['$scope', '$resource', '$mdDialog', '$routeParams', function($scope, $resource, $mdDialog, $routeParams) {
    console.log('UserFavorites of ', $scope.main.loggedIn._id);
        
    var Photos = $resource('/favoritesOfUser', undefined, {'get': {method: 'GET', isArray: true}});
    Photos.get({}, function(photos) {
        $scope.photos = photos;
        $scope.main.title = 'Favorites photos of ' + $scope.main.loggedIn.first_name + ' ' + $scope.main.loggedIn.last_name;
    });
    
    $scope.showImgModal = function(ev, photo) {
        $mdDialog.show({
            clickOutsideToClose: true,
            controller: function(photo) {
                var vm = this;
                vm.photo = photo;
            },
            controllerAs: 'modal',
            templateUrl: '/components/user-favorites/img-modalTemplate.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            locals: {
                photo: photo
            }
        });
    };
    
    $scope.toggleFavorite = function(photo) {
        var toggleFavorite = $resource('/favorite');
        toggleFavorite.save({photo_id: photo._id}, function(success) {
            var favoriteIndex = -1;
            for (var i = 0; i < $scope.photos.length; i++) {
                if ($scope.photos[i]._id === photo._id) {
                    favoriteIndex = i;
                    break;
                }
            }
            if (favoriteIndex > -1) {
               $scope.photos.splice(favoriteIndex, 1);
               var index = $scope.main.loggedIn.favorites.indexOf(photo._id);
               $scope.main.loggedIn.favorites.splice(index,1);
            }
            //console.log('removed fav');
            //console.log($scope.photos);
        }, function(err) {
            console.error('unable to remove fav');
        });
    };
}]);