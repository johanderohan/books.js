var myApp = angular.module('booksApp',['ngRoute'])

.factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect('http://127.0.0.1:3000');

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

.controller('mainController', function($scope,$rootScope,$http,socket) {
  $scope.active = '';
  $rootScope.isBooks = false;
  $scope.scan = function(){
    $scope.active = 'active';
    $http.post('/scan').success(function(data){
        $rootScope.books = data;
        $scope.active = '';
        if(!data.length) $rootScope.isBooks = true;
        else $rootScope.isBooks = false;
    });
  };

  socket.on('scan', function(data){
        $scope.alert = data;
    });
    
  socket.on('stops', function(){
        $scope.alert = '';
    });

})

.controller('homeController', function($scope,$rootScope,$http) {
  $scope.find = function(){
    $http.get('/api/books').success(function(data){
      $rootScope.books = data;
      if(!data.length) $rootScope.isBooks = true;
      else $rootScope.isBooks = false;
    });
  };
})

.controller('singleController', function($scope,$rootScope,$http,$routeParams) {
  $scope.find = function(){
    $http.get('/books/'+$routeParams.id).success(function(data){
      var year = data.metadata.date.split('-');
      data.metadata.date = year[0];
      $scope.book = data;
    });
  };
});
