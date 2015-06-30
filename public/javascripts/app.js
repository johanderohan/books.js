var myApp = angular.module('booksApp',['ngRoute'])

// configure our routes
.config(function($routeProvider) {
  
  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : 'templates/index.html',
      controller  : 'homeController'
    });
    
})

.controller('mainController', function($scope,$rootScope,$http) {
  $scope.active = '';
  $scope.scan = function(){
    $scope.active = 'active';
    $http.post('/scan').success(function(data){
        $rootScope.books = data;
        $scope.active = '';
    });
  };

})
.controller('homeController', function($scope,$rootScope,$http) {
  
  $scope.find = function(){
    $http.get('/api/books').success(function(data){
      $rootScope.books = data;
    });
  };
});
