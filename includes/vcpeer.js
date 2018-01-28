var myId;
var peer;
var videoStream = null;
var constraints = {audio:true,video:true};
var mediaConnection = null,dataConnection=null,myLocations=null;
var localCtracker,foreignCTracker, localCanvasInput, localcc,foreigncc,foreignCanvasInput;

$(document).ready(function(){
	$('#me').hide();
	peer = new Peer({key: 'lwjd5qra8257b9'});
	peer.on('open', function(id) {
		myId=id;
		console.log(myId);
	  $("#me").html(myId);
	});
	peer.on('call', function(call) {
	  // Answer the call, providing our mediaStream
	  navigator.mediaDevices.getUserMedia(constraints)
	  .then(function(stream) {
		console.log("stream ready");
		videoStream = stream;
		$('#localVideo').prop('src', URL.createObjectURL(videoStream));
	  	call.answer(videoStream);
	  	call.on('close', function(){
	  		disconnect();
	  		peer.disconnect();
	  	})
	  	call.on('stream', function(stream) {
	  	//mediaConnection.answer([stream]);
	  	// `stream` is the MediaStream of the remote peer.
	  	// Here you'd add it to an HTML video/canvas element.
		  	$('#foreignVideo').prop('src', URL.createObjectURL(stream));
		  	if (mediaConnection == null)
				mediaConnection = peer.call(call.peer,videoStream);
			$('#call').prop('disabled',true);
			$('#disconnect').prop('disabled',false);
			$('#friend').html(call.peer);
		if (mediaConnection!=null && videoStream!=null)
			startTracking();
		});
	  });
	});
	peer.on('connection', function(conn) { 
		console.log('incoming connection');
		conn.on('data',function(data){
			checkLocations(data);
		});
		conn.on('close', function(){
			disconnect();
		});
		dataConnection = conn;
	});
	peer.on('disconnected',function(){
		disconnect();
	});
	localCanvasInput = document.getElementById('localCanvas');
	localcc = localCanvasInput.getContext('2d');
	foreignCanvasInput = document.getElementById('foreignCanvas');
	foreigncc = foreignCanvasInput.getContext('2d');
	console.log('Ready');

});

function callFriend(){
	friendID = $("#friendid").val();
	try{
		navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream) {
		  console.log("stream ready");
		  videoStream = stream;
		  console.log('calling');
		   $('#localVideo').prop('src', URL.createObjectURL(videoStream));
		   $('#me').show();
		   	dataConnection = peer.connect(friendID);
		   	dataConnection.on('data', function(data){
		   		if (checkLocations(data)>65)
		   			$("#inSync").attr("src","v.jpg");
		   		else
		   			$("#inSync").attr("src","x.png");
		   	});
			mediaConnection = peer.call(friendID,videoStream);
			$('#call').prop('disabled',true);
			$('#disconnect').prop('disabled',false);

		});
	}
	catch(err){
		console.log(err.message);
	}
}

function disconnect() {
	peer.disconnect();
	if (dataConnection!=null)
		dataConnection.close();
	$('#localVideo').prop('hidden', true);
	$('#foreignVideo').prop('hidden', true);
	videoStream.getTracks()[0].stop();
	mediaConnection = null;
	dataConnection = null;
	localCtracker.stop();
	localcc.clearRect(0, 0, localCanvasInput.width, localCanvasInput.height);
}

function startTracking(){
	vid = document.getElementById('localVideo');
	vid.play();
	localCtracker = new clm.tracker();
	localCtracker.init();
	localCtracker.start(vid);
	
	console.log("tracking");
	/*foreignCTracker = new clm.tracker();
	foreignCTracker.init();
	foreignCTracker.start($('#foreignVideo'));
	console.log("tracking "+foreignCTracker);*/

	positionLoop();
}
function positionLoop() {
	requestAnimationFrame(positionLoop);
    //console.log(localPositions = localCtracker.getCurrentPosition());
    //console.log(localPositions);
    //var foreignPositions = foreignCTracker.getCurrentPosition();
    //console.log(foreignPositions);
    //localcc.clearRect(0, 0, localCanvasInput.width, localCanvasInput.height);
    //foreigncc.clearRect(0, 0, foreignCanvasInput.width, foreignCanvasInput.height);
	//localCtracker.draw(localCanvasInput);
	//foreignCTracker.draw(foreignCanvasInput)
	localcc.clearRect(0, 0, localCanvasInput.width, localCanvasInput.height);
	if (localCtracker.getCurrentPosition()) {
		localCtracker.draw(localCanvasInput);
		myLocations=localCtracker.getCurrentPosition();
		if (dataConnection!=null)
			dataConnection.send(myLocations);
	}
  }

  function checkLocations(locations){
  	var score = 0;
  	if (myLocations!=null){
	  	for (var i = 0; i < myLocations.length; i++) {
	  		if ((Math.abs(Math.abs(myLocations[i][0])) - Math.abs(locations[i][0])<=10) && (Math.abs(Math.abs(myLocations[i][1])) - Math.abs(locations[i][1])<=10))
	  			score++;
	  	}
	  	return score;
	}
  	return false;
  }