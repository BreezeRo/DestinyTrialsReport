'use strict';

angular.module('trialsReportApp')
  .controller('MainCtrl', function ($scope, $http, $routeParams, currentAccount, trialsStats, inventoryStats, $cookies, requestUrl, bungieStatus, $q, $log) {
    $scope.status = bungieStatus;
    $scope.medalDefinitions = medalDefinitions;
    $scope.weaponItems = weaponItems;
    if (angular.isUndefined($cookies.get('platform'))) {
      $scope.platformValue = true;
      $scope.platform = 2;
    } else {
      $scope.platform = $cookies.get('platform');
      $scope.platformValue = ($scope.platform === '2');
    }

    var loadFireteam = function ($scope, teamMember, index, currentAccount, trialsStats, inventoryStats, $q, $log) {
      var setMember = function (teamMember, index) {
          $scope.fireteam[index] = teamMember;
          var dfd = $q.defer();
          dfd.resolve($scope.fireteam[index]);

          return dfd.promise;
        },
        parallelLoad = function (player) {
          return $q.all([
            currentAccount.getActivities(player),
            inventoryStats.getInventory($scope, player.membershipType, player.membershipId,
              player.characterId, index, $q, $log),
            trialsStats.getData(player.membershipType, player.membershipId, player.characterId)
          ])
            .then($q.spread(function (activity, inv, stats) {
              if (angular.isUndefined(activity)) {
                $scope.fireteam[index] = player;
              } else {
                $scope.fireteam[index] = activity;
              }
              $scope.fireteam[index].stats = stats;
              $http({
                method: 'GET',
                url: requestUrl.url + 'Destiny/Vanguard/Grimoire/' + player.membershipType + '/' + player.membershipId + '/?single=401030'
              }).then(function (result) {
                $scope.fireteam[index].lighthouse = (result.data.Response.data.cardCollection.length > 0);
              });
            }));
        },
        reportProblems = function (fault) {
          $log.error(String(fault));
        };
      setMember(teamMember, index)
        .then(parallelLoad)
        .catch(reportProblems);
    };

    var searchFireteam = function ($scope, name, index, currentAccount, trialsStats, inventoryStats, $q, $log, getRecent, platform) {

      var setMember = function (name, index, platform) {
          return currentAccount.getAccount(name, platform)
            .then(function (player) {
              $scope.fireteam[index] = player;
              return player;
            });
        },
        parallelLoad = function (player) {
          var methods = [
            currentAccount.getActivities(player),
            inventoryStats.getInventory($scope, player.membershipType, player.membershipId,
              player.characterId, index, $q, $log),
            trialsStats.getData(player.membershipType, player.membershipId, player.characterId),
          ];
          return $q.all(methods)
            .then($q.spread(function (activity, inv, stats) {

              if (angular.isUndefined(activity)) {
                $scope.fireteam[index] = player;
              } else {
                $scope.fireteam[index] = activity;
              }

              if (getRecent) {
                currentAccount.getFireteam(player.recentActivity, player.name).then(function (result) {
                  $scope.fireteam[0].medals = result.medals;
                  $scope.fireteam[0].playerWeapons = result.playerWeapons;
                  $scope.fireteam[1] = result.fireTeam[0];
                  $scope.fireteam[2] = result.fireTeam[1];
                  loadFireteam($scope, $scope.fireteam[1], 1, currentAccount, trialsStats, inventoryStats, $q, $log, $http);
                  loadFireteam($scope, $scope.fireteam[2], 2, currentAccount, trialsStats, inventoryStats, $q, $log, $http);
                });
              }else {
                currentAccount.getMatchSummary(player.recentActivity, player.name, false).then(function (result) {
                  $scope.fireteam[index].medals = result[0].medals;
                  $scope.fireteam[index].playerWeapons = result[0].playerWeapons;
                });
              }

              $scope.fireteam[index].stats = stats;
              $http({
                method: 'GET', url: requestUrl.url + 'Destiny/Vanguard/Grimoire/' +
                $scope.fireteam[index].membershipType + '/' + $scope.fireteam[index].membershipId + '/?single=401030'
              }).then(function (result) {
                $scope.fireteam[index].lighthouse = (result.data.Response.data.cardCollection.length > 0);
              });
            })
          );
        },

        reportProblems = function (fault) {
          $log.error(String(fault));
        };

      setMember(name, index, platform)
        .then(parallelLoad)
        .catch(reportProblems);
    };

    $scope.searchPlayerbyName = function (name, platform) {
      if (!angular.isUndefined(name)) {
        var platformValue = 1;
        if (platform) {
          platformValue = 2;
        }
        $cookies.put('platform', platformValue);

        searchFireteam($scope, name, 0, currentAccount, trialsStats, inventoryStats, $q, $log, true, platformValue);
      }
    };

    $scope.getPlayerbyName = function (name, index) {
      if (!angular.isUndefined(name)) {
        searchFireteam($scope, name, index, currentAccount, trialsStats, inventoryStats, $q, $log, false, $scope.platform);
      }
    };

    $scope.getRecentPlayer = function (player, index) {
      loadFireteam($scope, player, index, currentAccount, trialsStats, inventoryStats, $q, $log);
    };

    function getPlayersFromGame($scope, activity) {
      var path = requestUrl.url;
      return $http({
        method: 'GET',
        url: path + 'Destiny/Stats/PostGameCarnageReport/' + activity.id
      }).then(function (result) {
        var fireteamIndex = [];
        var recents = {};
        if (activity.standing === 0) {
          fireteamIndex = [0, 1, 2];
        } else {
          fireteamIndex = [3, 4, 5];
        }
        angular.forEach(fireteamIndex, function (idx) {
          var member = result.data.Response.data.entries[idx];
          var player = member.player;
          if (angular.lowercase(player.destinyUserInfo.displayName) !== angular.lowercase($scope.fireteam[0].name)) {
            recents[member.player.destinyUserInfo.displayName] = {
              name: member.player.destinyUserInfo.displayName,
              membershipId: member.player.destinyUserInfo.membershipId,
              membershipType: member.player.destinyUserInfo.membershipType,
              emblem: 'http://www.bungie.net/' + member.player.destinyUserInfo.iconPath,
              characterId: member.characterId,
              level: member.player.characterLevel,
              class: member.player.characterClass
            };
          }
        });
        return recents;
      });
    }

    var getActivitiesFromChar = function ($scope, account, character, currentAccount, trialsStats, inventoryStats, $q, $log) {

      var setRecentActivities = function (account, character) {
          return currentAccount.getLastTwentyOne(account, character)
            .then(function (activities) {
              return activities;
            });
        },

        setRecentPlayers = function (activities) {
          angular.forEach(activities, function (activity) {
            getPlayersFromGame($scope, activity).then(function (result) {
              $scope.recentPlayers = angular.extend($scope.recentPlayers, result);
            });
          });
        },

        reportProblems = function (fault) {
          $log.error(String(fault));
        };

      setRecentActivities(account, character)
        .then(setRecentPlayers)
        .catch(reportProblems);
    };

    $scope.suggestRecentPlayers = function () {
      $scope.recentPlayers = {};
      angular.forEach($scope.fireteam[0].allCharacters, function (character) {
        getActivitiesFromChar($scope, $scope.fireteam[0], character, currentAccount, trialsStats, inventoryStats, $q, $log);
      });
    };


    if ($cookies.get('teammate1') !== 'undefined') {
      $scope.fireteam = [];
      $scope.fireteam[0] = null;
      $scope.getPlayerbyName($cookies.get('teammate1'), 0);
    }

    if ($cookies.get('teammate2') !== 'undefined') {
      $scope.fireteam[1] = null;
      $scope.getPlayerbyName($cookies.get('teammate2'), 1);
    }

    if ($cookies.get('teammate3') !== 'undefined') {
      $scope.fireteam[2] = null;
      $scope.getPlayerbyName($cookies.get('teammate3'), 2);
    }

    $scope.$watch('fireteam[0].name', function (newval) {
      if (newval) {
        $cookies.put('teammate1', newval);
      }
    }, true);

    $scope.$watch('fireteam[1].name', function (newval) {
      if (newval) {
        $cookies.put('teammate2', newval);
      }
    }, true);
    $scope.$watch('fireteam[2].name', function (newval) {
      if (newval) {
        $cookies.put('teammate3', newval);
      }
    }, true);
  });
