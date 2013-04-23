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
  this.justAttacked = false;
  this.velocityFactor = 50;


  stage.addChild(this.sprite);
  stage.update();

  spriteSheet.getAnimation(this.color + 'stand').next = this.color + 'stand';
  this.sprite.gotoAndPlay(this.color + 'stand');
}

Character.prototype.updatePositionAndVelocity = function (characterData) {
  this.sprite.x = characterData.spritex;
  this.sprite.y = characterData.spritey;
  this.updown = 0.9 * characterData.updown;
  this.leftright = 0.9 * characterData.leftright;
  this.facingLeftright = characterData.facingLeftright;
  if (characterData.justAttacked)
    this.startAttackMotion();
  else if (this.updown != 0 || this.leftright != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};


Character.prototype.move = function (deltaTime) {
  if (this.updown == 0 || this.leftright == 0) {
    this.sprite.x += Math.round(this.leftright * deltaTime * this.velocityFactor);
    this.sprite.y += Math.round(this.updown * deltaTime * this.velocityFactor);
  }
  else {
    this.sprite.x += Math.round(this.leftright * deltaTime * this.velocityFactor * 0.707);
    this.sprite.y += Math.round(this.updown * deltaTime * this.velocityFactor * 0.707);
  }
};

Character.prototype.handleLeftOrRightFacingAnimation = function (nextAnimationType, futureAnimationType) {
  var nextAnimationName;
  var futureAnimationName;
  if (this.facingLeftright == 1) {
    nextAnimationName = this.color + nextAnimationType + '_h';
    futureAnimationName = this.color + futureAnimationType + '_h';
  }
  else {
    nextAnimationName = this.color + nextAnimationType;
    futureAnimationName = this.color + futureAnimationType;
  }

  if (futureAnimationType)
    spriteSheet.getAnimation(nextAnimationName).next = futureAnimationName;
  else
    spriteSheet.getAnimation(nextAnimationName).next = nextAnimationName;

  this.sprite.gotoAndPlay(nextAnimationName);
};

Character.prototype.startLeftMotion = function ()
{
  this.leftright = -1;
  this.facingLeftright = this.leftright;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startRightMotion = function ()
{
  this.leftright = 1;
  this.facingLeftright = this.leftright;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startUpMotion = function ()
{
  this.updown = -1;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startDownMotion = function ()
{
  this.updown = 1;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startAttackMotion = function () {
  this.updown = 0;
  this.leftright = 0;
  this.handleLeftOrRightFacingAnimation('attack', 'stand');
};

Character.prototype.stopLeftRightMotion = function ()
{
  if (this.leftright != 0)
    this.facingLeftright = this.leftright;

  this.leftright = 0;
  if (this.updown != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};

Character.prototype.stopUpDownMotion = function ()
{
  this.updown = 0;
  if (this.leftright != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};

var Player = function (options) {
  Character.call(this, options);
};

Player.prototype = Object.create(Character.prototype);

Player.prototype.appendDataToMessage = function (data) {
  if (!data.characters)
    data.chars = [];
  
  var playerData = {
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y,
    justAttacked: this.justAttacked
  };

  data.chars.push(playerData);
  
  this.justAttacked = false;
};

var Zombie = function (options) {
  options.color = 'zombie';
  Character.call(this, options);
  this.ownerId = options.ownerId;
};

Zombie.prototype = Object.create(Character.prototype);

Zombie.prototype.appendDataToMessage = function (data) {
  if (!data.chars)
    data.chars = [];
  var zombieData = {
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y,
    justAttacked: this.justAttacked,
    ownerId: this.ownerId
  };

  data.chars.push(zombieData);

}