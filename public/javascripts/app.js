var myApp = angular.module('booksApp',['ngRoute','ui.bootstrap','angularLazyImg'])

.factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect('http://'+window.server+':3000');

    return {
        on: function (eventName, callback) {
            function wrapper() {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            }

            socket.on(eventName, wrapper);

            return function () {
                socket.removeListener(eventName, wrapper);
            };
        },

        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
}])

// configure our routes
.config(function($routeProvider) {

  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : 'templates/index.html',
      controller  : 'homeController'
    })

    .when('/book/:id', {
      templateUrl : 'templates/single.html',
      controller  : 'singleController'
    });

})

.controller('mainController', function($scope,$rootScope,$http,socket, $location) {
  $scope.active = false;
  $scope.side = '';
  $scope.order = 'autor';
  $rootScope.isBooks = false;
  $rootScope.isHome = true;
  $rootScope.isSearch = false;
  $rootScope.orderID = 0;

  $rootScope.$on('$routeChangeSuccess', function () {
    if($location.path() === '/') { $rootScope.isHome = true; }
    else { $rootScope.isHome = false; }
  });

  $scope.scan = function(){
    $scope.active = true;
    $http.post('/scan').success(function(data){
        $rootScope.books = data;
        $scope.active = false;
        if(!data.length) $rootScope.isBooks = true;
        else $rootScope.isBooks = false;
    });
  };

  $scope.showSearch = function(){
    $rootScope.isSearch = !$rootScope.isSearch;
  };

  $scope.showSide = function(){
    if($scope.side === '') $scope.side = 'open';
    else $scope.side = '';
  };

  $scope.reOrder = function(id){
      if(id === 'autor') $rootScope.orderID = 0;
      if(id === 'title') $rootScope.orderID = 1;
      $scope.order = id;
      $http.post('/api/books/', {order: $scope.order}).success(function(data){
        $rootScope.books = data;
      });
  };

  $scope.emptyTrash = function(){
      $http.delete('/api/trash/').success(function(data){
        $rootScope.books = data;
      });
  };

  $scope.search = function(){
    $http.post('/search',{ search: $scope.searchValue }).success(function(data){
        $rootScope.books = data;
        $location.path('/');
    });
  };

  socket.on('scan', function(data){
        $scope.alert = data;
    });

  socket.on('stops', function(){
        $scope.alert = '';
        $location.path('/');
    });

  //watch books collection for lazyload
  $scope.$watch('books', function() {
      /*setTimeout(function() {
          $('img.lazy').lazyload({
              effect : 'fadeIn',
              threshold : 200
          });
      });*/
    }, true);

  /*$rootScope.$on('$locationChangeSuccess', function () {
      setTimeout(function() {
        $('img.lazy').lazyload({
            effect : 'fadeIn',
            threshold : 200
        });
      },500);
    });*/

})

.controller('homeController', function($scope,$rootScope,$http,socket) {
  $scope.find = function(){
    if(!$rootScope.isSearch) {
      $http.get('/api/books').success(function(data){
        $rootScope.books = data;
        if(!data.length) $rootScope.isBooks = true;
        else $rootScope.isBooks = false;
      });
    }
  };

})

.controller('singleController', function($scope,$rootScope,$http,$routeParams) {
  $scope.find = function(){
    $http.get('/books/'+$routeParams.id).success(function(data){
      if(data.metadata.date){
        var year = data.metadata.date.split('-');
        data.metadata.date = year[0];
      }
      data.metadata.calibreseries_index = parseInt(data.metadata.calibreseries_index);
      data.wordCount = parseInt(data.wordCount/1000);
      $scope.book = data;
    });
  };

  $scope.markRead = function(value) {
    if(typeof value === 'undefined' || !value) {
      $http.post('/api/readed/'+$routeParams.id).success(function(){
        $scope.book.read = true;
      });
    } else {
      $http.delete('/api/readed/'+$routeParams.id).success(function(){
        $scope.book.read = false;
      });
    }
  };

  $scope.markLike = function(value) {
    if(typeof value === 'undefined' || !value) {
      $http.post('/api/liked/'+$routeParams.id).success(function(){
        $scope.book.like = true;
      });
    } else {
      $http.delete('/api/liked/'+$routeParams.id).success(function(){
        $scope.book.like = false;
      });
    }
  };

});
