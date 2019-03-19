# TeamSync

video chat web application.

## Main Components

- node server
   - establish peer communication (using [socket.io](https://github.com/socketio/socket.io))
   - serve the client web pages ([express](https://github.com/expressjs/express))
- web application
  - video communication ([simplepeer](https://github.com/feross/simple-peer))
  - face recognition ([posenet](https://github.com/tensorflow/tfjs-models/tree/master/posenet))
  - graph plotter (grapher.js)
  - drawing framework for the graphs ([p5.js](https://p5js.org/))

## Web application pages
- index.html: maximalist development page.
- clean.html: clean videochat app for test sessions, with option to record.
- smiley.html: replace face with smiley with beach background.
- smiley-video.html: replace face with smilet on top of existing video.
