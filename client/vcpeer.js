var myId, peer1 = null;
var videoStream = null;
var constraints = {audio:false,video:true};
var mediaConnection = null,dataConnection=null,myLocations=null;
var localCtracker=null,foreignCTracker, localCanvasInput, localcc,foreigncc,foreignCanvasInput;
var appWidth = 640;
var appHeight = 480;
var appCanvas = null;
var appContext = null;
var localVideo = null;
var remoteVideo = null;
var bConnected = false;
var lastRemotePoints = null;

// when running locally socketioLocation should be set to localhost:3000
var socketioLocation = "localhost:3000";						// local
// var socketioLocation = 'https://teamsync.shenkar.ac.il'		// for server

var peerOpts = {
    trickle: true,
    initiator: false
/*    ,config: {
      iceServers: [
      	{
      		url:'stun:teamsync.shenkar.ac.il'
      	},
      	{
		url: 'turn:teamsync.shenkar.ac.il:3478?transport=udp',
		username: 'test',
		credential: 'test'
	}
      ]
    }*/
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
			  	var arr = JSON.parse(data);
			  	if (Array.isArray(arr)) {
			  		lastRemotePoints = arr;
			  		// Got remote face points
			  		// checkLocations();
			  	}
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
	

	localCanvasInput = document.getElementById('localCanvas');
	//localcc = localCanvasInput.getContext('2d');
	foreignCanvasInput = document.getElementById('foreignCanvas');
	//foreigncc = foreignCanvasInput.getContext('2d');
	
});

function renderLoop() {

	var localScale = bConnected?0.25:1;

	// Draw remote video
	if (remoteVideo != null) {
		appContext.drawImage(remoteVideo, 0, 0, appWidth, appHeight);
		drawFaceTrack(lastRemotePoints);
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
			myLocations=localCtracker.getCurrentPosition();
			drawFaceTrack(myLocations);
			if (myLocations && bConnected) {
				// Send face points
				peer1.send(JSON.stringify(myLocations));
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
	if (points===null)
		return;

	// Draw face points
	for (var i=0; i<points.length; i++) {
		appContext.beginPath();
		appContext.arc(points[i][0], points[i][1], 1, 0, 2*Math.PI);
		appContext.fillStyle = '#00ff00ff'
		appContext.fill();
	}

}


function startTracking(){
	localVideo.play();
	console.log('Local video size: '+localVideo.videoWidth+'x'+localVideo.videoHeight);
	localCtracker = new clm.tracker();
	localCtracker.init();
	localCtracker.start(localVideo);
}


function positionLoop() {
	localcc.clearRect(0, 0, localCanvasInput.width, localCanvasInput.height);
	if (localCtracker.getCurrentPosition()) {
		//localCtracker.draw(localCanvasInput);
		myLocations=localCtracker.getCurrentPosition();
		if (peer1!=null){
			peer1.send(JSON.stringify(myLocations));
		}
	}
	requestAnimationFrame(positionLoop);
}

function checkLocations(locations){
  	var score = 0;
  	if (myLocations!=null && myLocations!=undefined){
	  	/*if (Math.abs(Math.abs((myLocations[62][0] - myLocations[1][0]) + (myLocations[1][1] - myLocations[62][1])) - Math.abs((locations[62][0] - locations[1][0]) + (locations[1][1] - locations[62][1]))) <=10)
	  		score++;
	  	if (Math.abs(Math.abs((myLocations[13][0] - myLocations[62][0]) + (myLocations[13][1] - myLocations[62][1])) - Math.abs((locations[13][0] - locations[62][0]) + (locations[13][1] - locations[62][1]))) <=10)
	  		score++;
	  	if (Math.abs(Math.abs((myLocations[62][0] - myLocations[20][0]) + (myLocations[20][1] - myLocations[62][1])) - Math.abs((locations[62][0] - locations[20][0]) + (locations[20][1] - locations[62][1]))) <=10)
	  		score++;
	  	if (Math.abs(Math.abs((myLocations[16][0] - myLocations[62][0]) + (myLocations[16][1] - myLocations[62][1])) - Math.abs((locations[16][0] - locations[62][0]) + (locations[16][1] - locations[62][1]))) <=10)
	  		score++;
	  	if (Math.abs(Math.abs((myLocations[62][0] - myLocations[7][0]) + (myLocations[62][1] - myLocations[7][1])) - Math.abs((locations[62][0] - locations[7][0]) + (locations[62][1] - locations[7][1]))) <=10)
	  		score++;*/
	  	$('#me').html('My angle: ' + parseFloat(getAngle(myLocations)).toFixed(2));
	  	/*console.log('[' + myLocations[7][0] + '][' +  myLocations[7][1] + ']');
	  	console.log('[' + myLocations[33][0] + '][' +  myLocations[33][1] + ']');
	  	console.log('[' + locations[7][0] + '][' +  locations[7][1] + ']');
	  	console.log('[' + locations[33][0] + '][' +  locations[33][1] + ']');*/
	  	var c=document.getElementById("localCanvas");
		var ctx=c.getContext("2d");
		ctx.clearRect(0,0,400,400);
		ctx.beginPath();
		ctx.moveTo(myLocations[7][0],myLocations[7][1]);
		ctx.lineTo(myLocations[33][0],myLocations[33][1]);
		ctx.stroke();

		$('#friend').html('Friend angle: ' + parseFloat(getAngle(locations)).toFixed(2));
	  	var c=document.getElementById("foreignCanvas");
		var ctx=c.getContext("2d");
		ctx.clearRect(0,0,400,400);
		ctx.beginPath();
		ctx.moveTo(locations[7][0],locations[7][1]);
		ctx.lineTo(locations[33][0],locations[33][1]);
		ctx.stroke();
		
	}
  	return score;
  }

function getAngle(locations) {
  	var Vector = [];
  	Vector[0] = locations[33][0] - locations[7][0];
  	Vector[1] = locations[33][1] - locations[7][1];
  	return Math.abs(Math.atan2(Vector[1] - (-1), Vector[0] - 0) * 180 / Math.PI);
}

function drawScale(locator){ 
  	//console.log(locator);
  	if (isNaN(locator)){
  		console.log('nan');
  		return;
  	}
    var img=document.createElement('img');
    img.src = 'empty.png';
    img.width = 220;
    img.height = 277;
    //ctx.drawImage(img,cx,cy,cw,ch);
    var cw=340+(locator*150),
		cx=(locator)*(-75),
		ch=240+(locator*150),
		cy=(locator)*(-75);
	//foreigncc.clearRect(cx,cy,cw,ch);
	//foreigncc.drawImage(img,cx,cy,cw,ch);
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

  
