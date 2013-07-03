# Retro Roman Zombie Apocalypse

RRZA is a multiplayer HTML5 Canvas zombie slayer backed by [Node.js](http://nodejs.org/). The code is 100% JavaScript (my first major JS project), and it is powered by a stack of JavaScript libraries:
* [EaselJS](http://www.createjs.com/#!/EaselJS) for graphics
* [Express](http://expressjs.com/) for server organization
* [Socket.IO](http://socket.io/) for real-time communications
* [Express.io](http://express-io.org/) for slick real-time routing and server setup
* [Lo-Dash](http://lodash.com/) for various array manipulations (drop-in for underscore.js; think Linq for JS, for the .NET people in the crowd)
* [Knockout](http://knockoutjs.com/) for client-side MVVM DOM updates
* [node-uuid](https://github.com/broofa/node-uuid) for Guids

The entire thing runs on an Amazon EC2 Micro instance. Check it out at http://azurelogic.com/

Disclaimer: No jQuery was used or abused in the making of this game
