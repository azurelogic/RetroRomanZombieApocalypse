# Retro Roman Zombie Apocalypse

RRZA is a multiplayer HTML5 Canvas zombie slayer backed by [Node.js](http://nodejs.org/). The code is 100% JavaScript (my first major JS project), and it is powered by a stack of JavaScript libraries:
* [EaselJS](http://www.createjs.com/#!/EaselJS) for graphics
* [Express](http://expressjs.com/) for server organization
* [Socket.IO](http://socket.io/) for real-time communications
* [Express.io](http://express-io.org/) for slick real-time routing and server setup
* [Lo-Dash](http://lodash.com/) for various array manipulations (drop-in for underscore.js; think Linq for JS, for the .NET people in the crowd)
* [Knockout](http://knockoutjs.com/) for client-side MVVM DOM updates
* [node-uuid](https://github.com/broofa/node-uuid) for Guids

The thing that makes this game different from many others is its fully-distributed data model. The server only knows that the games exist and acts as a communication hub for player-to-player data. In addition, no player acts as a host to coordinate information. Instead, all of the players own a certain chunk of the game, and they send/receive updates with the other players to maintain a unified image of the total game state. This means that the server is light on memory, allowing  me to run the entire thing on an Amazon EC2 Micro instance.

Also, all the art was from scratch and was limited to the old school web colors palette.

Check it out at http://azurelogic.com/

Disclaimer: No jQuery was used or abused in the making of this game
