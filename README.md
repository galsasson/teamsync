# TeamSync

video chat web application.

## Main Components

- server
   - establish peer communication (using [socket.io](https://github.com/socketio/socket.io))
   - serve the client web pages ([express](https://github.com/expressjs/express))
- client
  - video communication ([simplepeer](https://github.com/feross/simple-peer))
  - face recognition ([posenet](https://github.com/tensorflow/tfjs-models/tree/master/posenet))
  - graph plotter (grapher.js)
  - drawing framework for the graphs ([p5.js](https://p5js.org/))

## Web application

### index.html
development page with all the options

### clean.html
clean videochat app for test sessions, with recording option

### smiley.html
replace face with smiley with beach background

### smiley-video.html
replace face with smilet on top of existing video
