//© 2025 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

import { Vector3 } from "./vector3.js";
import { world, system} from "@minecraft/server";



let WORLDLIMIT = -1; //the size or limit of the world, amount of blocks in X and Z direction.
let WARNINGZONE = -1;  // this is the zone 32 blocks before the worldlimit
let DANGERZONE = -1; // this is the zone 32 blocks after the worldlimit

let NETHERRATIO = 8; //the ratio between overworld and nether, on a normal map this value is 8
let NETHERLIMIT = -1; //same as worldlimit but for neither but calculated with the ratio
let NETHERWARNINGZONE = -1; // the warningzone in the nether calculated with ratio
let NETHERDANGERZONE = -1; // the dangerzone in the nether calculated with ratio

const DP_WARNING = "WB_WARNING"; //worldborder warning message timer, for usage as time reference in dynamic property on the player
const DP_LIMIT = "WB_LIMIT"; //storing the worldborder limit in dynamic properties
const DP_NETHERRATIO = "WB_RATIO"; //storing the ratio between overworld and nether. on a normal map the cooordinates have a 8 to 1 ratio. (800 blocks in overworld = 100 blocks in nether)




function outside_worldlimit(value, dimension) {
	let CCWL; //calculate world limit
	if (dimension === undefined){dimension="minecraft:overworld";}
	
	if(dimension == "minecraft:nether") {
		CCWL = NETHERLIMIT;
	} else {
		CCWL = WORLDLIMIT;
	}
		
	if ((value >= CCWL ) || (value < -CCWL)){
		return true;
	}
	return false;
}

function showwall_x (player, xposition){
	//this function will show a particle wall on the X axis.
	//calculate offset for the wall location, direction the player is looking at.
	const distancetowall = Math.abs(xposition-player.location.x);
	const offset = Math.cos(player.getRotation().y*Math.PI/180)*distancetowall;
		
	for (let y = Math.floor(player.location.y)-5; y <= Math.floor(player.location.y)+10; y++) {
		for (let z = Math.floor(player.location.z+offset)-20; z <= Math.floor(player.location.z+offset)+20; z++) {		
			const location = new Vector3(xposition,y,z);
			if (!outside_worldlimit(z, player.dimension.id)) {
				try {
					player.dimension.spawnParticle("wipo:worldborderx", location);
				} catch (error) {
					// this may happen when we try to set a perticale outside the real world dimensions. just catch and do nothing
				} 
			}
		}
	}
}

function showwall_z (player, zposition){
	//this function will show a particle wall on the X axis.
	//calculate offset for the wall location, direction the player is looking at.
	const distancetowall = Math.abs(zposition-player.location.z);
	const offset = -Math.sin(player.getRotation().y*Math.PI/180)*distancetowall;
	
	for (let y = Math.floor(player.location.y)-5; y <= Math.floor(player.location.y)+10; y++) {
		for (let x = Math.floor(player.location.x+offset)-20; x <= Math.floor(player.location.x+offset)+20; x++) {		
			const location = new Vector3(x,y,zposition);
			if (!outside_worldlimit(x, player.dimension.id)) {
				try {		
					player.dimension.spawnParticle("wipo:worldborderz", location);
				} catch (error) {
					// this may happen when we try to set a perticale outside the real world dimensions. just catch and do nothing
				} 
			}
		}
	}
}

function ExecuteWarning(player, region){
	let location;
	
	let CCWL; //calculate world limit
	if(player.dimension.id == "minecraft:nether") {
		CCWL = NETHERLIMIT;
	} else {
		CCWL = WORLDLIMIT;
	}
	
	switch (region) {
	case "N": // play sound to the north
		location = new Vector3(player.location.x, player.location.y, -CCWL);
		break;
	case "S": // play sound to the south
		location = new Vector3(player.location.x, player.location.y, CCWL);
		break;
	case "E": // play sound to the east
		location = new Vector3(CCWL, player.location.y, player.location.z);
		break;
	case "W": // play sound to the west
		location = new Vector3(-CCWL, player.location.y, player.location.z);
		break;						
	default:
		//
	}

	const d = new Date();
	const time = d.getTime();
	const soundlocation = location;
	
	let sound_start_time = player.getDynamicProperty(DP_WARNING);
	if (sound_start_time === undefined) {sound_start_time=0;}

	if (time > sound_start_time + 40000) { //we play the sound every 40 seconds
		system.run(() => {
			//play sound
			player.playSound("wipo.worldborder", {location : soundlocation, volume : 2.0, pitch : 1.0});
			//show some nice particles
			if ((region == "N") || (region == "S")) { 
				player.dimension.spawnParticle("wipo:worldborderwarningz", location);
			} else {
				player.dimension.spawnParticle("wipo:worldborderwarningx", location);
			}
			//show warning message to player
			player.runCommand('title @s times 20 160 60');
			player.runCommand('titleraw @s title {"rawtext":[{"text":"§4§lWarning!"}]}');
			player.runCommand('titleraw @s subtitle {"rawtext":[{"text":"§c§oyou are close to the worldborder."}]}');
		});
		player.setDynamicProperty(DP_WARNING, time);
	}
}

function ExecuteDanger(player){

	system.run(() => {
		player.runCommand('title @s times 5 20 10');
		player.runCommand('titleraw @s title {"rawtext":[{"text":"§4§lDANGER!"}]}');
		player.runCommand('titleraw @s subtitle {"rawtext":[{"text":"§c§oyou crossed the worldborder, §6§lGO BACK!§r"}]}');
		player.applyDamage(1);
				
	});
	
	//start a sound with 70 chance and start it with a small random latency
	if (Math.random() > 0.3){
		const timer = Math.floor(Math.random() * 30);
		system.runTimeout(() => {
			const soundlocation = new Vector3(player.location.x, player.location.y, player.location.z);;
			player.playSound("wipo.dangerzone", {location : soundlocation, volume : 1.0, pitch : 1.0});
		}, timer);
	}
}

function ExecuteKill(player){
	system.run(() => {
		player.kill();
	});
	
	system.runTimeout(() => {
		world.sendMessage("§6§o" +player.name + "§r §4§l Died §rbecause he or she crossed the §lworldborder§r.");
	},40);
}


export class WorldBorder {
	#stillrunning;

	constructor() {
		
		this.#stillrunning = true; //we don't want our worldboard main loop (start) to run when worldborder data is not loaded yet.
		system.run(() => {
			WORLDLIMIT = world.getDynamicProperty(DP_LIMIT);
			if (WORLDLIMIT === undefined){
				WORLDLIMIT=-1; // if nothing is set, we set the value to -1 meaning worldborder is disabled
			} else {
				//else check that the worldlimit is not to small
				if (WORLDLIMIT < 1024){WORLDLIMIT=1024;} // if set below 7*16=112, we set 112 as minimum.
			}
			
			WORLDLIMIT = (Math.ceil(WORLDLIMIT/16))*16;
			
			WARNINGZONE = WORLDLIMIT - 32;  // this is the zone 32 blocks before the worldlimit
			DANGERZONE = WORLDLIMIT + 32; // this is the zone 32 blocks after the worldlimit
			
			NETHERRATIO = world.getDynamicProperty(DP_NETHERRATIO);
			if (NETHERRATIO === undefined){NETHERRATIO=8;} // if not set we fall back to default which is 8
			if (! ((NETHERRATIO == 8) || (NETHERRATIO ==1))) {NETHERRATIO=8;} //we currently only accept 8 or 1 if wrong number default to 8
			if (WORLDLIMIT == -1) {
				NETHERLIMIT = -1;
			} else {				
				NETHERLIMIT = Math.floor(WORLDLIMIT/NETHERRATIO);
				NETHERWARNINGZONE = NETHERLIMIT -32; // the warningzone in the nether calculated with ratio
				NETHERDANGERZONE = NETHERLIMIT + 32; // the dangerzone in the nether calculated with ratio			
			}
			

			
			//maybe the worldlimit and ratio value was not changed but we still save it :)
			if (WORLDLIMIT > 0) { 
				world.setDynamicProperty(DP_LIMIT, WORLDLIMIT);
				world.setDynamicProperty(DP_NETHERRATIO, NETHERRATIO);
				console.warn("worldborderlimit is set to " + WORLDLIMIT.toString());
				console.warn("worldnetherlimit is set to " + NETHERLIMIT.toString());
			} else {
				console.warn("worldborderlimits are disabled");
			}
			
			this.#stillrunning = false; //everyting is loaded so if someone called the start, the loop will execute.
		});
	}
	
	IsInWarningZone(player){
		//this fuction checks if a player is in the warning zone, the zone before the worldborder limit, and will return true if it is. 
		//this function will also show the world border walls at the worldlimit cooordinates and play an ambient sound.

		let CCWL; //calculate world limit
		let CCZO; //calculated zone

		if(player.dimension.id == "minecraft:nether") {
			CCWL = NETHERLIMIT;
			CCZO = NETHERWARNINGZONE;
		} else {
			CCWL = WORLDLIMIT;
			CCZO = WARNINGZONE;
		}
		
		let isinwarningzone = false;
		const orientation = player.getRotation();
		
		//check north
		if (( player.location.z <  -CCZO) && ( player.location.z > -CCWL )){
			// we are in the warning zone in the north of the map.
			ExecuteWarning(player, "N");
			if ((orientation.y < -50) || (orientation.y > 50)){ // if we turn our back to the wall, we do not spawn it.
				showwall_z(player, -CCWL);
			}
			isinwarningzone = true;
		}
		//check south
		if (( player.location.z >  CCZO) && ( player.location.z < CCWL )){
			// we are in the warning zone in the south of the map.
			ExecuteWarning(player, "S");
			if ((orientation.y > -130) && (orientation.y < 130)){ // if we turn our back to the wall, we do not spawn it.
				showwall_z(player, CCWL);
			}
			isinwarningzone = true;
		}
		//check east
		if (( player.location.x >  CCZO) && ( player.location.x < CCWL )){
			// we are in the warning zone in the south of the map.
			ExecuteWarning(player, "E");
			if ((orientation.y < 40) || (orientation.y > 140)){ // if we turn our back to the wall, we do not spawn it.
				showwall_x(player, CCWL);
			}
			isinwarningzone = true;
		}	
		//check west
		if (( player.location.x <  -CCZO) && ( player.location.x > -CCWL )){
			// we are in the warning zone in the south of the map.
			ExecuteWarning(player, "W");
			if ((orientation.y > -40) || (orientation.y < -140)){ // if we turn our back to the wall, we do not spawn it.
				showwall_x(player, -CCWL);
			}
			isinwarningzone = true;
		}		
		return isinwarningzone;
	}
	
	IsInSafeZone(player){
		let CCZO; //calculate zone

		if(player.dimension.id == "minecraft:nether") {
			CCZO = NETHERWARNINGZONE;
		} else {
			CCZO = WARNINGZONE;
		}
		
		
		if (( player.location.z >  -CCZO) && ( player.location.z < CCZO )){
			if (( player.location.x >  -CCZO) && ( player.location.x < CCZO )){
				return true;
			}
		}
		return false;
	}
	
	IsInKillZone(player){
		let CCZO; //calculate zone

		if(player.dimension.id == "minecraft:nether") {
			CCZO = NETHERDANGERZONE;
		} else {
			CCZO = DANGERZONE;
		}
		
		if ( (player.location.z <  -CCZO) || ( player.location.z > CCZO) || (player.location.x <  -CCZO) || ( player.location.x > CCZO ) ){
				ExecuteKill(player);
				return true;
		}
		return false;
	}
	
	
	IsInDangerZone(player){
		
		let CCWL; //calculate world limit
		let CCZO; //calculated zone

		if(player.dimension.id == "minecraft:nether") {
			CCWL = NETHERLIMIT;
			CCZO = NETHERDANGERZONE;
		} else {
			CCWL = WORLDLIMIT;
			CCZO = DANGERZONE;
		}
		
		let isindangerzone = false;
		const orientation = player.getRotation();
		
		//check north
		if (( player.location.z <  -CCWL) && ( player.location.z > -CCZO )){
			// we are in the warning zone in the north of the map.
			ExecuteDanger(player, "N");
			if ((orientation.y > -130) && (orientation.y < 130)){ // if we turn our back to the wall, we do not spawn it.
				showwall_z(player, -CCWL);
			}
			isindangerzone = true;
		}
		//check south
		if (( player.location.z >  CCWL) && ( player.location.z < CCZO )){
			// we are in the warning zone in the south of the map.
			ExecuteDanger(player, "S");
			if ((orientation.y < -50) || (orientation.y > 50)){ // if we turn our back to the wall, we do not spawn it.
				showwall_z(player, CCWL);
			}
			isindangerzone = true;
		}
		//check east
		if (( player.location.x >  CCWL) && ( player.location.x < CCZO )){
			// we are in the warning zone in the south of the map.
			ExecuteDanger(player, "E");
			if ((orientation.y > -40) || (orientation.y < -140)){ // if we turn our back to the wall, we do not spawn it.
				showwall_x(player, CCWL);
			}
			isindangerzone = true;
		}	
		//check west
		if (( player.location.x <  -CCWL) && ( player.location.x > -CCZO )){
			// we are in the warning zone in the south of the map.
			ExecuteDanger(player, "W");
			if ((orientation.y < 40) || (orientation.y > 140)){ // if we turn our back to the wall, we do not spawn it.
				showwall_x(player, -CCWL);
			}
			isindangerzone = true;
		}		
		return isindangerzone;		
	}
	

	EventBreakBlock (event) {
		//this event should trigger when a player breaks a block
		if (WORLDLIMIT > 0) { // if worldborder is enabled
			const block = event.block;
			if (outside_worldlimit(block.location.x, event.player.dimension.id) || outside_worldlimit(block.location.z, event.player.dimension.id)) {
				event.cancel = true;
			}
		}
	}
	
	EventPlaceBlock(event) {
		//this event should trigger when a player places a block
		//we do a little trick here. we give placing block 1 extra space so they can be build right after the border. 
		//This way players that reach the border can build there nametags.
		if (WORLDLIMIT > 0) { // if worldborder is enabled
			const block = event.block;
			const newx = block.location.x - Math.sign(block.location.x);
			const newz = block.location.z - Math.sign(block.location.z);
			if (outside_worldlimit(newx, event.player.dimension.id) || outside_worldlimit(newz,event.player.dimension.id)) {
				event.cancel = true;
			}
		}
	}

	EventExplosion(event) {
		//this event should trigger when somethings explodes.
		//can put there nametags.
		if (WORLDLIMIT > 0) { // if worldborder is enabled
			const block = event.source;
			if (outside_worldlimit(block.location.x, block.dimension.id) || outside_worldlimit(block.location.z, block.dimension.id)) {
				event.cancel = true;
			}
		}
	}
	
	ChangeWorldBorder(event, limit, netherratio) {
		//this function should trigger when the custom command is executed by a player (admin)
		//this funtion will change the current worldborder limits and store it to the dynamic properties.
		
		if (netherratio === undefined){ 
			// this parameter is optional, if it is not given, we set to default (8)	
			netherratio = 8;
		} else {
			if (! ((netherratio == 8) || (netherratio ==1))) {
				event.sourceEntity.sendMessage("§4§lERROR:§r "+"Netherratio is optional, but if provided it must be 8 or 1. Where 8 equales the default or normal overworld to nether ratio for all normal minecraft maps. The value 1 can be provided for modified micraft maps where level.dat has been changed.");
				event.sourceEntity.sendMessage("§c§oWorldborder not set§r");
				return;
			}
		}
	
		if (limit < 1024) {
			event.sourceEntity.sendMessage("§4§lERROR:§r The worldborder (limit) must be at least 1024. Lower values are not accepted.");
			event.sourceEntity.sendMessage("§c§oWorldborder not set§r");
			return;
		}	
		
		if (!Number.isInteger(limit/16)) {
			event.sourceEntity.sendMessage("§4§lERROR:§r The worldborder (limit) must be at a plural of 16. Other values are not accepted.\n Example:\n - 1024 : 16*64 -> this values is accepted.\n - 1030 : can not be devided by 16 so this value is not accepted");
			event.sourceEntity.sendMessage("§c§oWorldborder not set§r");
			return;
		}			
	
		if (limit > 1000000) {
			event.sourceEntity.sendMessage("§4§lERROR:§r The worldborder (limit) max value is 1,000,000. If you want to disable worldborder limits use the command /plotclaim:disableworldborder");
			event.sourceEntity.sendMessage("§c§oWorldborder not set§r");
			return;
		}		
		
		//set limitations for overworld
		WORLDLIMIT = limit;
		WARNINGZONE = WORLDLIMIT - 32;  // this is the zone 32 blocks before the worldlimit
		DANGERZONE = WORLDLIMIT + 32; // this is the zone 32 blocks after the worldlimit
		
		//set limitations for nether
		NETHERRATIO = netherratio
		NETHERLIMIT = Math.floor(WORLDLIMIT/NETHERRATIO);
		NETHERWARNINGZONE = NETHERLIMIT -32; // the warningzone in the nether calculated with ratio
		NETHERDANGERZONE = NETHERLIMIT + 32; // the dangerzone in the nether calculated with ratio		
		
		//save the values the dynamic properties
		world.setDynamicProperty(DP_LIMIT, WORLDLIMIT);
		world.setDynamicProperty(DP_NETHERRATIO, NETHERRATIO);
		
		if (event.sourceEntity.typeId == "minecraft:player") {
			event.sourceEntity.sendMessage("§c§o worldborder has been§r §a§lENABLED§r");
			event.sourceEntity.sendMessage("§c§o worldborder for overworld is set to§r §6§l" + WORLDLIMIT.toString() + "§r");
			event.sourceEntity.sendMessage("§c§o worldborder for nether is set to§r §6§l" + NETHERLIMIT.toString()) + "§r";
		} else {
			console.warn("worldborder has been enable");
			console.warn("worldborder for overworld is set to " + WORLDLIMIT.toString());
			console.warn("worldborder for nether is set to " + NETHERLIMIT.toString());
		}
	}
	
	DisableWorldBorder(event) {
		//setting the worldborder in game variables to -1 (= disable);
		WORLDLIMIT = -1;
		NETHERLIMIT = -1;
		//delete the worldborder settings from the dynamic properties;
		world.setDynamicProperty(DP_LIMIT, null);
		world.setDynamicProperty(DP_NETHERRATIO, null);	
		//
		
		if (event.sourceEntity.typeId == "minecraft:player") {
			event.sourceEntity.sendMessage("§c§oWorldborder has been§r §4§lDISABLED§r");
		} else {
			console.warn("worldborderlimits are disabled");
		}
	}
	
	
	start() {
		system.runInterval(() => {
			if (this.#stillrunning == false){
				this.#stillrunning = true;
				if (WORLDLIMIT > 0) { //if worldborder is not disabled. (-1 means disabled)
					const allplayers = world.getAllPlayers();
					for (let player of allplayers){ 
						if (this.IsInKillZone(player) == false) {
							if (this.IsInDangerZone(player) == false) {
								if (this.IsInWarningZone(player) == false) {
									// we should be in de safe zone :)
								}
							}
						}
					}
				}
				this.#stillrunning = false;
			} else {
				console.warn("worldborderlimits process is running slow!");
			}
		}, 60);
	}
	
}