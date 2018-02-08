var myId;
var peer;
var videoStream = null;
var constraints = {audio:true,video:true};
var mediaConnection = null,dataConnection=null,myLocations=null;
var localCtracker,foreignCTracker, localCanvasInput, localcc,foreigncc,foreignCanvasInput;
var video,canvas,ctx,w,h; //B&W Effects
var locator = 0;

$(document).ready(function(){
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
			//locator = (checkLocations(data) * 10)/71;
			var video = document.getElementById('foreignVideo'),
				    canvas = document.getElementById('foreignCanvas'),
				    ctx = canvas.getContext('2d'),
				    w = canvas.width,
				    h = canvas.height;
				    ctx.drawImage(video, 0, 0, w, h);
				    var apx = ctx.getImageData(0, 0, w, h);
				    var vidData = apx.data;
			fc = null;
			fc = new frameConverter(video,canvas,data);
			fc.setEffect('edge detection');
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
	fc = new frameConverter(document.getElementById('foreignVideo'),document.getElementById('foreignCanvas'));
	fc.setEffect('edge detection');
	
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
		   	dataConnection = peer.connect(friendID);
		   	dataConnection.on('data', function(data){
		   		var video = document.getElementById('foreignVideo'),
				    canvas = document.getElementById('foreignCanvas'),
				    ctx = canvas.getContext('2d'),
				    w = canvas.width,
				    h = canvas.height;
				    ctx.drawImage(video, 0, 0, w, h);
				    var apx = ctx.getImageData(0, 0, w, h);
				    var vidData = apx.data;
				    fc = null;
					fc = new frameConverter(video,canvas,data);
					fc.setEffect('edge detection');
				    //locator = (checkLocations(data)*10)/71;
		   		/*if (checkLocations(data)>65){
				   // video.style.display = 'none';
				    for(var i = 0; i < data.length; i+=4)
				    {
				        var r = vidData[i],
				            g = vidData[i+1],
				            b = vidData[i+2],
				            gray = (r+g+b)/3;
				        vidData[i] = gray;
				        vidData[i+1] = gray;
				        vidData[i+2] = gray;
				    }
				}
		   		apx.data = vidData;
				ctx.putImageData(apx, 0, 0);*/
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
	positionLoop();
}
function positionLoop() {
	requestAnimationFrame(positionLoop);
	//localcc.clearRect(0, 0, localCanvasInput.width, localCanvasInput.height);
	if (localCtracker.getCurrentPosition()) {
		//localCtracker.draw(localCanvasInput);
		myLocations=localCtracker.getCurrentPosition();
		if (dataConnection!=null){
			//console.log(myLocations);
			dataConnection.send(myLocations);
		}
	}
  }

  function checkLocations(locations){
  	var score = 0;
  	if (myLocations!=null && myLocations!=undefined){
	  	for (var i = 0; i < myLocations.length; i++) {
	  		if ((Math.abs(Math.abs(myLocations[i][0])) - Math.abs(locations[i][0])<=10) && (Math.abs(Math.abs(myLocations[i][1])) - Math.abs(locations[i][1])<=10))
	  		//if (Math.abs(myLocations[i][1] - locations[i][1])<=50)
	  			score++;
	  	}
	}
  	return score;
  }

  function frameConverter(video,canvas,locations) {

    // Set up our frame converter
    this.video = video;
    this.viewport = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    // Create the frame-buffer canvas
    this.framebuffer = document.createElement("canvas");
    this.framebuffer.width = this.width;
    this.framebuffer.height = this.height;
    this.ctx = this.framebuffer.getContext("2d");
    // Default video effect is blur
    this.effect = JSManipulate.blur;
    // This variable used to pass ourself to event call-backs
    var self = this;
    // Start rendering when the video is playing
    this.video.addEventListener("play", function() {
        self.render();
      }, false);
      
    // Change the image effect to be applied  
    this.setEffect = function(effect){
      if(effect in JSManipulate){
          this.effect = JSManipulate[effect];
      }
    }

    // Rendering call-back
    this.render = function() {
        if (this.video.paused || this.video.ended) {
          return;
        }
        this.renderFrame();
        var self = this;
        // Render every 10 ms
        setTimeout(function () {
            self.render();
          }, 10);
    };

    // Compute and display the next frame 
    this.renderFrame = function() {
        // Acquire a video frame from the video element
        this.ctx.drawImage(this.video, 0, 0, this.video.videoWidth,
                    this.video.videoHeight,0,0,this.width, this.height);
        var data = this.ctx.getImageData(0, 0, this.width, this.height);
        // Apply image effect
        ;
        //console.log(10 - (checkLocations(locations)*10/71));
        //this.effect.filter(data,(10 - (checkLocations(locations)*10/71)));
        if (checkLocations(locations)*10/71 > 10)
        	var blurVal = 10;
        else if (checkLocations(locations)*10/71 < 0)
        	var blurVal = 0;
        else
        	blurVal = Math.round(checkLocations(locations)*10/71);
        var blurVal = {amount : 10-blurVal};
        console.log(blurVal);
        this.effect.filter(data,blurVal);
        // Render to viewport
        this.viewport.putImageData(data, 0, 0);
    return;
    };
}
// Change the image effect applied to the video

//function applyFilter(a){var c=0;c!=="none"?(c={filter:c,values:filterValues,stack:Boolean($("#stack-check")[0].checked),direction:'left',canvas.jsManipulate(a,c)):canvas.jsManipulate("restore")};