var myApp = angular.module('booksApp',['ngRoute'])

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

.controller('mainController', function($scope,$rootScope,$http) {
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
