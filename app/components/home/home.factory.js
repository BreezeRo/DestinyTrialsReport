(function () {
  'use strict';

  angular
    .module('trialsReportApp')
    .factory('homeFactory', homeFactory);

  function homeFactory(bungie, inventoryService, playerFactory, $q, statsFactory, toastr) {
    var searchByName = function (platform, name) {
      return bungie.searchForPlayer(
        platform,
        name
      ).then(function (result) {
          var response;
          if (result && result.data && result.data.Response) {
            response = result.data.Response[0];
            return response;
          } else {
            toastr.error('Player not found', 'Error');
          }
        });
    };

    var getAccount = function (platform, name) {
      return searchByName(platform, name)
        .then(function (result) {
          if (result) {
            return getCharacters(result.membershipType, result.membershipId, result.displayName);
          }
        });
    };

    var getCharacters = function (membershipType, membershipId, name) {
      return bungie.getAccount(
        membershipType,
        membershipId
      ).then(function (resultChar) {
          if (resultChar && resultChar.data && resultChar.data.Response) {
            return playerFactory.build(
              resultChar.data.Response.data,
              name,
              resultChar.data.Response.data.characters[0]);
          } else {
            toastr.error('Player not found', 'Error');
          }
        }).catch(function () {
        });
    };

    var getRecentActivity = function (account) {
      return bungie.getActivityHistory(
        account.membershipType,
        account.membershipId,
        account.characterInfo.characterId,
        '14',
        '1'
      ).then(function (result) {
          if (result && result.data && result.data.Response && result.data.Response.data && result.data.Response.data.activities) {
            var activities = result.data.Response.data.activities;
            activities.displayName = account.name;
            return activities;
          } else {
            toastr.error('No Trials matches found for player', 'Error');
            return account;
          }
        });
    };

    var getActivities = function (account, count) {
      var aCount = count > 0 ? count : '25';
      return bungie.getActivityHistory(
        account.membershipType,
        account.membershipId,
        account.characterInfo.characterId,
        '14',
        aCount
      ).then(function (result) {
          if (result && result.data && result.data.Response && result.data.Response.data && result.data.Response.data.activities) {
            var activities = result.data.Response.data.activities;
            return setActivityData(account, activities);
          } else {
            toastr.error('No Trials matches found for player', 'Error');
            return account;
          }
        });
    };

    function setLastThreeMatches(lastThree, activities) {
      for (var l = 0; l < 3; l++) {
        if (activities[l]) {
          lastThree[activities[l].activityDetails.instanceId] = {
            'id': activities[l].activityDetails.instanceId,
            'standing': activities[l].values.standing.basic.value
          };
        }
      }
    }

    function setActivityData(account, activities) {
      var lastThree = {},
        reversedAct = activities.slice().reverse(),
        pastActivities = [],
        streak = 0;
      var recentActivity = {
        'id': activities[0].activityDetails.instanceId,
        'standing': activities[0].values.standing.basic.value
      };
      streak = returnStreak(reversedAct, pastActivities, streak, recentActivity);
      setLastThreeMatches(lastThree, activities);
      account.activities = {
        lastTwentyFive: pastActivities,
        recentActivity: recentActivity,
        streak: streak,
        lastThree: lastThree
      };

      return account;
    }

    var playerStatsInParallel = function (player) {
        var methods = [
          inventoryService.getInventory(player.membershipType, player),
          statsFactory.getStats(player)
        ];

        return $q.all(methods);
      },
      setPlayerStats = function (result) {
        var dfd = $q.defer();
        var player = result[0];
        dfd.resolve(player);
        return dfd.promise;
      },
      reportProblems = function (fault) {
        console.log(String(fault));
      };


    var refreshInventory = function (player) {
      return playerStatsInParallel(player)
        .then(setPlayerStats)
        .catch(reportProblems);
    };


    return {
      searchByName: searchByName,
      getAccount: getAccount,
      getRecentActivity: getRecentActivity,
      getCharacters: getCharacters,
      getActivities: getActivities,
      refreshInventory: refreshInventory
    };
  }
})();
