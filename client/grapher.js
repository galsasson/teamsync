// grapher.js

class Grapher
{
	constructor(width, height, history) {
		this.width = width;
		this.height = height;
		this.color = {
			r:255,
			b:255,
			g:255
		};

		this.data = [];
		this.min = -45;
		this.max = 45;
		this.history = history;
		this.ts = 1.0/60;
		this.lastPointAt = 0;

	}

	draw() {
		this.drawAxis();

		// draw graph line
		noFill();
		var x = this.width;
		var decx = float(this.width)/this.history;
		stroke(this.color.r, this.color.g, this.color.b);
		beginShape();
		for (var i=this.data.length-1; i>=0; i--) {
			var y = map(this.data[i], this.min, this.max, this.height, 0);
			vertex(x, y);
			// ellipse(x,y,3,3)			// draw points
			x-=decx;
		}
		endShape();
	}

	drawAxis()
	{
		// y axis
		var nSteps = 8;
		var step = (this.max-this.min)/nSteps;
		for (var v=this.min; v<this.max; v+=step) {
			var y = map(v, this.min, this.max, this.height, 0);
			stroke(255, 20);
			line(0, y, this.width, y);
			fill(255, 128);
			noStroke();
			text(v, 2, y-2);
		}

		// x axis
		nSteps = 8;
		step = (this.width/nSteps);
		var hstep = this.history/this.width;
		for (var v=this.width; v>0; v-=step) {
			stroke(255, 20);
			line(v, 0, v, this.height);
			noStroke();
			fill(255, 128);
			var t = -(this.width-v)*hstep*this.ts;
			text(parseFloat(t).toFixed(2) + " sec", v+2, this.height-6);
		}

	}

	addPoint(p) {
		// var dp = {
		// 	t: millis(),
		// 	v: p
		// };
		this.data.push(p);
		if (this.data.length > this.history+1) {
			this.data.shift();
		}
	}

	setColor(r,g,b) {
		this.color.r = r;
		this.color.g = g;
		this.color.b = b;
	}
}


