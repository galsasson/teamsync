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
		this.min = 45;
		this.max = 135;
		this.history = history;
	}

	draw() {
		noFill();
		var x = this.width;
		var decx = float(this.width)/this.history;
		stroke(this.color.r, this.color.g, this.color.b);
		beginShape();
		for (var i=this.data.length-1; i>=0; i--) {
			vertex(x, map(this.data[i], this.min, this.max, this.height, 0));
			x-=decx;
		}
		endShape();
	}

	addPoint(p) {
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


