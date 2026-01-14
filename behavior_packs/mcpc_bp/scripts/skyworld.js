//© 2026 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

import { Vector3 } from "./vector3.js";
import { world, system, TickingAreaManager, BlockVolume, BlockVolumeBase} from "@minecraft/server";
import { PlotSystem } from "./plotsystem.js";

const plotsystem = new PlotSystem;

let SKYWORLDMODE = false; //false = disable skyworldmode gameplay by default 

const DP_SKYWORLDMODE = "SW_MODE"; 

function block_set(X, Y, Z, blocktype ) {
    const overworld = world.getDimension("overworld"); // gets the dimension of type overworld.
	
    const block = overworld.getBlock({ x: X, y: Y, z: Z }); // get the block at the current loop coordinates.
    if (block) {
		block.setType(blocktype); // if the block is loaded, set it to cobblestone.
	}
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
	const locationstring = location_to_long_string(island_location);
	const locationhash = ninehash(locationstring);
	const worldseed = world.seed;
	const worldhash = ninehash(worldseed);
	
	console.warn (locationstring);
	console.warn (locationhash);
	console.warn (worldseed);
	console.warn (worldhash);	

}

function generate_worldcenter(){
	const overworld = world.getDimension("overworld");
	
	let fillfrom = new Vector3(-13, -60, -8);
	let fillto = new Vector3(13, -60, 8);	
	let myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:grass_block");
	
	fillfrom = new Vector3(-8, -60, -13);
	fillto = new Vector3(8, -60, 13);	
	myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:grass_block");
	
	fillfrom = new Vector3(-12, -61, -12);
	fillto = new Vector3(12, -61, 12);	
	myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:stone");

	fillfrom = new Vector3(-11, -62, -11);
	fillto = new Vector3(11, -62, 11);	
	myarea = new BlockVolume(fillfrom, fillto);
	overworld.fillBlocks(myarea, "minecraft:stone");
	
	for ( let x = -12 ; x <=12; x++){
		for ( let z = -12; z <= 12; z++){
			let y = Math.random() < 0.1 ? -59 : -60;
			if (Math.random() < 0.1){
				block_set(x,y,z, "minecraft:sand");
			}
		}
	}
	
}

function cleanup_plot(plot, isworldspawn){
	isworldspawn = isworldspawn || false;
	
	const overworld = world.getDimension("overworld");
	const plotvolume = plotsystem.plot_to_plotvolume(plot);
	const filloptions = {
		 ignoreChunkBoundErrors: true 
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
		block_set(plotvolume.from.x+8,-60,plotvolume.from.z+8, "minecraft:bedrock");
		block_set(plotvolume.from.x+8,-60,plotvolume.from.z+9, "minecraft:bedrock");
		block_set(plotvolume.from.x+9,-60,plotvolume.from.z+8, "minecraft:bedrock");
		block_set(plotvolume.from.x+9,-60,plotvolume.from.z+9, "minecraft:bedrock");
	}
	
	//generate a tree
	if (isworldspawn == false) {
		generateTree({x: plotvolume.from.x+11, y: -59, z: plotvolume.from.z+11},5);
	}
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
				console.warn("Skyworld gameplay enabled");
			}
		});
		
	}
	
	
	EventSpawn (event) {
		if (SKYWORLDMODE == true) { //only execute if skyworld gameplay is enabled
			const player = event.player;
			
			// Only set start spawn on first join (not every respawn like a kill)
			//if (!event.initialSpawn) return;
			
			// Only set start spawn when player does not have a plot yet.
			let plotcount = plotsystem.plot_count(player);

			if (plotcount <= 0) {
				
				const currentusercounter = plotsystem.user_count();
				console.warn("registered users: " + currentusercounter.toString());
				let distancex = 10 * Math.ceil(currentusercounter/5);
				let distancez = 10 * Math.ceil(currentusercounter/5);
				const xgrid = Math.random() < 0.5 ? -1 : 1;  // general orientation on x grid -1 or 1
				const zgrid = Math.random() < 0.5 ? -1 : 1;  // general orientation on z grid -1 or 1
				let minx = 4 * xgrid
				let maxx = distancex * xgrid
				let minz = 4 * zgrid
				let maxz = distancez * zgrid
				
				const spawnPlot = {
					x: minx + Math.floor(Math.random() * (maxx-minx)),
					y: -64,
					z: minz + Math.floor(Math.random() * (maxz-minz))
				};
				const spawnPlotVolume = plotsystem.plot_to_plotvolume(spawnPlot);
				
				const spawnLocation = {
					x: (spawnPlot.x * 16)+9,
					y: -59,
					z: (spawnPlot.z * 16)+9
				};
				
				console.warn("tying new spawn location:   " + spawnPlot.x.toString() + " ; " + spawnPlot.y.toString() + " ; " + spawnPlot.z.toString() );
				
				const tickingarea = {
					dimension: world.getDimension("overworld"), 
					from: spawnLocation,
					to: spawnLocation
				};
				
				world.tickingAreaManager.createTickingArea("SPAWN_"+player.id.toString(), tickingarea).then( 
				function(result) { //as soon as the the tickingerea is loaded
					console.warn("#spawn chunks: " + result.chunkCount + "   loaded: " + result.isFullyLoaded );
					system.run(() => {
						cleanup_plot(spawnPlot);
						generate_plot(spawnPlot);
						player.teleport(spawnLocation);
						
						plotsystem.claim_plot(player, spawnPlot, "SPAWN", true);
					});
										
					world.tickingAreaManager.removeAllTickingAreas();
				});	
				
			}
			else {
				console.warn("player " + player.name  + " (" + player.id.toString() + ") has a starting plot.");
			}
		}
	}
	
	SetSkeyWorldMode(event, value) {

		if (value == true){
			SKYWORLDMODE = true; 
			//enable skyworld gameplay
			world.setDynamicProperty(DP_SKYWORLDMODE, true);
			system.run(() => {
				world.setDefaultSpawnLocation({ x: 0, y: -59, z: 0}); //set the default word spawnlocation
				
				// define the 4 world plots
				let worldplot1 = { x: 0 , y: -64, z: 0};
				let worldplot2 = { x: -1 , y: -64, z: 0};
				let worldplot3 = { x: 0 , y: -64, z: -1};
				let worldplot4 = { x: -1 , y: -64, z: -1};
				
				// cleanup these plots
				cleanup_plot(worldplot1, true);
				cleanup_plot(worldplot2, true);
				cleanup_plot(worldplot3, true);
				cleanup_plot(worldplot4, true);
				
				// add some randomness
				generate_plot(worldplot1, true);
				generate_plot(worldplot2, true);
				generate_plot(worldplot3, true);
				generate_plot(worldplot4, true);
				
				// generate world center
				generate_worldcenter();
				generate_big_island({ x: 0, y: 0, z: 0});
				
			});
			if (event.sourceEntity.typeId == "minecraft:player") {
				event.sourceEntity.sendMessage("§c§oSkyworld gameplay has been§r §2§lENABLED§r");
			}
			console.warn("Skyworld gameplay enabled");
		}
		else {
			SKYWORLDMODE = false;
			//disable skyworld gameplay
			world.setDynamicProperty(DP_SKYWORLDMODE, false);
			if (event.sourceEntity.typeId == "minecraft:player") {
				event.sourceEntity.sendMessage("§c§oSkyworld gameplay has been§r §4§lDISABLED§r");
			}
			console.warn("Skyworld gameplay disabled");
		}
	}
	
	
	EventDimensionChange (event) {
		console.warn("enter dimensionchange" + event.toDimension.id);
		
		if (SKYWORLDMODE == true) {
			const player = event.player;
			if (event.toDimension.id == "minecraft:nether") {
				console.warn("going to nether");
				const overworld = world.getDimension("minecraft:overworld");
				let spawnPoint = player.getSpawnPoint();
				if (!spawnPoint){
					spawnPoint = world.getDefaultSpawnLocation();
				}		
				console.warn(spawnPoint);
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


