'use strict';

function setStatPercentage(player, armors) {
  var stat = ['int', 'dis', 'str'];
  for (var s = 0; s < stat.length; s++) {
    player[stat[s]] = armors[stat[s]];
    var cName = stat[s].substring(0,1).toUpperCase() + stat[s].substring(1);
    player[cName] = player[stat[s]] > 270 ? 270 : armors[stat[s]];
    player[stat[s] + 'Percent'] = +(100 * player[cName] / 270).toFixed();
  }
}

angular.module('trialsReportApp')
  .factory('inventoryStats', function ($http, weaponStats, armorStats, classStats, $q) {
    var getData = function (player) {
      return $http({
        method: 'GET',
        url: 'http://api.destinytrialsreport.com/getInventory/' + player.membershipType + '/' + player.membershipId + '/' + player.characterId
      }).then(function (result) {
        return result.data;
      });
    };

    var getInventory = function (membershipType, player) {
      var setInventory = function (membershipType, player) {
          var dfd = $q.defer();
          dfd.resolve(getData(player));

          return dfd.promise;
        },
        inventoryInParallel = function (inventoryItems) {
          var methods = [
            weaponStats.getData(inventoryItems),
            armorStats.getData(inventoryItems),
            classStats.getData(inventoryItems)
          ];
          return $q.all(methods);
        },
        setPlayerInventory = function (results) {
          var dfd = $q.defer();
          var weapons = results[0], armors = results[1], classItems = results[2];
          player.background = classItems.bg;
          player.emblem = classItems.bg[1];
          player.weapons = weapons.weapons;
          player.armors = armors.armors;
          player.classNodes = classItems.classNodes;
          player.class = classItems.subClass;
          setStatPercentage(player, armors);
          if (classItems.blink && weapons.shotgun) {
            player.weapons.hazards.push('Blink Shotgun');
          }
          if (classItems.hasFusionGrenade && armors.hasStarfireProtocolPerk) {
            player.armors.hazards.push('Double Grenade');
          }
          dfd.resolve(player);

          return dfd.promise;
        },
        reportProblems = function (fault) {
          console.log(String(fault));
        };
      return setInventory(membershipType, player)
        .then(inventoryInParallel)
        .then(setPlayerInventory)
        .catch(reportProblems);
    };

    return {
      getData: getData,
      getInventory: getInventory
    };
  });
