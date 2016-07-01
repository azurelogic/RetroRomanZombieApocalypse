System.config({
  baseURL: "/js/compiled",
  defaultJSExtensions: true,
  transpiler: false,
  paths: {},
  map:{
    lodash: '//cdnjs.cloudflare.com/ajax/libs/lodash.js/4.13.1/lodash.min.js',
    knockout: '//cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min.js',
    'socket.io': '//cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.8/socket.io.min.js',
    'node-uuid': '/js/uuid.js'
  }
});
