var myId, peer1 = null;
var videoStream = null;
var constraints = {audio:false,video:true};
var localCtracker=null,remoteCTracker=null;
var appWidth = 640;
var appHeight = 480;
var appCanvas = null;
var appContext = null;
var localVideo = null;
var remoteVideo = null;
var bConnected = false;
var lastRemotePoints = null;

// when running locally socketioLocation should be set to localhost:3000
// var socketioLocation = "localhost:3000";						// local
var socketioLocation = 'https://teamsync.shenkar.ac.il'		// for server

var peerOpts = {
    trickle: true,
    initiator: false
    ,config: 
    {
      iceServers: [
      	{
      		url:'stun:teamsync.shenkar.ac.il'
      	},
      	{
			url: 'turn:teamsync.shenkar.ac.il:3478?transport=udp',
			username: 'usertest',
			credential: 'passwordtest'
		}
      ]
    }
};


$(document).ready(function(){

  	appCanvas=document.getElementById('app_canvas');
	appContext=appCanvas.getContext('2d');
	localVideo = document.getElementById('localVideo');
	remoteVideo = document.getElementById('remoteVideo');
	renderLoop();

	navigator.mediaDevices.getUserMedia(constraints)
	  .then(function(stream) {

	  	// Set local stream
		console.log("stream ready");
		peerOpts.stream = stream;
	  	$('#localVideo').prop('srcObject', stream);
	  	startTracking();

	  	// Connect to socket.io server
		var socket = io.connect(socketioLocation);
		console.log(socket);
		room = getParameterByName('room');
		if (room != null) {
			console.log('creating or joining room '+room);
			socket.emit('create or join', room);
		}

		socket.on('created', function(room) {
  			peerOpts.initiator = true;
			console.log('Created room: '+room);
		});

		socket.on('signal', function(data) {
			peer1.signal(data);
		});

		socket.on('join', function (room){
			if (peerOpts.initiator) {
  				console.log('You are the initiator, a peer has joined room ' + room);
  				// Call the other peer
			}
			else {
  				console.log('You joined room '+room+', an initiator will send a call');

  				// Wait for initiator to call
			}

			// setup simple peer connection
			console.log('Setting up simplePeer, initiator = '+peerOpts.initiator);

			peer1 = new SimplePeer(peerOpts);

			peer1.on('signal', function (data) {
				console.log('******   SIGNAL');
				console.log(JSON.stringify(data));
				socket.emit('signal', { room: room, data: data});
			});

			peer1.on('connect', function () {
			  console.log('******  CONNECT');
			  bConnected = true;
			  // startTracking();
			})

			peer1.on('data', function (data) {
			  	// var arr = JSON.parse(data);
			  	// if (Array.isArray(arr)) {
			  		// lastRemotePoints = arr;
			  	// }
			});

			peer1.on('stream', function (stream){
				console.log('******  STREAM');
				$('#remoteVideo').prop('srcObject', stream);
			});

			peer1.on('error', function (err) {
				console.log('****** ERROR');
				console.log(err);
			});

		});

		socket.on('full', function (room){
  			console.log('Room ' + room + ' is full');
		});

		socket.on('log', function (array){
  			console.log.apply(console, array);
		});
	});

});

function renderLoop() {

	var localScale = bConnected?0.25:1;

	// Draw remote video
	if (remoteVideo != null) {
		appContext.save();
		appContext.translate(appWidth, 0);
		appContext.scale(-1, 1);
		appContext.drawImage(remoteVideo, 0, 0, appWidth, appHeight);
		if (remoteCTracker != null) {
			var remoteFace = remoteCTracker.getCurrentPosition();
			drawFaceTrack(remoteFace);
		}
		appContext.restore();
	}
	else {
		// draw waiting for peer

	}

	// Draw local video
	if (localVideo != null) {
		appContext.save();
		appContext.translate(appWidth, appHeight-appHeight*localScale);
		appContext.scale(-localScale, localScale);
		appContext.drawImage(localVideo, 0, 0, appWidth, appHeight);	

		// Track face
		if (localCtracker != null) {
			var localFace=localCtracker.getCurrentPosition();
			drawFaceTrack(localFace);
			if (Array.isArray(localFace) && bConnected) {
				// Send face points
				peer1.send(JSON.stringify(localFace));
			}
		}
		appContext.restore();
	}
	else {

	}

	requestAnimationFrame(renderLoop);
}

function drawFaceTrack(points)
{
	if (!Array.isArray(points))
		return;

	// Draw face points
	for (var i=0; i<points.length; i++) {
		appContext.beginPath();
		appContext.arc(points[i][0], points[i][1], 1, 0, 2*Math.PI);
		appContext.fillStyle = '#00ff00ff';
		appContext.fill();
	}

	appContext.fillStyle = '#ff0000ff';
	appContext.beginPath();
	appContext.moveTo(points[7][0], points[7][1]);
	appContext.lineTo(points[33][0], points[33][1]);
	appContext.stroke();
}


function startTracking(){
	localVideo.play();
	console.log('Local video size: '+localVideo.videoWidth+'x'+localVideo.videoHeight);
	localCtracker = new clm.tracker();
	localCtracker.init();
	localCtracker.start(localVideo);

	remoteCTracker = new clm.tracker();
	remoteCTracker.init();
	remoteCTracker.start(remoteVideo);
}

function getAngle(locations) {
  	var Vector = [];
  	Vector[0] = locations[33][0] - locations[7][0];
  	Vector[1] = locations[33][1] - locations[7][1];
  	return Math.abs(Math.atan2(Vector[1] - (-1), Vector[0] - 0) * 180 / Math.PI);
}

function makeid() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 5; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
  	return text;
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

  
