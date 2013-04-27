var Character = function (options) {
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
  this.health = options.health;
  this.killedBy = null;
  this.stageBounds = false;

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

  if (!this.stageBounds && (this.sprite.x < 470 && this.sprite.x > 30))
    this.stageBounds = true;

  if (this.stageBounds)
  {
    if (this.sprite.x < 30)
      this.sprite.x = 30;
    else if (this.sprite.x > 470)
      this.sprite.x = 470;
  }

  if (this.sprite.y < 200)
    this.sprite.y = 200;
  else if (this.sprite.y > 420)
    this.sprite.y = 420;
};

Character.prototype.updatePositionAndVelocity = function (characterData) {
  this.sprite.x = characterData.spritex;
  this.sprite.y = characterData.spritey;
  this.updown = 0.9 * characterData.updown;
  this.leftright = 0.9 * characterData.leftright;
  this.facingLeftright = characterData.facingLeftright;
  this.health = characterData.health;
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
    if (x*x + y*y <= this.damageRadiusSquared &&
      (opposingForces[i].sprite.x - this.sprite.x) * this.facingLeftright >= -5)
      opposingForces[i].takeDamage(this.damageRating, this);
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

  if (this.characterType == 'zombie')
  {
    this.damaged = true;
    this.damageTaken += damageAmount;
  }

  if (this.health <= 0)
  {
    deadCharacterIds.push({id: this.id, time: Date.now()});
    if (attacker)
      this.killedBy = attacker.id;
  }

  if (this.id == myId)
    viewModel.health(this.health);
};

Character.prototype.die = function () {
  if (this.killedBy == myId)
    viewModel.awardPoints(50);

  stage.removeChild(this);
  characters = _.filter(characters, function (character) { return character.id != this.id; }, this);
};

Player.prototype = Object.create(Character.prototype);

Player.prototype.appendDataToMessage = function (data) {
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
  this.damaged = false;
  this.damageTaken = 0;
  this.damageRadius = 40;
  this.attemptRadius = 70;
  this.attemptRadiusSquared = this.attemptRadius*this.attemptRadius;
  this.continueAnimation = true;
  this.shouldAttack = false;
  this.lastAttackTime = 0;

  this.sprite.onAnimationEnd = function (instance, name) {
    if (name.indexOf('attack') != -1)
      instance.continueAnimation = true;
  }
};

Zombie.prototype = Object.create(Character.prototype);

Zombie.prototype.appendDataToMessage = function (data) {
  data.chars.push({
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y,
    justAttacked: this.justAttacked,
    ownerId: this.ownerId,
    targetId: this.targetId,
    health: this.health
  });

  this.justAttacked = false;
};

Zombie.prototype.lockOnPlayer = function () {
  var players = _.where(characters, {characterType: 'player'});
  var playerMaps = _.map(players, function (player) {
    var x = this.sprite.x - player.sprite.x;
    var y = this.sprite.y - player.sprite.y;
    return {id: player.id,
      distanceSquared: x*x + y*y};
  }, this);
  this.targetId = _.min(playerMaps,function (playerMap) {
    if (playerMap.distanceSquared <= this.attemptRadiusSquared)
      this.shouldAttack = true;
    return playerMap.distanceSquared;
  }, this).id;

};

Zombie.prototype.establishDirection = function () {
  var targetPlayer = _.find(characters, {id: this.targetId});

  if (!targetPlayer)
  {
    this.lockOnPlayer();
    return;
  }

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

  if (leftright != 0)
    this.facingLeftright = leftright;

  if (this.justAttacked) {
    updown = 0;
    leftright = 0;
    this.shouldAttack = false;
  }

  if (updown != this.updown || leftright != this.leftright) {
    this.updown = updown;
    this.leftright = leftright;

    if (this.justAttacked)
    {
      this.handleAttackOn('player');
      return;
    }

    if ((this.updown != 0 || this.leftright != 0) && this.continueAnimation)
      this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    else
      this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
  }
};

Zombie.prototype.appendDamagedDataToMessage = function (data) {
  data.damaged.push({
    id: this.id,
    ownerId: this.ownerId,
    damage: this.damageTaken
  })
};

Zombie.prototype.attemptAttack = function () {
  if (dieRoll(4))
  {
    this.justAttacked = true;
    this.continueAnimation = false;
  }
};