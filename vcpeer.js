$(document).ready(){
	var peer = new Peer({key: 'lwjd5qra8257b9'});
	peer.on('open', function(id) {
	  console.log('My peer ID is: ' + id);
	});
	peer.on('call', function(call) {
	  // Answer the call, providing our mediaStream
	  call.answer(mediaStream);
	});
	peer.on('connection', function(conn) { 
		console.log('incoming connection');
	});

}