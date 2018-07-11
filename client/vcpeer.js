// vcpeer.js
//
// TeamSync Client Application
//

// Settings
var appWidth = 640;
var appHeight = 480;
var bShareFaceTracking = false;
var bDrawLocalFaceTrack = true;
var bDrawAngleStroke = false;
var bDrawRemoteFaceTrack = true;
var bBGSubtract = false;
var bPaused = false;
var bTrackingEnabled = true;
var tracker = 'posenet';		// can be 'clm' or 'posenet' or 'both'
var bCaptureVideo = false;
var bRecordSession = false;

// State
var myId, peer1 = null;
var videoStream = null;
var constraints = {audio:false,video:true};
var localCtracker=null,remoteCTracker=null;
var lastLatency = 0;
var appCanvas = null;
var appContext = null;
var localVideo = null;
var remoteVideo = null;
var bConnected = false;
var lastRemotePoints = null;
var bgCanvas = null;
var bgCtx = null;
var bDrawLocalVideo = true;
// Create a capturer that exports a WebM video
var capturer;
var sessionStartTime=0;
var sessionBuffer = "";

// when running locally socketioLocation should be set to localhost:3000
//var socketioLocation = "localhost:3000";						// local
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
		},
      	{
      		url:'stun:stun.l.google.com:19302'
      	},
		{
			"url": 'turn:13.250.13.83:3478?transport=udp',
			"username": "YzYNCouZM1mhqhmseWk6",
			"credential": "YzYNCouZM1mhqhmseWk6"
		}
      ]
    }
};

// var _posenet = require('@tensorflow-models/posenet');
// var _posenet = require('posenet.js');
// var posenet = _interopRequireWildcard(_posenet);


$(document).ready(function(){

	capturer = new CCapture( { format: 'webm', framerate: 10, verbose: false } );

  	appCanvas=document.getElementById('app_canvas');
	appContext=appCanvas.getContext('2d');
	bgCanvas=document.getElementById('bg_canvas');
	bgCtx=bgCanvas.getContext('2d');
	localVideo = document.getElementById('localVideo');
	remoteVideo = document.getElementById('remoteVideo');
	window.document.getElementById('dlft').innerHTML = bDrawLocalFaceTrack?'ON':'OFF';
	window.document.getElementById('drft').innerHTML = bDrawRemoteFaceTrack?'ON':'OFF';
	window.document.getElementById('sft').innerHTML = bShareFaceTracking?'ON':'OFF';	
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
			  sendPing();
			  // startTracking();
			})

			peer1.on('data', function (data) {
		  		var msg = JSON.parse(data);
		  		if (msg.type === 'face' && bShareFaceTracking) {
		  			if (Array.isArray(msg.data)) {
		  				lastRemotePoints = msg.data;
		  			}
		  		}
		  		else if (msg.type == 'ping') {
		  			peer1.send(JSON.stringify({type:'pong',data:msg.data}));
		  		}
		  		else if (msg.type == 'pong') {
		  			checkLatency(JSON.parse(msg.data));
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

});

function renderLoop() {
	appContext.clearRect(0, 0, appWidth, appHeight);

	if (bPaused) {
		requestAnimationFrame(renderLoop);
		return;
	}

	var localScale = bConnected?0.25:1;
	var faceDetected=false;

	// Draw remote video
	if (remoteVideo != null) {
		appContext.save();
		appContext.translate(appWidth, 0);
		appContext.scale(-1, 1);
		appContext.drawImage(remoteVideo, 0, 0, appWidth, appHeight);

		if (bTrackingEnabled) {
			
			if ((tracker === 'clm' || tracker === 'both') && localCtracker != null) {
				var facePoints = bShareFaceTracking?lastRemotePoints:(remoteCTracker!=null)?remoteCTracker.getCurrentPosition():null;
				if (Array.isArray(facePoints)) {
					if (bDrawRemoteFaceTrack) {
						drawFaceTrack(facePoints);
					}

					var angle = getAngle(facePoints);
					// Add point to graph
					remoteAngleGraph.addPoint(angle);
				}
			}

			if ((tracker === 'posenet' || tracker==='both') && window.posenet) {
				window.posenet.estimateSinglePose(remoteVideo, 0.5, false, 16).then(function(value) { window.remotePosenetFace = value});

				if (window.remotePosenetFace && window.remotePosenetFace.score > 0.2) {
					// faceDetected = true;

					if (bDrawRemoteFaceTrack) {
						drawPosenet(window.remotePosenetFace);
					}

					var angle = getAnglePosenet(window.remotePosenetFace.keypoints);
					// Add point to graph
					remoteAngleGraph.addPoint(angle);
        		}
        	}


			// Update frequency and phase in the page
			if (remoteAngleGraph) {
				window.document.getElementById('remote_freq').innerHTML = parseFloat(remoteAngleGraph.freq).toFixed(2);
				window.document.getElementById('remote_phase').innerHTML = parseFloat(remoteAngleGraph.phase).toFixed(2);		
			}
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
		if (bDrawLocalVideo) {
			appContext.drawImage(localVideo, 0, 0, appWidth, appHeight);
		}
		// appContext.drawImage(subtract(localVideo, bgCanvas), 0, 0, 120, 80);
		// appContext.drawImage(subtract(bgCanvas, localVideo), 120, 0, 120, 80);

		// Track local face
		if (bTrackingEnabled) {
			var localFace;

			if ((tracker === 'clm' || tracker === 'both') && localCtracker != null) {
				localFace=localCtracker.getCurrentPosition();

				if (Array.isArray(localFace)) 
				{
					faceDetected = true;

					// Draw track points
					if (bDrawLocalFaceTrack) {
						drawFaceTrack(localFace);
					}
					var angle = getAngle(localFace);
					// Add point to graph
					localAngleGraph.addPoint(angle);

					// Share the points with our peer
					if (bShareFaceTracking && bConnected) {
						// Send face points
						peer1.send(JSON.stringify({type:'face',data:localFace}));
					}
				}
			}

			// posenet
			if ((tracker === 'posenet' || tracker==='both') && window.posenet) {
				window.posenet.estimateSinglePose(localVideo, 0.5, false, 16).then(function(value) { window.localPosenetFace = value});

				if (window.localPosenetFace && window.localPosenetFace.score > 0.2) {
					faceDetected = true;

					if (bDrawLocalFaceTrack) {
						drawPosenet(window.localPosenetFace);
					}

					var angle = getAnglePosenet(window.localPosenetFace.keypoints);
					// Add point to graph
					localAngleGraph.addPoint(angle);
        		}
        	}

			// Update frequency and phase in the page
			if (localAngleGraph) {
				window.document.getElementById('local_freq').innerHTML = parseFloat(localAngleGraph.freq).toFixed(2);
				window.document.getElementById('local_phase').innerHTML = parseFloat(localAngleGraph.phase).toFixed(2);
				if (bConnected) {
					window.document.getElementById('local_sync').innerHTML = parseFloat(getSync()).toFixed(2);
				}
			}
		}
		appContext.restore();
	}
	else {
		// No local video
	}

	// draw face detection signal
	if (!faceDetected) {
		appContext.fillStyle = 'rgb(255, 0, 0)';
		appContext.fillRect(0, 0, appWidth, 2);
	}

	if (bCaptureVideo && capturer != null) {
		capturer.capture(appCanvas);
	}

	// Handle Session Recording
	if (bRecordSession) {
		var t = new Date();
		sessionBuffer += t.getTime()+',';
		sessionBuffer += str(localAngleGraph.getLastValue())+',';
		sessionBuffer += str(remoteAngleGraph.getLastValue())+',';
		sessionBuffer += localAngleGraph.getFreq() + ',';
		sessionBuffer += localAngleGraph.getPhase() + ',';
		sessionBuffer += getSync().toFixed(2) + ',';
		sessionBuffer += lastLatency + ',';
		sessionBuffer += (faceDetected?'1':'0') + '\r\n';

		var st = new Date(t.getTime()-sessionStartTime);
		document.getElementById('time_td').innerHTML = str(st.getMinutes()) + ' : ' + str(st.getSeconds());
	}

	requestAnimationFrame(renderLoop);
}

function getSync()
{
	return abs(localAngleGraph.freq-remoteAngleGraph.freq);
}

function filterImage(image, filterName)
{
	var c = document.getElementById('tmp_canvas');
  	var ctx = c.getContext('2d');
	if (filterName === 'grayscale') {
		var grayscale = Filters.filterImage(Filters.grayscale, image);
		ctx.putImageData(grayscale, 0, 0);
	}
	return c;
}

function captureBG()
{
	bgCtx.drawImage(localVideo, 0, 0, localVideo.width, localVideo.height);
}

function subtract(src, dst)
{
	var c = document.getElementById('tmp_canvas');
  	var ctx = c.getContext('2d');
	var pixels = Filters.filterImages(Filters.diff, src, dst);
	ctx.putImageData(pixels, 0, 0);
	return c;
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

	// draw angle stroke
	if (bDrawAngleStroke) {
		appContext.fillStyle = '#ff0000ff';
		appContext.beginPath();
		appContext.moveTo(points[7][0], points[7][1]);
		appContext.lineTo(points[33][0], points[33][1]);
		appContext.stroke();
	}
}

function drawPosenet(points)
{
	if (points == undefined || points == null)
		return;
	
	points = points.keypoints;

	if (!Array.isArray(points)) {
		return;
	}

	// Draw face points
	for (var i=0; i<min(3,points.length); i++) {
		appContext.beginPath();
		appContext.arc(points[i].position.x, points[i].position.y, 1, 0, 2*Math.PI);
		appContext.fillStyle = '#FF0000ff';
		appContext.fill();
	}

	// draw angle stroke
	if (bDrawAngleStroke) {
		appContext.fillStyle = '#ff0000ff';
		appContext.beginPath();
		appContext.moveTo(points[7][0], points[7][1]);
		appContext.lineTo(points[33][0], points[33][1]);
		appContext.stroke();
	}	
}




function startTracking(){
	localVideo.play();
	console.log('Local video size: '+localVideo.videoWidth+'x'+localVideo.videoHeight);
	if (tracker == 'clm' || tracker === 'both') {
		localCtracker = new clm.tracker();
		localCtracker.init();
		localCtracker.start(localVideo);

		remoteCTracker = new clm.tracker();
		remoteCTracker.init();
		remoteCTracker.start(remoteVideo);
	}

	if (tracker == 'posenet' || tracker == 'both') {

	}
}

function getAngle(locations) {
  	var vec = [];
  	vec[0] = locations[7][0] - locations[33][0];
  	vec[1] = locations[7][1] - locations[33][1];
  	var ang = 90-(Math.atan2(vec[1], vec[0]) * 180 / Math.PI);
  	return ang;
}

function getAnglePosenet(locations) {
  	var vec = [];
  	vec[0] = locations[1].position.x - locations[2].position.x;
  	vec[1] = locations[1].position.y - locations[2].position.y;
  	var ang = -1*(Math.atan2(vec[1], vec[0]) * 180 / Math.PI);
  	return ang;
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

function sendPing()
{
	if (!bConnected || peer1===null)
		return;

	var d = new Date();
	var ms = d.getTime();
	peer1.send(JSON.stringify({type:'ping',data:JSON.stringify(ms)}));
	setTimeout(sendPing, 1000);
}

function checkLatency(time)
{
	var d = new Date();
	var ms = d.getTime();
	var offset = (ms-time)/2;
	lastLatency=offset;
	window.document.getElementById('latency').innerHTML = offset;
}

function toggleLocalFaceTrack() {
	bDrawLocalFaceTrack = !bDrawLocalFaceTrack;
	window.document.getElementById('dlft').innerHTML = bDrawLocalFaceTrack?'ON':'OFF';
}

function toggleRemoteFaceTrack() {
	bDrawRemoteFaceTrack = !bDrawRemoteFaceTrack;
	window.document.getElementById('drft').innerHTML = bDrawRemoteFaceTrack?'ON':'OFF';
}

function toggleShareFaceTrack() {
	bShareFaceTracking = !bShareFaceTracking;
	window.document.getElementById('sft').innerHTML = bShareFaceTracking?'ON':'OFF';	
}

function toggleLocalCamera() {
	bDrawLocalVideo = !bDrawLocalVideo;
	window.document.getElementById('tlc').innerHTML = bDrawLocalVideo ? 'ON' : 'OFF';
}

function startVideoCapture() {
	capturer.start();
	bCaptureVideo = true;
}

function toggleSessionRecording()
{
	bRecordSession = !bRecordSession;
	var btn = document.getElementById('toggle_session_recording_btn');
	if (bRecordSession) {
		btn.innerHTML = 'Stop Session Recording';
		sessionBuffer='UTCTIME,LOCAL_ANGLE,REMOTE_ANGLE,FREQ,PHASE,SYNC,LATENCY,FACE_DETECTED\r\n';
		sessionStartTime = (new Date()).getTime();
	}
	else {
		// Save to downloads
		sessionBlob = new Blob([sessionBuffer], {type: 'text/plain'});
		var dbtn = document.getElementById('download_btn');
		dbtn.href = window.URL.createObjectURL(sessionBlob);
  		var t = new Date();
		dbtn.download = 'session_'+t.getHours()+'-'+t.getMinutes()+'-'+t.getSeconds()+'.csv';
		btn.innerHTML = 'Start Session Recording';
	}
}







// P5.js setup
var scopeW = 640;
var scopeH = 200;
var localAngleGraph = null;
var remoteAngleGraph = null;

function setup()
{

	createCanvas(scopeW, scopeH).parent('scope_canvas');
	frameRate(60);

	localAngleGraph = new Grapher(640, 200, 8);
	if (tracker == 'posenet') {
		localAngleGraph.smoothness = 0.08;
	}
	localAngleGraph.setColor(128, 128, 255);
	remoteAngleGraph = new Grapher(640, 200, 8);
	remoteAngleGraph.setColor(255, 128, 128);

}

function draw()
{
	if (bPaused) {
		return;
	}

	// clear
	noStroke();
	fill(255);
	rect(0, 0, 640, 300);

	localAngleGraph.drawAxis();
	remoteAngleGraph.drawGraph();
	localAngleGraph.drawGraph();
}

function keyPressed(key)
{
	// console.log(key);
	if (key.which == 32) {
		bPaused = !bPaused;
	}
}



