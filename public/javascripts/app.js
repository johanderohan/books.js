var bApp = angular.module('booksApp',['ngRoute'])

// configure our routes
.config(function($routeProvider) {
  
  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : 'templates/index.html',
      controller  : 'mainController'
    });
    
})

.controller('mainController', function($scope,$location,$http) {
  
  $scope.books = window.booksData;

});
