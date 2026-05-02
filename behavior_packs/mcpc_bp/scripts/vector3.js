// according to minecraft documentation this class should be available within the 'minecraft/server' module 
// but trying to import it fails with this error : [Scripting][error]-SyntaxError: Could not find export 'Vector3' in module '@minecraft/server'
// its known issue, https://github.com/MicrosoftDocs/minecraft-creator/issues/847
// workarround is to create and use our own vector3 class

export class Vector3 {
	#x;
	#y;
	#z;

	constructor(x, y, z) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
	}

	length() {
		return Math.sqrt(this.#x * this.#x + this.#y * this.#y + this.#z * this.#z);
	}

	normalized() {
		let scalar = (1 / (this.length() || 1));

		this.#x *= scalar;
		this.#y *= scalar;
		this.#z *= scalar;

		return this;
	}

	static add(v1, v2) {
		return new Vector3(
			v1.x + v2.x,
			v1.y + v2.y,
			v1.z + v2.z
		);
	}

	static subtract(v1, v2) {
		return new Vector3(
			v1.x - v2.x,
			v1.y - v2.y,
			v1.z - v2.z
		);
	}

	static multiply(v1, num) {
		return new Vector3(
			v1.x * num,
			v1.y * num,
			v1.z * num
		);
	}

	static divide(v1, v2) {
		return new Vector3(
			v1.x / v2.x,
			v1.y / v2.y,
			v1.z / v2.z
		);
	}

	static distance(v1, v2) {
		return Math.sqrt(
			Math.pow(v1.x - v2.x, 2) +
			Math.pow(v1.y - v2.y, 2) +
			Math.pow(v1.z - v2.z, 2)
		);
	}

	// GETTER
	get x() { return this.#x; }
	get y() { return this.#y; }
	get z() { return this.#z; }
}