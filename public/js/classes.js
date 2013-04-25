var Character = function (options) {
  this.self = this;
  this.id = options.id;
  this.sprite = new createjs.BitmapAnimation(spriteSheet);
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.updown = options.updown;
  this.leftright = options.leftright;
  this.facingLeftright = this.leftright;
  this.color = options.color;
  this.characterType = options.characterType;
  this.justAttacked = false;
  this.velocityFactor = .08;
  this.damageRadius = 60;
  this.damageRadiusSquared = this.damageRadius*this.damageRadius;
  this.damageRating = 50;
  this.health = 100;

  stage.addChild(this.sprite);
  stage.update();

  spriteSheet.getAnimation(this.color + 'stand').next = this.color + 'stand';
  spriteSheet.getAnimation(this.color + 'stand_h').next = this.color + 'stand_h';
  spriteSheet.getAnimation(this.color + 'walk').next = this.color + 'walk';
  spriteSheet.getAnimation(this.color + 'walk_h').next = this.color + 'walk_h';
  spriteSheet.getAnimation(this.color + 'attack').next = this.color + 'stand';
  spriteSheet.getAnimation(this.color + 'attack_h').next = this.color + 'stand_h';
  this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

Character.prototype.move = function (deltaTime) {
  if (this.updown == 0 || this.leftright == 0) {
    this.sprite.x += this.leftright * deltaTime * this.velocityFactor;
    this.sprite.y += this.updown * deltaTime * this.velocityFactor;
  }
  else {
    this.sprite.x += this.leftright * deltaTime * this.velocityFactor * 0.70711;
    this.sprite.y += this.updown * deltaTime * this.velocityFactor * 0.70711;
  }
};

Character.prototype.updatePositionAndVelocity = function (characterData) {
  this.sprite.x = characterData.spritex;
  this.sprite.y = characterData.spritey;
  this.updown = 0.9 * characterData.updown;
  this.leftright = 0.9 * characterData.leftright;
  this.facingLeftright = characterData.facingLeftright;
  if (characterData.justAttacked)
    this.handleAttackOn();
  else if (this.updown != 0 || this.leftright != 0)
    this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
  else
    this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

Character.prototype.getAnimationNameFor = function (animationType) {
  if (this.facingLeftright == 1) 
    return this.color + animationType + '_h';
  else 
    return this.color + animationType;
};

Character.prototype.startLeftMotion = function () {
  this.leftright = -1;
  this.facingLeftright = this.leftright;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startRightMotion = function () {
  this.leftright = 1;
  this.facingLeftright = this.leftright;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startUpMotion = function () {
  this.updown = -1;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startDownMotion = function () {
  this.updown = 1;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.stopLeftRightMotion = function () {
  if (this.leftright != 0)
    this.facingLeftright = this.leftright;

  this.leftright = 0;
  if (this.updown != 0)
    this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
  else
    this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

Character.prototype.stopUpDownMotion = function () {
  this.updown = 0;
  if (this.leftright != 0)
    this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
  else
    this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

Character.prototype.handleAttackOn = function (enemyType) {
  this.startAttackMotion();

  var opposingForces = _.where(characters, {characterType: enemyType});

  for (var i = 0; i < opposingForces.length; i++)
  {
    if (opposingForces[i].sprite.x > this.sprite.x + this.damageRadius ||
      opposingForces[i].sprite.x < this.sprite.x - this.damageRadius ||
      opposingForces[i].sprite.y > this.sprite.y + this.damageRadius ||
      opposingForces[i].sprite.y < this.sprite.y - this.damageRadius)
      continue;

    var x = this.sprite.x - opposingForces[i].sprite.x;
    var y = this.sprite.y - opposingForces[i].sprite.y;
    if (x*x + y*y < this.damageRadiusSquared &&
      (opposingForces[i].sprite.x - this.sprite.x) * this.facingLeftright > 0)
      opposingForces[i].takeDamage(this.damageRating);
  }
};

Character.prototype.startAttackMotion = function () {
  this.updown = 0;
  this.leftright = 0;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('attack'));
};

var Player = function (options) {
  Character.call(this, options);
};

Character.prototype.takeDamage = function (damageAmount, attacker) {
  this.health -= damageAmount;

  if (this.health <= 0)
    this.die(attacker);
};

Character.prototype.die = function (attacker) {
  //need to track what has died
  //need to send messages about death

  var self = this;
  characters = _.filter(characters, function (character) { return character.id != self.id; });
};

Player.prototype = Object.create(Character.prototype);

Player.prototype.appendDataToMessage = function (data) {
  if (!data.chars)
    data.chars = [];

  data.chars.push({
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y,
    justAttacked: this.justAttacked
  });

  this.justAttacked = false;
};

var Zombie = function (options) {
  options.color = 'zombie';
  Character.call(this, options);
  this.ownerId = options.ownerId;
  this.targetId = options.targetId;
  this.velocityFactor = .05;
  this.damageRating = 10;
};

Zombie.prototype = Object.create(Character.prototype);

Zombie.prototype.appendDataToMessage = function (data) {
  if (!data.chars)
    data.chars = [];

  data.chars.push({
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y,
    justAttacked: this.justAttacked,
    ownerId: this.ownerId,
    targetId: this.targetId
  });
};

Zombie.prototype.lockOnPlayer = function () {
  var self = this;
  var players = _.where(characters, {characterType: 'player'});
  var playerMaps = _.map(players, function (player) {
    var x = self.sprite.x - player.sprite.x;
    var y = self.sprite.y - player.sprite.y;
    return {id: player.id,
      distanceSquared: x*x + y*y};
  });
  this.targetId = _.min(playerMaps,function (playerMap) {
    return playerMap.distanceSquared;
  }).id;
};

Zombie.prototype.establishDirection = function () {
  var targetPlayer = _.find(characters, {id: this.targetId});

  var absoluteSlope = Math.abs((targetPlayer.sprite.y - this.sprite.y) / (targetPlayer.sprite.x - this.sprite.x));

  var updown = 0;
  var leftright = 0;

  if (absoluteSlope > 0.414)
    updown = 1;

  if (absoluteSlope < 2.414)
    leftright = 1;

  if (targetPlayer.sprite.y < this.sprite.y)
    updown *= -1;

  if (targetPlayer.sprite.x < this.sprite.x)
    leftright *= -1;

  if (this.justAttacked)
  {
    this.handleAttackOn('player');
    return;
  }

  if (leftright != 0)
    this.facingLeftright = leftright;

  if (updown != this.updown || leftright != this.leftright) {
    this.updown = updown;
    this.leftright = leftright;

    if (this.updown != 0 || this.leftright != 0)
      this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    else
      this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
  }
};