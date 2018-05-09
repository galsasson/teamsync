var myId, peer1 = null;
var videoStream = null;
var constraints = {audio:true,video:true};
var mediaConnection = null,dataConnection=null,myLocations=null;
var localCtracker,foreignCTracker, localCanvasInput, localcc,foreigncc,foreignCanvasInput;


var peerOpts = {
    trickle: false,
    config: {
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
    }
};


$(document).ready(function(){
	myId=makeid();
	$("#me").html(myId);
	navigator.mediaDevices.getUserMedia(constraints)
	  .then(function(stream) {
		console.log("stream ready");
		videoStream = stream;
	  	$('#localVideo').prop('srcObject', videoStream);

	  	peerOpts.stream = videoStream;
	  	peerOpts.initiator = (location.hash === '#1');
	  	console.log('initiator: '+peerOpts.initiator);

		peer1 = new SimplePeer(peerOpts);

		peer1.on('signal', function (data) {
			console.log('******   SIGNAL');
			console.log(JSON.stringify(data));
			if (location.hash === '#1') {
				if (data.type == 'offer') {
					document.querySelector('#outgoing').textContent = JSON.stringify(data);
				}
			}
			else {
				if (data.type == 'answer') {
					document.querySelector('#outgoing').textContent = JSON.stringify(data);
				}
			}

		});

		peer1.on('connect', function () {
		  console.log('******  CONNECT');
		  startTracking();
		})

		peer1.on('data', function (data) {
			// console.log('******  DATA')
		  	var arr = JSON.parse(data);
		  	if (Array.isArray(arr)) {
		  		drawScale(checkLocations(arr));
		  	}
		});

		peer1.on('stream', function (stream){
			console.log('******  STREAM');
			$('#foreignVideo').prop('srcObject', stream);
		});

		peer1.on('error', function (err) {
			console.log('****** ERROR');
			console.log(err);
		});

		document.querySelector('form').addEventListener('submit', function (ev) {
			ev.preventDefault()
			peer1.signal(JSON.parse(document.querySelector('#incoming').value))
		});
	});
	

	localCanvasInput = document.getElementById('localCanvas');
	localcc = localCanvasInput.getContext('2d');
	foreignCanvasInput = document.getElementById('foreignCanvas');
	foreigncc = foreignCanvasInput.getContext('2d');
	
});

function startTracking(){
	vid = document.getElementById('localVideo');
	vid.play();
	localCtracker = new clm.tracker();
	localCtracker.init();
	localCtracker.start(vid);
	positionLoop();
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

	console.log(makeid());

  
