var GameObjects = (function() {
  'use strict';
  var GLOBAL_VISIBILITY_THRESHOLD = 0.5;

  /** @class GameObject
   * Base class for all objects in the game. This works together with the
   * saving mechanism.
   */
  var GameObject = function(obj) {
    this.state = {};
    $.extend(this, obj);
    if (!this.key) {
      throw 'Error: GameObject has to have a key!';
    }
  };
  GameObject.prototype.loadState =
      function(state) { $.extend(this.state, state); };

  /** @class Lab
   */
  var Workshop = function() {
    GameObject.apply(this, [{
                             key : 'workshop',
                             state : {
                               name : 'Dildopolis',
                               singlePrice : 1,
                               factor : 5,
                              //  data : 0,
                               money : 0,
                               reputation : 0,
                               clicks : 0,
                               moneyCollected : 0,
                               moneySpent : 0,
                              //  dataCollected : 0,
                              //  dataSpent : 0,
                               time: 0
                             }
                           }]);
  };

  Workshop.prototype = Object.create(GameObject.prototype);

  Workshop.prototype.constructor = Workshop;

  // Workshop.prototype.sellStock = function() {
  //   var addition = this.state.reputation * this.state.factor;
  //   this.state.money += addition;
  //   this.state.moneyCollected += addition;
  //   return addition;
  // };

  Workshop.prototype.sellSexToy = function(amount) {
    this.state.money += amount;
    this.state.moneyCollected += amount;
  };

  Workshop.prototype.makeSexToy = function() {
    this.state.clicks += 1;
    this.sellSexToy(this.state.singlePrice);
  };

  Workshop.prototype.research = function(cost, priceIncrease) {
    if (this.state.money >= cost) {
      this.state.money -= cost;
      this.state.moneySpent += cost;
      this.state.singlePrice += priceIncrease;
      return true;
    }
    return false;
  };

  Workshop.prototype.buy = function(cost) {
    if (this.state.money >= cost) {
      this.state.money -= cost;
      this.state.moneySpent += cost;
      return true;
    }
    return false;
  };

  /** @class Research
   */
  var Research = function(obj) {
    GameObject.apply(this, [obj]);
    this.state.level = 0;
    this.state.interesting = false;
  };

  Research.prototype = Object.create(GameObject.prototype);

  Research.prototype.constructor = Research;

  Research.prototype.isVisible = function(workshop) {
    if (!workshop) {
      return false;
    }
    return this.state.level > 0 ||
           workshop.state.clicks >= this.state.clicks * GLOBAL_VISIBILITY_THRESHOLD;
  };

  Research.prototype.isAvailable = function(workshop) {
    if (!workshop) {
      return false;
    }
    return workshop.state.money >= this.state.cost;
  };

  Research.prototype.research = function(workshop) {
    if (workshop && workshop.research(this.state.cost, this.state.priceIncrease)) {
      this.state.level++;
      if (this.state.info_levels.length > 0 &&
          this.state.level === this.state.info_levels[0]) {
        this.state.interesting = true;
        this.state.info_levels.splice(0, 1);
      }
      var old_cost = this.state.cost;
      this.state.cost = Math.floor(this.state.cost * this.cost_increase);
      return old_cost;
    }
    return -1;
  };

  Research.prototype.getInfo = function() {
    if (!this._info) {
      this._info = Helpers.loadFile(this.info);
    }
    this.state.interesting = false;
    return this._info;
  };

  /** @class Building
   * Implement a workspace for auto-clickers in the game.
   */
  var Building = function(obj) {
    GameObject.apply(this, [obj]);
    this.state.built = 0;
  };

  Building.prototype = Object.create(GameObject.prototype);

  Building.prototype.constructor = Building;

  Building.prototype.isVisible = function(workshop) {
    if (!workshop) {
      return false;
    }
    return this.state.built > 0 ||
           workshop.state.money >= this.state.cost * GLOBAL_VISIBILITY_THRESHOLD;
  };

  Building.prototype.isAvailable = function(workshop) {
    if (!workshop) {
      return false;
    }
    return workshop.state.money >= this.state.cost;
  };

  Building.prototype.build = function(workshop) {
    if (workshop && workshop.buy(this.state.cost)) {
      this.state.built++;
      var cost = this.state.cost;
      this.state.cost = Math.floor(cost * this.cost_increase);
      return cost;
    }
    return -1;  // not enough money
  };

  /** @class Worker
   * Implement an auto-clicker in the game.
   */
  var Worker = function(obj) {
    GameObject.apply(this, [obj]);
    this.state.hired = 0;
  };

  Worker.prototype = Object.create(GameObject.prototype);

  Worker.prototype.constructor = Worker;

  Worker.prototype.isVisible = function(workshop) {
    if (!workshop) {
      return false;
    }
    return this.state.hired > 0 ||
           workshop.state.money >= this.state.cost * GLOBAL_VISIBILITY_THRESHOLD;
  };

  Worker.prototype.isAvailable = function(workshop, allObjects) {
    if (!workshop) {
      return false;
    }
    return workshop.state.money >= this.state.cost && this.state.hired < (allObjects[this.housed].state.built * allObjects[this.housed].max);
  };

  Worker.prototype.hire = function(workshop) {
    if (workshop && workshop.buy(this.state.cost)) {
      this.state.hired++;
      var cost = this.state.cost;
      this.state.cost = Math.floor(cost * this.cost_increase);
      return cost;
    }
    return -1;  // not enough money
  };

  Worker.prototype.getTotal =
      function() { return this.state.hired * this.state.rate; };

  /** @class Upgrade
   */
  var Upgrade = function(obj) {
    GameObject.apply(this, [obj]);
    this.state.visible = false;
    this.state.used = false;
  };

  Upgrade.prototype = Object.create(GameObject.prototype);

  Upgrade.prototype.constructor = Upgrade;

  Upgrade.prototype.meetsRequirements = function(allObjects) {
    if (!allObjects) {
      return false;
    }
    for (var i = 0; i < this.requirements.length; i++) {
      var req = this.requirements[i];
      if (allObjects[req.key].state[req.property] < req.threshold) {
        return false;
      }
    }
    return true;
  };

  Upgrade.prototype.isAvailable = function(lab, allObjects) {
    if (!lab || !allObjects) {
      return false;
    }
    return !this.state.used && lab.state.money >= this.cost &&
           this.meetsRequirements(allObjects);
  };

  Upgrade.prototype.isVisible = function(lab, allObjects) {
    if (!lab || !allObjects) {
      return false;
    }
    if (!this.state.used &&
        (this.state.visible ||
         lab.state.money >= this.cost * GLOBAL_VISIBILITY_THRESHOLD &&
             this.meetsRequirements(allObjects))) {
      this._visible = true;
      return true;
    }
    return false;
  };

  Upgrade.prototype.buy = function(lab, allObjects) {
    if (lab && allObjects && !this.state.used && lab.buy(this.cost)) {
      for (var i = 0; i < this.targets.length; i++) {
        var t = this.targets[i];
        allObjects[t.key].state[t.property] *= this.factor || 1;
        allObjects[t.key].state[t.property] += this.constant || 0;
      }
      this.state.used = true;  // How about actually REMOVING used upgrades?
      this.state.visible = false;
      return this.cost;
    }
    return -1;
  };


  /** @class Achievement
   */
  var Achievement = function(obj) {
    GameObject.apply(this, [obj]);
    this.state.timeAchieved = null;
  };

  Achievement.prototype = Object.create(GameObject.prototype);

  Achievement.prototype.validate = function(lab, allObjects, saveTime) {
    if (this.state.timeAchieved) {
      return true;
    }
    if (allObjects.hasOwnProperty(this.targetKey) &&
        allObjects[this.targetKey].state.hasOwnProperty(this.targetProperty) &&
        allObjects[this.targetKey].state[this.targetProperty] >= this.threshold) {
      this.state.timeAchieved = lab.state.time + new Date().getTime() - saveTime;
      UI.showAchievement(this);
      return true;
    }
    return false;
  };

  Achievement.prototype.isAchieved = function() {
    if (this.state.timeAchieved) {
      return true;
    } else {
      return false;
    }
  };


  // Expose classes in module.
  return {
    Workshop: Workshop,
    Research: Research,
    Building: Building,
    Worker: Worker,
    Upgrade: Upgrade,
    Achievement: Achievement
  };
}());
