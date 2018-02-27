$(document).ready(function(){
	var cx=0;
	var cy=0;
	var cw=340;
	var ch=240;
	var c=document.getElementById("foreignCanvas");
    var ctx=c.getContext("2d");
    var img=document.getElementById("empty");
    ctx.drawImage(img,cx,cy,cw,ch);
    $('#scale').on('click',function(){
    	ctx.clearRect(cx,cy,cw,ch);
    	cw+=150;
    	cx-=75;
    	ch+=150;
    	cy-=75;
    	ctx.drawImage(img,cx,cy,cw,ch);
    });
});