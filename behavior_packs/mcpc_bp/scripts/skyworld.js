//© 2026 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

import { Vector3 } from "./vector3.js";
import { world, system, BlockVolume} from "@minecraft/server"; //, BlockVolumeBase
import { PlotSystem } from "./plotsystem.js";

const plotsystem = new PlotSystem;
const skyworld_fake_user_id = "-1"; //fake userid for worldspawn plot claims
const skyworld_fake_user_name = "PlotClaim-SkyWorld"; //fake username for worldspawn plot claims
const skyworld_max_plot_distance = 100000; //maximum distance from world center where plots can be claimed at initial spawn
const skyworld_worldcenter_tickingarea_name = "SKYWORLD_WORLDSPAWN";
const structurelist = [ "skyworld", "endisland1",
						"coalisland1","coalisland2","coalisland3","coalisland4",
						"ironisland1","ironisland2","ironisland3","ironisland4",
						"iceisland1", "iceisland2", "iceisland3", "iceisland4",
					    "sandisland1", "sandisland2", "sandisland3", "sandisland4",
						"sandisland5", "sandisland6", "sandisland7",
						"dirtisland1", "dirtisland2", "dirtisland3", "dirtisland4",
						"dirtisland5", "dirtisland6", "dirtisland7", "dirtisland8",
						"dirtisland9", "dirtisland10", "dirtisland11", "dirtisland12"];

let SKYWORLDMODE = false; //false = disable skyworldmode gameplay by default 

const DP_SKYWORLDMODE = "SW_MODE"; 

function block_set(X, Y, Z, blocktype ) {
    const overworld = world.getDimension("overworld"); // gets the dimension of type overworld.
	
    const block = overworld.getBlock({ x: X, y: Y, z: Z }); // get the block at the current loop coordinates.
    if (block) {
		block.setType(blocktype); // if the block is loaded, set it to cobblestone.
	}
}

function waitTicks(ticks) {
    return new Promise((resolve) => {
        system.runTimeout(resolve, ticks);
    });
}

function generateTree(pos, height = 5) {

    let log = "minecraft:oak_log"; 
    let leaves = "minecraft:oak_leaves"; 

	let randomgtreetype = Math.floor(Math.random() * 4);
	if (randomgtreetype ==1){
		log = "minecraft:birch_log"; 
		leaves = "minecraft:birch_leaves"; 
	}
	if (randomgtreetype ==2){
		log = "minecraft:dark_oak_log"; 
		leaves = "minecraft:dark_oak_leaves"; 
	}
	if (randomgtreetype ==3){
		log = "minecraft:cherry_log"; 
		leaves = "minecraft:cherry_leaves"; 
	}
	
    // Bladeren (simpele bol)
    const leafRadius = 3;
    const topY = pos.y + height;

    for (let x = -leafRadius; x <= leafRadius; x++) {
        for (let y = -leafRadius; y <= leafRadius; y++) {
            for (let z = -leafRadius; z <= leafRadius; z++) {
                const distance = Math.sqrt(x*x + y*y + z*z);
                if (distance <= leafRadius) {
                    block_set(pos.x + x, topY + y, pos.z + z, leaves );
                }
            }
        }
    }
	
    // Stam
    for (let y = 0; y < height; y++) {
        block_set(pos.x, pos.y + y, pos.z, log);
    }


}

function location_to_long_string(locationvector){
	const x = locationvector.x;
	const y = locationvector.y;
	const z = locationvector.z;

	const xsign = (Math.sign(x) == 1) ? "+" : "-";
	const ysign = (Math.sign(y) == 1) ? "+" : "-";
	const zsign = (Math.sign(z) == 1) ? "+" : "-";

	const locationstring = xsign + Math.abs(x).toString().padStart(5, "0") + zsign+Math.abs(z).toString().padStart(5, "0") + ysign+Math.abs(y).toString().padStart(5, "0");
	
	return locationstring;
}

function ninehash(string_to_hash){
	let hash = 0;
	let string = string_to_hash;

	while(Math.abs(hash).toString().length < 9){
	  string =  string+hash.toString();
	  for (const char of string) {
		hash = (hash << 5) - hash + char.charCodeAt(0);
		hash |= 0; // Constrain to 32bit integer
	  }
	}
	
	return Math.abs(hash).toString().substring(0,9); //return a 9 char long hash
}

function generate_big_island(island_location) {
	// Try StructureManager API first (preferred). If not available or fails.
	const overworld = world.getDimension("overworld");
	const x = island_location.x;
	const y = island_location.y;
	const z = island_location.z;

	system.run(() => {
		world.structureManager.place("skyworld",
			overworld,
			{x: x-16, y: y-64, z: z-16},
			{rotation: "None"});
	});

}

function generate_end_island(island_location) {
	// Try StructureManager API first (preferred). If not available or fails.
	const overworld = world.getDimension("overworld");
	const x = island_location.x;
	const y = island_location.y;
	const z = island_location.z;

	system.run(() => {
		world.structureManager.place("endisland1",
			overworld,
			{x: x-16, y: y, z: z-16},
			{rotation: "None"});
	});
}


function cleanup_plot(plot){
	
	const overworld = world.getDimension("overworld");
	const plotvolume = plotsystem.plot_to_plotvolume(plot);
	const filloptions = {
	//	 ignoreChunkBoundErrors: true 
	};
				
	//first we cleanup the entire plot, because other players may have build structures.
	//bud due to volume (max blocks) limitations we need to clean up in 3 segments.
	let fillfrom = new Vector3(plotvolume.from.x , -64, plotvolume.from.z);
	let fillto = new Vector3(plotvolume.to.x, 63, plotvolume.to.z);			
	let myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:air", filloptions);
	fillfrom = new Vector3(plotvolume.from.x , 64, plotvolume.from.z);
	fillto = new Vector3(plotvolume.to.x, 191, plotvolume.to.z);			
	myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:air", filloptions);
	fillfrom = new Vector3(plotvolume.from.x , 192, plotvolume.from.z);
	fillto = new Vector3(plotvolume.to.x, 319, plotvolume.to.z);			
	myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:air", filloptions);	
}

function generate_random_islands(){
	//generate random islands in the sky above the plots, to make it more fun to fly around and explore
	const overworld = world.getDimension("overworld");	
	system.runTimeout(() => {	
		//generate 20 small ice islands at height 224-300
		for (let i=0; i<20; i++){
			let rotation="";
			switch (Math.floor(Math.random() * 4)) {
				case 0:	rotation = "None"; break;
				case 1:	rotation = "Rotate180"; break;
				case 2:	rotation = "Rotate270"; break;
				case 3:	rotation = "Rotate90"; break;
			}
			//random vector x and z and y between -5000 and 5000
			let randomx = Math.floor(Math.random() * 10000) -5000;
			//make sure randomx is not between -256 and 256, to avoid generating islands too close to world center
			if (randomx > -256 && randomx < 256){
				randomx = randomx + (randomx < 0 ? -256 : 256);
			}
			let randomz = Math.floor(Math.random() * 10000) -5000;
			//make sure randomz is not between -256 and 256, to avoid generating islands too close to world center
			if (randomz > -256 && randomz < 256){
				randomz = randomz + (randomz < 0 ? -256 : 256);
			}
			let randomy = Math.floor(Math.random() * (300 - 224 + 1)) + 224;
			let tickingarea = {
				dimension: overworld, 
				from: {x : randomx, y: randomy, z: randomz},
				to: {x : randomx+5, y: randomy+5, z: randomz+5}
			};
			let tickingareaname = "SMALLICEISLAND_"+i.toString();

			world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then(
			function(result) { //as soon as the the tickingerea is loaded
				console.info("generating small ice island at x:" + randomx + " y:" + randomy + " z:" + randomz + " rotation: " + rotation);
				world.structureManager.place("iceisland1",
				overworld,{ 
					x: randomx, 
					y: randomy, 
					z: randomz
				}, {rotation: rotation});
				world.tickingAreaManager.removeTickingArea(tickingareaname); //remove ticking area again, we only needed it to load the chunks for structure placement
			});	
		}

		//generate 4 random big iceislands for every quadrant 1, at height 224-300
		for (let i=0; i<4; i++){
			
			let randomislandtype = Math.floor(Math.random() * 3) + 2;
			let rotation="";
			switch (Math.floor(Math.random() * 4)) {
				case 0:	rotation = "None"; break;
				case 1:	rotation = "Rotate180"; break;
				case 2:	rotation = "Rotate270"; break;
				case 3:	rotation = "Rotate90"; break;
			}
			//random vector x and z and y between 192 and 300
			let randomx = Math.floor(Math.random() * 2048) + 1512;
			let randomz = Math.floor(Math.random() * 2048) + 1512;
			let randomy = Math.floor(Math.random() * (300 - 224 + 1)) + 224;
			if (i==1){ {randomx = randomx * -1;} } //island in quadrant 2
			if (i==2){ {randomx = randomx * -1; randomz = randomz * -1;} } //island in quadrant 3
			if (i==3){ {randomz = randomz * -1;} }//island in quadrant 4

			let tickingarea = {
				dimension: overworld, 
				from: {x : randomx, y: randomy, z: randomz},
				to: {x : randomx+32, y: randomy+32, z: randomz+32}
			};
			let tickingareaname = "BIGICEISLAND_"+i.toString();

			world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then(
			function(result) { //as soon as the the tickingerea is loaded
				console.info("generating random bigice island at x:" + randomx + " y:" + randomy + " z:" + randomz + " rotation: " + rotation + " type: " + randomislandtype);
				world.structureManager.place("iceisland"+randomislandtype.toString(),
				overworld,{ 
					x: randomx, 
					y: randomy, 
					z: randomz
				}, {rotation: rotation});
				world.tickingAreaManager.removeTickingArea(tickingareaname); //remove ticking area again, we only needed it to load the chunks for structure placement
			});	
		}	

		//generate 40 small sand islands at height 144-192
		for (let i=0; i<40; i++){
			let rotation="";
			switch (Math.floor(Math.random() * 4)) {
				case 0:	rotation = "None"; break;
				case 1:	rotation = "Rotate180"; break;
				case 2:	rotation = "Rotate270"; break;
				case 3:	rotation = "Rotate90"; break;
			}
			//random vector x and z and y between -5000 and 5000 
			let randomx = Math.floor(Math.random() * 10000) -5000;
			//make sure randomx is not between -256 and 256, to avoid generating islands too close to world center
			if (randomx > -256 && randomx < 256){
				randomx = randomx + (randomx < 0 ? -256 : 256);
			}
			let randomz = Math.floor(Math.random() * 10000) -5000;
			//make sure randomz is not between -256 and 256, to avoid generating islands too close to world center
			if (randomz > -256 && randomz < 256){
				randomz = randomz + (randomz < 0 ? -256 : 256);
			}
			let randomy = Math.floor(Math.random() * (192 - 144 + 1)) + 144;
			let tickingarea = {
				dimension: overworld, 
				from: {x : randomx, y: randomy, z: randomz},
				to: {x : randomx+5, y: randomy+5, z: randomz+5}
			};
			let tickingareaname = "SMALLSANDISLAND_"+i.toString();

			world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then(
			function(result) { //as soon as the the tickingerea is loaded
				console.info("generating small sand island at x:" + randomx + " y:" + randomy + " z:" + randomz + " rotation: " + rotation);
				world.structureManager.place("sandisland1",
				overworld,{ 
					x: randomx, 
					y: randomy, 
					z: randomz
				}, {rotation: rotation});
				world.tickingAreaManager.removeTickingArea(tickingareaname); //remove ticking area again, we only needed it to load the chunks for structure placement
			});	
		}
	}, 60);

	system.runTimeout(() => {
		//generate 8 random big sandislands for every quadrant 2, at height 144-192
		for (let i=0; i<8; i++){
			let randomislandtype = Math.floor(Math.random() * 6) + 2;
			let rotation="";
			switch (Math.floor(Math.random() * 4)) {
				case 0:	rotation = "None"; break;
				case 1:	rotation = "Rotate180"; break;
				case 2:	rotation = "Rotate270"; break;
				case 3:	rotation = "Rotate90"; break;
			}
			//random vector x and z and y between 144 and 192
			let randomx = Math.floor(Math.random() * 3096) + 512;
			let randomz = Math.floor(Math.random() * 3096) + 512;
			let randomy = Math.floor(Math.random() * (192 - 144 + 1)) + 144;
			switch (i) {
				case 0:	randomx = randomx * -1; break; //island in quadrant 1
				case 1:	randomx = randomx * -1; break; //island in quadrant 1
				case 2:	randomx = randomx * -1; randomz = randomz * -1; break; //island in quadrant 2
				case 3:	randomx = randomx * -1; randomz = randomz * -1; break; //island in quadrant 2
				case 4:	randomz = randomz * -1; break; //island in quadrant 3
				case 5:	randomz = randomz * -1; break; //island in quadrant 3
			}

			let tickingarea = {
				dimension: overworld, 
				from: {x : randomx, y: randomy, z: randomz},
				to: {x : randomx+32, y: randomy+32, z: randomz+32}
			};
			let tickingareaname = "BIGSANDISLAND_"+i.toString();

			world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then(
			function(result) { //as soon as the the tickingerea is loaded
				console.info("generating random bigsand island at x:" + randomx + " y:" + randomy + " z:" + randomz + " rotation: " + rotation + " type: " + randomislandtype);
				world.structureManager.place("sandisland"+randomislandtype.toString(),
				overworld,{ 
					x: randomx, 
					y: randomy, 
					z: randomz
				}, {rotation: rotation});
				world.tickingAreaManager.removeTickingArea(tickingareaname); //remove ticking area again, we only needed it to load the chunks for structure placement
			});	
		}
	}, 80);

	//to generate a lot of additinal small dirt islands we execute the code with a delay
	//to avoid max ticking area limits and to spread out the chunk generation and structure placement over time
	system.runTimeout(() => {
			//generate 120 small dirtislands at height 48-112
			for (let i=0; i<120; i++){
				let randomislandtype = Math.floor(Math.random() * 12) + 1;
				let rotation="";
				switch (Math.floor(Math.random() * 4)) {
					case 0:	rotation = "None"; break;
					case 1:	rotation = "Rotate180"; break;
					case 2:	rotation = "Rotate270"; break;
					case 3:	rotation = "Rotate90"; break;
				}
				//random vector x and z and y between -5000 and 5000 
				let randomx = Math.floor(Math.random() * 10000) -5000;
				//make sure randomx is not between -512 and 512, to avoid generating islands too close to world center
				if (randomx > -512 && randomx < 512){
					randomx = randomx + (randomx < 0 ? -512 : 512);
				}
				let randomz = Math.floor(Math.random() * 10000) -5000;
				//make sure randomz is not between -512 and 512, to avoid generating islands too close to world center
				if (randomz > -512 && randomz < 512){
					randomz = randomz + (randomz < 0 ? -512 : 512);
				}
				let randomy = Math.floor(Math.random() * (112 - 48 + 1)) + 48;
				let tickingarea = {
					dimension: overworld, 
					from: {x : randomx, y: randomy, z: randomz},
					to: {x : randomx+7, y: randomy+5, z: randomz+7}
				};
				let tickingareaname = "SMALLDIRTISLAND_"+i.toString();

				world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then(
				function(result) { //as soon as the the tickingerea is loaded
					console.info("generating small dirt island at x:" + randomx + " y:" + randomy + " z:" + randomz + " rotation: " + rotation + " type: " + randomislandtype);
					world.structureManager.place("dirtisland" + randomislandtype.toString(),
					overworld,{ 
						x: randomx, 
						y: randomy, 
						z: randomz
					}, {rotation: rotation});
					world.tickingAreaManager.removeTickingArea(tickingareaname); //remove ticking area again, we only needed it to load the chunks for structure placement
				});	
			}
	},120);
	
}

function generate_plot(plot, isworldspawn){
	isworldspawn = isworldspawn || false;
	
	const plotvolume = plotsystem.plot_to_plotvolume(plot);
	//generate 1ste Layer
	let y = -64;
	for (let x = plotvolume.from.x ; x <= plotvolume.to.x ; x++){
		for (let z = plotvolume.from.z ; z <= plotvolume.to.z ; z++){
			let xdist = Math.abs((plotvolume.from.x + 8) - x)+1;
			let zdist = Math.abs((plotvolume.from.z + 8) - z)+1;
			let rand = Math.random();
			let randomizer = (((rand)*16) / (xdist+zdist) );
			if (randomizer > 2)
			{
				block_set(x,y,z, "minecraft:stone");
			}
			else
			{
				block_set(x,y,z, "minecraft:air");
			}
		}
	}
	//generate 2e Layer
	y = -63;
	for (let x = plotvolume.from.x ; x <= plotvolume.to.x ; x++){
		for (let z = plotvolume.from.z ; z <= plotvolume.to.z ; z++){
			let xdist = Math.abs((plotvolume.from.x + 8) - x)+1;
			let zdist = Math.abs((plotvolume.from.z + 8) - z)+1;
			let rand = Math.random();
			let randomizer = (((rand)*16) / (xdist+zdist) );
			if (randomizer > 1.75)
			{
				if (randomizer > 3.5)
				{
					block_set(x,y,z, "minecraft:coal_ore");
				}
				else	
				{
					if (randomizer < 1.8 )
					{
						block_set(x,y,z, "minecraft:iron_ore");
					}
					else
					{
						block_set(x,y,z, "minecraft:stone");
					}
				}
			}
			else
			{
				block_set(x,y,z, "minecraft:air");
			}				
		}
	}
	//generate 3e Layer
	y = -62;
	for (let x = plotvolume.from.x ; x <= plotvolume.to.x ; x++){
		for (let z = plotvolume.from.z ; z <= plotvolume.to.z ; z++){
			let xdist = Math.abs((plotvolume.from.x + 8) - x)+1;
			let zdist = Math.abs((plotvolume.from.z + 8) - z)+1;
			let rand = Math.random();
			let randomizer = (((rand)*16) / (xdist+zdist) );
			if (randomizer > 1.5 || (xdist + zdist < 7 ) )
			{
				if (randomizer > 3)
				{
					block_set(x,y,z, "minecraft:coal_ore");
				}
				else	
				{
					if (randomizer > 1.90 && randomizer < 2 )
					{
						block_set(x,y,z, "minecraft:iron_ore");
					}
					else
					{
						if (randomizer > 1.5 && randomizer < 1.75 )
						{
							block_set(x,y,z, "minecraft:dirt");
						}
						else
						{
							block_set(x,y,z, "minecraft:stone");
						}
					}
				}
			}
			else
			{
				block_set(x,y,z, "minecraft:air");
			}				
		}
	}
	//generate 4th Layer
	y = -61;
	for (let x = plotvolume.from.x ; x <= plotvolume.to.x ; x++){
		for (let z = plotvolume.from.z ; z <= plotvolume.to.z ; z++){
			let xdist = Math.abs((plotvolume.from.x + 8) - x)+1;
			let zdist = Math.abs((plotvolume.from.z + 8) - z)+1;
			let rand = Math.random();
			let randomizer = (((rand)*16) / (xdist+zdist) );
			if (randomizer > 1.25 || (xdist + zdist < 8 ) )
			{
				if (randomizer > 5)
				{
					block_set(x,y,z, "minecraft:copper_ore");
				}
				else	
				{
					if (randomizer < 2 )
					{
						block_set(x,y,z, "minecraft:dirt");
					}
					else
					{
						block_set(x,y,z, "minecraft:stone");
					}
				}
			}
			else
			{
				block_set(x,y,z, "minecraft:air");
			}				
		}
	}
	//generate last layer
	y = -60;
	for (let x = plotvolume.from.x ; x <= plotvolume.to.x ; x++){
		for (let z = plotvolume.from.z ; z <= plotvolume.to.z ; z++){
			let xdist = Math.abs((plotvolume.from.x + 8) - x)+1;
			let zdist = Math.abs((plotvolume.from.z + 8) - z)+1;
			let rand = Math.random();
			let randomizer = (((rand)*16) / (xdist+zdist) );
			if (randomizer > 1 || (xdist + zdist < 9 ) )
			{
				if (randomizer < 1.25 )
				{
					block_set(x,y,z, "minecraft:dirt");
				}
				else
				{
					if (randomizer < 1.5 )
					{
						block_set(x,y,z, "minecraft:sand");
					}
					else
					{
						block_set(x,y,z, "minecraft:grass_block");
						let randomgrass = Math.floor(Math.random() * 3);
						if (randomgrass == 1){block_set(x,y+1,z, "minecraft:short_grass");}
						if (randomgrass == 2){block_set(x,y+1,z, "minecraft:tall_grass");}
					}
				}
			}
			else
			{
				block_set(x,y,z, "minecraft:air");
			}				
		}
	}
	//set spawnblocks
	if (isworldspawn == false) {
		block_set(plotvolume.from.x+7,-60,plotvolume.from.z+7, "minecraft:bedrock");
		block_set(plotvolume.from.x+7,-60,plotvolume.from.z+8, "minecraft:bedrock");
		block_set(plotvolume.from.x+8,-60,plotvolume.from.z+7, "minecraft:bedrock");
		block_set(plotvolume.from.x+8,-60,plotvolume.from.z+8, "minecraft:bedrock");
	}
	
	//generate a tree
	if (isworldspawn == false) {
		generateTree({x: plotvolume.from.x+11, y: -59, z: plotvolume.from.z+11},5);
	}

	//generate small coal island above plot
	const overworld = world.getDimension("overworld");
	let randomislandtype = Math.floor(Math.random() * 4) + 1;
	let rotation="";
	switch (Math.floor(Math.random() * 4)) {
  		case 0:	rotation = "None"; break;
		case 1:	rotation = "Rotate180"; break;
		case 2:	rotation = "Rotate270"; break;
		case 3:	rotation = "Rotate90"; break;
	}
	world.structureManager.place("coalisland"+randomislandtype.toString(),
		overworld,{ 
			x: plotvolume.from.x + 2 + Math.floor(Math.random() * 7), 
			y: 32, 
			z: plotvolume.from.z + 2 + Math.floor(Math.random() * 7)
		}, {rotation: rotation});

	//generate small iron island above plot
	randomislandtype = Math.floor(Math.random() * 4) + 1;
	switch (Math.floor(Math.random() * 4)) {
  		case 0:	rotation = "None"; break;
		case 1:	rotation = "Rotate180"; break;
		case 2:	rotation = "Rotate270"; break;
		case 3:	rotation = "Rotate90"; break;
	}
	world.structureManager.place("ironisland"+randomislandtype.toString(),
		overworld,{ 
			x: plotvolume.from.x + 2 + Math.floor(Math.random() * 7), 
			y: 128, 
			z: plotvolume.from.z + 2 + Math.floor(Math.random() * 7)
		}, { rotation: rotation });


	//generate small ice island above plot
	randomislandtype = 1; //Math.floor(Math.random() * 4) + 1;
	switch (Math.floor(Math.random() * 4)) {
  		case 0:	rotation = "None"; break;
		case 1:	rotation = "Rotate180"; break;
		case 2:	rotation = "Rotate270"; break;
		case 3:	rotation = "Rotate90"; break;
	}
	world.structureManager.place("iceisland"+randomislandtype.toString(),
		overworld,{ 
			x: plotvolume.from.x + 2 + Math.floor(Math.random() * 7), 
			y: 224, 
			z: plotvolume.from.z + 2 + Math.floor(Math.random() * 7)
		}, { rotation: rotation });

}

function verify_skyworld_structures(){
	//verify if skyworld structures are available
	
	for (const structureid of structurelist){
		const structure = world.structureManager.get(structureid);
		if (!structure){
			console.error("Skyworld structure missing: " + structureid);
			return false;
		} else {
			if (!structure.isValid){
				console.error("Skyworld structure invalid: " + structureid);
				return false;
			} else {
				console.info("structure:" + structure.id + " -> size x:" + structure.size.x + " y:" + structure.size.y + " z:" + structure.size.z);
			}
		}
	}
	return true;

}

export class SkyWorld {
	
	constructor() {
		//constructor will be run at gamestartup
		system.run(() => {
			//check if skyworld gameplay mode was already enabled on this server/map
			SKYWORLDMODE = world.getDynamicProperty(DP_SKYWORLDMODE); //
			if (SKYWORLDMODE === undefined){
				SKYWORLDMODE=false; // if nothing is set, we set the value to false meaning skyworld gameplay mode is disabled
			} 

			if (SKYWORLDMODE == false){
				console.warn("Skyworld gameplay disabled");
			} else {
				if (verify_skyworld_structures() == true){
					console.info("All skyworld structures are available.");
					const tickingarea = {
						dimension: world.getDimension("overworld"), 
						from: {x : -16, y: -64, z: -16},
						to: {x : 15, y: 319, z: 15}
					};

					world.tickingAreaManager.createTickingArea(skyworld_worldcenter_tickingarea_name, tickingarea).then(
						(ticking_area_result) => { //as soon as the the tickingerea is loaded
							if (ticking_area_result) {
								console.info("Skyworld worldspawn chunks added to ticking manager: " + ticking_area_result.chunkCount + "   loaded: " + ticking_area_result.isFullyLoaded );
							}
						}
					);	

					console.warn("Skyworld gameplay enabled");
				} else {
					SKYWORLDMODE = false;
					// we do not set the dynamic property here, to avoid confusion, it remains true 
					// so on next server restart we can try again to enable skyworld gameplay mode
					console.error("Skyworld gameplay could not be enabled, missing structures.");
				}
			}
		});
	}

	EventInteract(event) {
		//we will check if the player is trying to interact with a bucket on a cauldron block on a skyworld plot
		if (SKYWORLDMODE == true) { //only execute if skyworld gameplay is enabled
			const player = event.player;
			const plot = plotsystem.location_to_plot(event.block.location);

			if(player.dimension.id == "minecraft:overworld") {
				const plot_owner = plotsystem.get_plot_owner(plot);
				if (plot_owner === undefined) {
					//nobody is the owner you can interact with blocks on this plot
				} else {
					if (plot_owner == skyworld_fake_user_id) {
						if (event.block.typeId === "minecraft:cauldron" && event.itemStack && event.itemStack.typeId === "minecraft:bucket") {
							return true; //allow interaction with bucket on cauldron block on worldspawn plot
						};
						//this.send_message(player,"Cannot interact, you dont own this plot.");
					}
				}
			}
		}
		return false; //user did not interact with a bucket on cauldron block the skyworld plots
	}
	
	
	EventSpawn (event) {
		if (SKYWORLDMODE == true) { //only execute if skyworld gameplay is enabled
			const player = event.player;
			
			// Only set start spawn on first join (not every respawn like a kill)
			if (!event.initialSpawn) return;
			
			// Only set start spawn when player does not have a plot yet
			if (plotsystem.plot_count(player) <= 0) {
				console.warn("player " + player.name  + " (" + player.id.toString() + ") has no starting plot, assigning one.");
				let distancex = 0;
				let distancez = 0;
				let plotfound = false;
				let spawnPlot;
				let randomattempts = 100; //set high to initiate distance increase at first try

				while (plotfound == false){
					//we start searching for a free plot further and further from world center.
					if (randomattempts > (10 +(distancex/100))){
						distancex = distancex + 10;
						distancez = distancez + 10;
						randomattempts=0;
					}
					//const currentusercounter = plotsystem.user_count();
					//let distancex = 10 * Math.ceil(currentusercounter/5);
					//let distancez = 10 * Math.ceil(currentusercounter/5);
					const X_sign = Math.random() < 0.5 ? -1 : 1;  // general orientation on x grid -1 (west) or 1 (east)
					const Z_sign = Math.random() < 0.5 ? -1 : 1;  // general orientation on z grid -1 (north) or 1 (south)
					spawnPlot = {
						x: Math.floor(Math.random() * (distancex * X_sign)),
						y: -64,
						z: Math.floor(Math.random() * (distancez * Z_sign))
					};

					if (plotsystem.get_plot_owner(spawnPlot) === undefined || true) {
						if (plotsystem.PlotHasOtherNeighbours(player, spawnPlot) == false ){
							console.warn(" plot found for player " + player.name + " (" + player.id.toString() + ") at (" + spawnPlot.x + "," + spawnPlot.z +")");
							plotfound = true;
						} else {
							plotfound = false;
						}
					}
					randomattempts = randomattempts + 1;
					if (distancex > skyworld_max_plot_distance){
						console.error("could not find a free spawn plot for player " + player.name + " (" + player.id.toString() + ") ");
						return;
					}
				}

				//const spawnPlotVolume = plotsystem.plot_to_plotvolume(spawnPlot);
				
				const spawnLocation = {
					x: (spawnPlot.x * 16)+8,
					y: -59,
					z: (spawnPlot.z * 16)+8
				};
				
				const tickingarea = {
					dimension: world.getDimension("overworld"), 
					from: spawnLocation,
					to: spawnLocation
				};
				
				const tickingareaname = "SPAWN_"+player.id.toString()
				world.tickingAreaManager.createTickingArea(tickingareaname, tickingarea).then( 
				function(result) { //as soon as the the tickingerea is loaded
					if (result) {
						console.warn("#spawn chunks: " + result.chunkCount + "   loaded: " + result.isFullyLoaded );
					}
					const overworld = world.getDimension("minecraft:overworld");
					system.run(() => {
						cleanup_plot(spawnPlot);
						generate_plot(spawnPlot);
						player.teleport(spawnLocation);
						player.setSpawnPoint({dimension: overworld, x: spawnLocation.x, y: spawnLocation.y, z: spawnLocation.z });
						plotsystem.claim_plot(player, spawnPlot, "SPAWN", true);
					});
					
					//player starting plot is ready, removing ticking eraa
					world.tickingAreaManager.removeTickingArea(tickingareaname);
				});	

				//make sure player inventory is empty at initial spawn
				system.run(() => {
				    const inventory = player.getComponent("minecraft:inventory");
					if (inventory && inventory.container) {
						const container = inventory.container;
						for (let i = 0; i < container.size; i++) {
							const item = container.getItem(i);
							if (item) {
								if (item.typeId != "wipo:plotclaim") {
									container.setItem(i, undefined);
								}
							}
						}
					}					
				});

			}
			else {
				console.warn("player " + player.name  + " (" + player.id.toString() + ") has a starting plot.");
			}
		}
	}
	
	SetSkyWorldMode(event, value) {
		// define the 4 world center plots
		const worldplot1 = { x: 0 , y: -64, z: 0};
		const worldplot2 = { x: -1 , y: -64, z: 0};
		const worldplot3 = { x: 0 , y: -64, z: -1};
		const worldplot4 = { x: -1 , y: -64, z: -1};

		if (value == true){
			if (SKYWORLDMODE == true){
				//skyworld gameplay is already enabled
				if (event.sourceEntity.typeId == "minecraft:player") {
					event.sourceEntity.sendMessage("§c§oSkyworld gameplay is already§r §2§lENABLED§r");
				}
				console.warn("Skyworld gameplay already enabled");
			} else {
				system.run(() => {
					if (verify_skyworld_structures() == true){
						SKYWORLDMODE = true; 
						//enable skyworld gameplay
						world.setDynamicProperty(DP_SKYWORLDMODE, true);
						system.run(() => {
							world.setDefaultSpawnLocation({ x: 8, y: -59, z: 0}); //set the default word spawnlocation
							// need to create a fake user 
							let fakeuser = {
								id : skyworld_fake_user_id,
								name : skyworld_fake_user_name,
								dimension : {id : "minecraft:overworld"},
								location : { x: 0, y: -59, z: 0}
							};
							//register the fake user
							plotsystem.EventJoin (fakeuser.id, fakeuser.name); 
							// claim the world center plots
							plotsystem.claim_plot(fakeuser, worldplot1, "WORLDSPAWN", true);
							plotsystem.claim_plot(fakeuser, worldplot2, "WORLDSPAWN", true);
							plotsystem.claim_plot(fakeuser, worldplot3, "WORLDSPAWN", true);
							plotsystem.claim_plot(fakeuser, worldplot4, "WORLDSPAWN", true);

							//enable worldspawn ticking area
							const tickingarea = {
								dimension: world.getDimension("overworld"), 
								from: {x : -16, y: -64, z: -16},
								to: {x : 15, y: -48, z: 15}
							};
							world.tickingAreaManager.createTickingArea(skyworld_worldcenter_tickingarea_name, tickingarea).then(
								function(result) { //as soon as the the tickingerea is loaded
									if (result) {
										console.info("Skyworld worldspawn chunks added to ticking manager: " + result.chunkCount + "   loaded: " + result.isFullyLoaded );
									}

									// cleanup these plots
									cleanup_plot(worldplot1);
									cleanup_plot(worldplot2);
									cleanup_plot(worldplot3);
									cleanup_plot(worldplot4);						
								
									system.runTimeout(() => {generate_big_island({ x: 0, y: 0, z: 0});}, 20);
									system.runTimeout(() => {generate_end_island({ x: 0, y: 280, z: 0});}, 40);

									//small correction to add more light to worldspawn pool
									system.runTimeout(() => {block_set(1,-21,-1, "minecraft:verdant_froglight");}, 100);
									
								}
							);
						});
						generate_random_islands();
						if (event.sourceEntity.typeId == "minecraft:player") {
							event.sourceEntity.sendMessage("§c§oSkyworld gameplay has been§r §2§lENABLED§r");
						}
						console.warn("Skyworld gameplay enabled");
					} else {
						console.error("Skyworld gameplay could not be enabled, missing structures.");
						if (event.sourceEntity.typeId == "minecraft:player") {
							event.sourceEntity.sendMessage("§c§oSkyworld gameplay has been§r §4§lDISABLED§r");
						}
					}
				});
			}
		}
		else {
			SKYWORLDMODE = false;
			//delte worldcenter ticking area
			system.run(() => {
				try {
					world.tickingAreaManager.removeTickingArea(skyworld_worldcenter_tickingarea_name);
				} catch (error) {
					console.warn("Could not remove skyworld worldcenter ticking area: " + error);
				}
			});
			//disable skyworld gameplay
			world.setDynamicProperty(DP_SKYWORLDMODE, false);
			// delete world center plot claims 
			plotsystem.deleteplot(worldplot1);
			plotsystem.deleteplot(worldplot2);
			plotsystem.deleteplot(worldplot3);
			plotsystem.deleteplot(worldplot4);
			if (event.sourceEntity.typeId == "minecraft:player") {
				event.sourceEntity.sendMessage("§c§oSkyworld gameplay has been§r §4§lDISABLED§r");
			}
			console.warn("Skyworld gameplay disabled");
		}
	}
	
	
	EventDimensionChange (event) {	
		if (SKYWORLDMODE == true) {
			const player = event.player;
			if (event.toDimension.id == "minecraft:nether") {
				console.warn(player.name +" ("+ player.id +") "+ "is going to nether, sending him back to overworld");
				const overworld = world.getDimension("minecraft:overworld");
				let spawnPoint = player.getSpawnPoint();
				if (!spawnPoint){
					spawnPoint = world.getDefaultSpawnLocation();
				}		
				player.teleport(
					{
						x: spawnPoint.x,
						y: spawnPoint.y,
						z: spawnPoint.z
					},   // location in target dimension
					{
						dimension: overworld,
						rotation: player.getRotation()
					}
				);
			}
		}
	}
	
}


