//© 2025 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

import { Vector3 } from "./vector3.js";
import { world, system, BlockVolume, EntityComponentTypes, ItemStack} from "@minecraft/server";

const OVERWORLD_Y_MIN = -64;
const OVERWORLD_Y_MAX = 320;

const PLOT_SIZE = 16;
const PLOTS_PER_PERMIT = 4;
const MAX_PERMIT = 4;
const SPAWN_PROTECTION = 45; // players cannot claim a plot that is close to worldspawn. this value is the min players distance in blocks to wordspawn.

const PC_MSG_PREFIX = "§4§lPLOTCLAIM:§f§r ";

//dynamic properties prefixes.
const DP_PLOT = "plot_";
const DP_PLOTNAME = "plotname_";
const DP_TELEPORT = "teleport_";
const DP_USERNAME = "user_";
const DP_FRIEND = "friends_";
const DP_PERMIT = "plot_permits";


const neighbour_protection = true; //when true players cannot claim plots next to each other unless they are mutual friends.
const explosion_protection = true; //when true a plot is protected against explosion (creepers/tnt) inside the plot.
const worldspawn_protection = true; // when true players can not claim a plot at worldspawn. this is used together with SPAWN_PROTECTION.


function block_set(X, Y, Z, blocktype ) {
    const overworld = world.getDimension("overworld"); // gets the dimension of type overworld.
	
    const block = overworld.getBlock({ x: X, y: Y, z: Z }); // get the block at the current loop coordinates.
    if (block) {
		block.setType(blocktype); // if the block is loaded, set it to cobblestone.
	}
}


export class PlotSystem {
	
	PLOTCLAIMVERSIONMESSAGE;
	
	player_has_resources(player, action_resource_list, pay) {
		if (pay === undefined){ //if pay is not given, default it to false
			pay = false;
		}
		const resourcelist = action_resource_list;
		let OK_resource_counter = 0;
		const inventory = player.getComponent(EntityComponentTypes.Inventory);
		
		if (!(resourcelist === undefined || player === undefined)){
			// ok we have a list of items to look for. now get the players inventory
			
			for (const resource of resourcelist){
				if	(!(resource.typeId === undefined || resource.amount === undefined))
				{
					for (let i = 0; i < inventory.container.size ; i++) {
						const item = inventory.container.getItem(i);
						if (!(item === undefined)){
							if (item.typeId.includes(resource.typeId) && item.amount >= resource.amount)
							{
								OK_resource_counter = OK_resource_counter+1; // ok we found this resource increase counter.
								if (pay == true) { // if we have to pay this resource we store the inventory slot and item information for later
									resource.inventory_slot = i; // save the inventory slotnumber where we found this item.
									resource.inventory_item = item;
								}
								i = inventory.container.size+1;//just exit this loop, hop to next resource.
							}
						}
					}
				}
			}
		} else {
			//if list ist empty player has all resources :)
			return true;
		}
		
			
		if (resourcelist.length == OK_resource_counter) {
			// we could find all resources needed. now check if we have to pay them.
			if (pay == true) {
				for (const resource of resourcelist){
					if (resource.amount >= resource.inventory_item.amount) {
						inventory.container.setItem(resource.inventory_slot, null);
					} else {
						resource.inventory_item.amount = resource.inventory_item.amount - resource.amount;
						inventory.container.setItem(resource.inventory_slot, resource.inventory_item);
					}	
				}
			}
			return true;
		} else {
			//so we did not find all needed resource, return false
			return false;
		}
	}
	
	send_message (who, message) {
		//this will send a message in the chat. "who" should be player or world. "message" should be a string.
		if ((who === undefined) || (message === undefined)){return;}
		
		system.run(() => {
				who.sendMessage(PC_MSG_PREFIX+message);
		});
	}

	location_to_plot (location) {
		// this function converts a world location from a vector3 to a plot location in vector3
		// the y part in a vector3 location is set to the overworld_Y_min and is generally not used by other functions.
		if (location.x === undefined || location.z === undefined) {
			console.warn ("cannot convert location to plot, undfined x/z")
			return;
		} else {
			const plot = new Vector3(
							Math.floor(location.x / PLOT_SIZE),
							OVERWORLD_Y_MIN,
							Math.floor(location.z / PLOT_SIZE));		
			return plot;
		}
	}
	
	location_to_plotvolume (location) {
		// this function converts a world location from a vector3 to a plot volume with 2 vector3
		// so it checks in which plots this location is and the gives the to en from vector for the entire plot (volume)
		if (location.x === undefined || location.z === undefined) {
			console.warn ("cannot convert location to plotvolume, undfined x/z")
			return;
		} else {
			const plot = this.location_to_plot(location);
			
			const from = new Vector3(
							plot.x * PLOT_SIZE,
							OVERWORLD_Y_MIN,
							plot.z * PLOT_SIZE);	
							
			const to = new Vector3(
							from.x + PLOT_SIZE-1,
							OVERWORLD_Y_MAX,
							from.z + PLOT_SIZE-1);				
			const plotvolume = new BlockVolume(from, to);
			return plotvolume;
		}
	}
	
	plot_string (plot) {
		//this function will convert a plot in vector3 (numbered) to a string (like "X_Z". arg plot must be a plot vector3, NOT a world location.
		const plotstring = plot.x.toString() + "_" + plot.z.toString();
		return plotstring;
	}
	
	plot_vector (plotstring) {
		//this function will convert a plotstring (like "X_Z") to a plot in vector3 (numerical)
		if (plotstring.indexOf(DP_PLOT) >= 0){
			//if the plot prefix is in the string remove it.
			plotstring = plotstring.substring(plotstring.indexOf(DP_PLOT)+ DP_PLOT.length);
		}
		const plot = new Vector3 (
							parseInt(plotstring.substring(0,plotstring.indexOf("_"))),
							OVERWORLD_Y_MIN,
							parseInt(plotstring.substring(plotstring.indexOf("_")+1)));
		return plot;
	}
	
	
	set_teleport (location) {
		//argument location is the teleport block location in the world (vector3)
		//we need get the plot from the location. and convert the plot from vector3 to a string
		const thisplot = this.plot_string(this.location_to_plot(location));
		//convert the teleport world location (vector3, numbered) to a string.
		const locationstring = location.x.toString() + "_" + location.y.toString() + "_" +  location.z.toString();
		world.setDynamicProperty(DP_TELEPORT + thisplot, locationstring);
	}
	
	delete_teleport (location) {
		//argument location is the teleport block location in the world (vector3)
		//we need get the plot from the location. and convert the plot from vector3 to a string
		const thisplot = this.plot_string(this.location_to_plot(location));
		//convert the teleport world location (vector3, numbered) to a string.
		world.setDynamicProperty(DP_TELEPORT + thisplot, null);
	}
	
	get_teleport (plot) {
		//argument plot is the plot string (so not a world location vector3)
		//this function will then return the exact world location for the teleport in this plot
		const teleportlocation = world.getDynamicProperty(plot.replace(DP_PLOT, DP_TELEPORT));
		if (!(teleportlocation === undefined)){
			const teleport = new Vector3 (
				parseInt(teleportlocation.substring(0,teleportlocation.indexOf("_"))),
				parseInt(teleportlocation.substring(teleportlocation.indexOf("_")+1,teleportlocation.lastIndexOf("_"))),
				parseInt(teleportlocation.substring(teleportlocation.lastIndexOf("_")+1)));
				return teleport;
		}
	}
	
	get_teleport_list (playerid) {
		//this funtion will build up a list with all teleports which a player can teleport to. This may be teleports in his own plots as well as teleports in friends plots.
		
		let teleportlist = [];
		
		//we must first get the list of all dynamic properties and loop the entire list.
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_id in world_dynamic_property_list) {
			let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
			//we filter on the dyn prop that are used for teleports
			if (world_dynamic_property_name.indexOf(DP_TELEPORT) >= 0) {
				// extract the plotstring from the dynamic property name 
				const plotstring = world_dynamic_property_name.substring(world_dynamic_property_name.indexOf("_")+1);
				const plot = this.plot_vector(plotstring);
				
				if (this.is_owner_or_friend(playerid, plot)) {
					const plot_owner = this.get_user_name(this.get_plot_owner(plot));
					const plot_name = this.get_plot_name(plot);
					teleportlist.push(plot_owner + " | " + DP_PLOT+plotstring + " | " + plot_name);
				}	
			}
		}
		if (teleportlist.length > 0) {
			teleportlist.sort();
			return teleportlist;
		}
	}
	
	plot_to_plotvolume (plot) {
		// this function converts a plot location from a vector3 to a plot volume with 2 vector3
		// The plot argument must be a plot location! NOT a world location. This function wille convert the plot location to the worldlocation
		// convert the plot X/Z to real world location.
		const location = new Vector3 (plot.x * PLOT_SIZE, OVERWORLD_Y_MIN, plot.z * PLOT_SIZE);
		return this.location_to_plotvolume(location);
	}
	
	get_plot_owner (plot) {
		// this function will get the plotowner, the plotowner is a playerid. plot must be a plot vector3, not a location vector3.
		if (plot.x === undefined || plot.z === undefined) {
			console.warn ("cannot get plot owner, undfined x/z")
			return;
		} else {
			const plot_owner = world.getDynamicProperty(DP_PLOT + plot.x.toString() + "_" + plot.z.toString());
			return plot_owner;
		}
	}
	
	get_plot_name (plot) {
		// this function will get the plot friendly name, plot must be a plot vector3, not a location vector3.
		if (plot.x === undefined || plot.z === undefined) {
			console.warn ("cannot get plot friendly name, undfined x/z")
		} else {
			const plotfriendlyname = world.getDynamicProperty(DP_PLOTNAME + plot.x.toString() + "_" + plot.z.toString());
			if (!(plotfriendlyname == undefined)){
				return plotfriendlyname;
			}
		}
		
		// if we could not retreive the plotname we end up here, we send back noname
		return "(noname)"; 
	}
	
	get_user_name (playerid) {
		//we store player names in dynamic properties so we can lookup user/player names even when they are offline.
		if (!(playerid === undefined)) {
			const getusername = world.getDynamicProperty(DP_USERNAME + playerid.toString());
			if (!(getusername === undefined)) {
				return getusername;
			}
		}
		
		// if we could not retreive the username we end up here, we send back noname
		return "(noname)";
	}

	user_count() {
		let usercounter = 0; 
		// loop throuh all dynamic properties and count how many users are registered on this server
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_name of world_dynamic_property_list) {
			if (world_dynamic_property_name.indexOf(DP_USERNAME) >= 0) {
				usercounter = usercounter+1;
			}
		}	
		return usercounter;
	}
	
	is_owner (playerid, plot) {
		// this function will check if the provided player is the owner of the provided plot
		if (plot.x === undefined || plot.z === undefined) {
			console.warn ("cannot verifie plot owner, plot undfined x/z");
		} else {
			if ( playerid  === undefined) {
				console.warn("cannot verifie plot owner, playerid undefined");
			} else {
				//now that we know that all values are there,
				//we check if player is owner
				const plot_owner = world.getDynamicProperty(DP_PLOT + plot.x.toString() + "_" + plot.z.toString());
				if (!(plot_owner === undefined)){
					if (plot_owner == playerid.toString()){
						// ok player is the owner, so return true
						return true;
					}
				}
			}
		}
		return false;
	}
	
	is_owner_or_friend(playerid, plot) {
		// this function will check if the provided player is the owner of the provided plot or if he/she is a friend of the owner..
		if (plot.x === undefined || plot.z === undefined) {
			console.warn ("cannot verifie plot owner or friend, plot undfined x/z");
		} else {
			if ( playerid  === undefined) {
				console.warn("cannot verifie plot owner or friend, playerid undefined");
			} else {	
				//check if player is owner
				const plot_owner = world.getDynamicProperty(DP_PLOT + plot.x.toString() + "_" + plot.z.toString());
				if (!(plot_owner === undefined)){
					if (plot_owner == playerid.toString()){
						// ok player is the owner, so return true
						return true;
					} else {
						// check if the owner of this plot has added this player to his friendslist
						const friendlist = world.getDynamicProperty(DP_FRIEND + plot_owner);
						if (!(friendlist === undefined)){
							if (friendlist.indexOf(";" + playerid.toString()) >= 0) {
								//ok the player is in the friendlist
								return true;
							}
						}
					}
				}
			}
		}	
		return false;
	}
	
	plot_count(player) {
		let plotcounter = 0; 
		// loop throuh all claimed plots and count how many plots are claimed by this player
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_name of world_dynamic_property_list) {
			if (world_dynamic_property_name.indexOf(DP_PLOT) >= 0) {
				const plotowner = world.getDynamicProperty(world_dynamic_property_name);
				if (plotowner == player.id){
					plotcounter = plotcounter+1;
				}
			}
		}	
		return plotcounter;
	}
	
	get_plot_list(player) {
		
		if (player === undefined){return;}

		let plotlist = [];

		// loop throuh all claimed plots build up a list of all plots that belong to this player
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_name of world_dynamic_property_list) {
			if (world_dynamic_property_name.indexOf(DP_PLOT) >= 0) {
				const plotowner = world.getDynamicProperty(world_dynamic_property_name);
				if (plotowner == player.id){
					const plotlocation = world_dynamic_property_name.substring(world_dynamic_property_name.indexOf("_")+1);
					const plotfriendlyname = world.getDynamicProperty(DP_PLOTNAME + plotlocation);
					plotlist.push({id : world_dynamic_property_name, name : plotfriendlyname});
				}
			}
		}
		
		return plotlist;
	}
	
	deleteplot(plot) {
		// this function will delete a plot. This means the terrain will be accessible to all players again.
		// the plot argument should be a plot vertor3 not a world location
		if (!(plot === undefined)){
			const plotstring = this.plot_string(plot);
			if (!(plotstring === undefined)){
				world.setDynamicProperty(DP_PLOT + plotstring, null);   // delete plot
				world.setDynamicProperty(DP_PLOTNAME + plotstring, null); //delete plot name
				return true;
			}
		}
		return false;
	}
	
	
	add_permit(player) {
		// this function will add a additional permit to a player 
		if (!(player === undefined)){   // check if player is defined
			//let permits = player.getDynamicProperty(DP_PERMIT) // as from v1.1 we store permits in world. for offline manipulation
			let permits = world.getDynamicProperty(DP_PERMIT+player.id.toString()) //read current permit value
			
			// just check that permits value and if needed fallback to default (1)
			if ( permits === undefined || permits < 0 ){
				permits = 1;
			}
			
			permits = permits + 1; // increase the permits
			
			// do another check on max permits
			if ( permits > MAX_PERMIT) {
				permit = MAX_PERMIT;
			}
			
			world.setDynamicProperty(DP_PERMIT+player.id.toString(), permits); // save the new permit value 
		}
	}
	
	get_permits(player) {
		// this function returns the number of permits that a player has. 
		if (!(player === undefined)){
			//const permits = player.getDynamicProperty(DP_PERMIT) // as from v1.1 we store permits in world, for offline manipulation
			const permits = world.getDynamicProperty(DP_PERMIT+player.id.toString())
			if (!(permits === undefined)){
				if (permits > 0){
					if (permits < MAX_PERMIT) {
						return permits;
					} else{
						return MAX_PERMIT; 
					}
				}
			}
		}
		// if we are here we did not pass the test and we return 1 permit. everyon always has at least 1 permit
		return 1;
	}
	
	max_permits() {
		return MAX_PERMIT;
	}
	
	get_maxclaims(player) {
			const permits = this.get_permits(player);
			const playermaxclaims = permits * PLOTS_PER_PERMIT;
			return playermaxclaims;
	}
	
	IsPlayerToCloseToWorldSpawn(player) {
		if (player === undefined){return false;}
		
		let distance=0;
		const spawnlocation = world.getDefaultSpawnLocation();
		distance = Math.abs(Math.sqrt((spawnlocation.z - player.location.z) * (spawnlocation.z - player.location.z) + (spawnlocation.x - player.location.x) * (spawnlocation.x - player.location.x)));

		if (distance >= SPAWN_PROTECTION || worldspawn_protection == false){
			return false;
		} else {
			return true;
		}
	}
	
	
	PlotHasOtherNeighbours(player, plot) {
		let neighbour = false; // ok lets start with saying there are no neighbours.
		const plotx = plot.x;
		const plotz = plot.z;
		
		if (neighbour_protection == true) { // we only need to do this check if protection is enabled.
			//loop trough all neighbouring plots
			for (let x = plotx-2; x <= plotx+2; x++) {
				for (let z = plotz-2; z <= plotz+2; z++) {
					let owner = this.get_plot_owner({x : x, z : z});
					if (owner !== undefined) { // check if plot is claimed
						// if the plot owner is not this player or it's not owned by a mutual friend we have a neighbour.
						if (this.is_owner_or_friend(player.id, {x : x, z : z}) == false) {
							neighbour = true;
						}
					}
				}			
			}
		}
	
		return neighbour;
	}
	
	claim_plot(player, plot, myplotname, skyworldstartplot){
		skyworldstartplot = skyworldstartplot || false;
		
		//before we claim the plot we do some checks, best practice is to perform the same checks in the UI and inform the player about checks that might fail in the UI.
		if(player.dimension.id == "minecraft:overworld") {
			if (this.IsPlayerToCloseToWorldSpawn(player) == false){
				// ok player wants to claim a plot, check if this is possible then claim it.
				if (this.plot_count(player) < this.get_maxclaims(player)) { // check if player is not claiming to much plots²
					if (this.get_plot_owner(plot) === undefined) { //check if this plot is already claimed
						if (this.PlotHasOtherNeighbours(player, plot) == false) { //check if there are neighbours, plots claimed by other players.
							//if no plotname is given, generate something
							if ((myplotname === undefined) || (myplotname.length==0)){
								//myplotname=generate_plotname(player);
								myplotname = "my plot";
							}
							//assign the plot to the player and save the plotname
							const plotstring = this.plot_string(plot);
							world.setDynamicProperty(DP_PLOT + plotstring, player.id);
							world.setDynamicProperty(DP_PLOTNAME + plotstring, myplotname);
							
							//mark the plot on the minecraftworld with 4 fences.
							const plotlimits = this.plot_to_plotvolume(plot);
							if (skyworldstartplot == false) {
								system.run(() => {							
									// place a fence on every corner of the plot
									block_set(plotlimits.from.x,player.location.y,plotlimits.from.z, "oak_fence");
									block_set(plotlimits.from.x,player.location.y,plotlimits.to.z, "oak_fence");
									block_set(plotlimits.to.x,player.location.y,plotlimits.from.z, "oak_fence");
									block_set(plotlimits.to.x,player.location.y,plotlimits.to.z, "oak_fence");
									
									//give the player a gift the first time he claims a plot
									//const privatechest = new ItemStack("minecraft:ender_chest", 1);
									if  (!(player.getDynamicProperty("hasreceivedgift")==1)){
										const privatechest = new ItemStack("minecraft:chest", 1);
										const player_inventory = player.getComponent(EntityComponentTypes.Inventory);
										if (player_inventory && player_inventory.container) {
											player_inventory.container.addItem(privatechest);
											player.setDynamicProperty("hasreceivedgift", 1);
											this.sendMessage(player,"Check your inventory you have got a little present.");
										}
									}
								});
							}
							// we have done everyting to claim this plot, return success
							return true;
						} else {
							console.warn("this plot has a neighbour");
						}
					} else {
						console.warn("this plot is already claimed");
					}
				} else {
					console.warn("to much plots, cannot claim plot");
				}
			} else {
				console.warn ("Cannot claim a plot to close to the worldspawn");
			}
		} else {
			console.warn ("cannot claim a plot in another dimension, only overworld is allowed");
		}
		
		// if we end up here something went wrong.
		return false;
	}
	
	get_friends(player){
		// this function will get the friends list stored in the minecraft world for a spicific player.
		// the friendlist is a flat string with ; seperated userids. (e.g.";987456321;102346789;-458976123")
		if (!(player === undefined)){
			const friends = world.getDynamicProperty(DP_FRIEND + player.id.toString());
			return friends;
		}
	}
	
	add_friend(player, friendid) {
		//this funtion will add a friend (via friendid) to the friendslist of a spicific player.
		if (player === undefined || friendid === undefined){
			return false;
		}
		
		let friendlist = this.get_friends(player);
		
		if (friendlist === undefined) {
			// friendslist is null, so just make it an empty string to start with;
			friendlist = "";
		} else {
			// check if this user is already a friend
			if ( friendlist.indexOf(friendid) >= 0) {
				// this user is already a friend -> exit
				return false;
			}
		}

		// now add the above userid to the current users friendlist
		friendlist = friendlist + ";" + friendid;
		world.setDynamicProperty(DP_FRIEND + player.id.toString(),friendlist);
	    return true;
	}
	
	delete_friend(player, friendid) {
		//this funtion will delete a friend (via friendid) from the friendslist of a spicific player.
		if (player === undefined || friendid === undefined){
			return false;
		}
		
		let friendlist = this.get_friends(player);
		
		if (friendlist === undefined) {
			// friendslist is null, so just make it an empty string to start with;
			// strange, something went wrong??
			return false;
		} else {
			// find the location of this friend in the list.
			const startindex = friendlist.indexOf(";"+friendid)
			const endindex = startindex + friendid.length + 1;
			// take all the substring (friendid) that we still need
			const dummy1 = friendlist.substring(0,startindex);
			const dummy2 = friendlist.substring(endindex);
			// build the new friendslist and push it to the world
			friendlist = dummy1+dummy2;
			if (friendlist.length == 0) {
				world.setDynamicProperty(DP_FRIEND + player.id.toString(),null);
			} else {
				world.setDynamicProperty(DP_FRIEND + player.id.toString(),friendlist);
			}
			return true;
		}
	}
	
	EventExplosion (event) {
		//this event should trigger when an explosion occurs
		if (explosion_protection == true) { // check if explosion protection is turned on
			if(event.dimension.id == "minecraft:overworld") { // explosion protection only in overworld 
				const plotowner = this.get_plot_owner(this.location_to_plot(event.source.location));
				if (!(plotowner === undefined)){ //check explosion occurs within a plot claimed by a player
					event.cancel = true; // cancel explosion
				}
			}
		}
	}
	
	EventPlaceBlock (event) {
		//this event should trigger when a player places a block 
		const player = event.player;
		
		///// this is the plot protection part, players cannot place any kind of block in another plot
		if(player.dimension.id == "minecraft:overworld") {
			const plot_owner = this.get_plot_owner(this.location_to_plot(event.block.location));
			if (plot_owner === undefined) {
				//nobody is the owner you can place blocks
			} else {
				if (plot_owner == player.id) {
					// you are to owner you can place blocks
				} else {
					event.cancel = true;
					this.send_message(player, "Cannot place block, you dont own this plot.");
				}
			}
		}
	}
	
	EventBreakBlock (event) {
		//this event should trigger when a player breaks a block
		const player = event.player;
	  
		if(player.dimension.id == "minecraft:overworld") {
			const plot_owner = this.get_plot_owner(this.location_to_plot(event.block.location));
			if (plot_owner === undefined) {
				//nobody is the owner you can place blocks
			} else {
				if (plot_owner == player.id) {
				  // you are to owner you can place blocks
				} else {
					event.cancel = true;
					this.send_message(player,"Cannot break block, you dont own this plot.");
				}
			}
		}	
	}
	
	EventInteract (event) {
		//this function should trigger when a player interacts with a block 
		const player = event.player;
			//check if a player is not spamming another players plot with water/lava buckets	
		const plot = this.location_to_plot(event.block.location);

		if(player.dimension.id == "minecraft:overworld") {
			const plot_owner = this.get_plot_owner(plot);
			
			if (plot_owner === undefined) {
				//nobody is the owner you can interact with blocks on this plot
			} else {
				if (this.is_owner_or_friend(player.id, plot)) {
				  // you are the owner or a friend you can interact with blocks on this plot
				} else {
					event.cancel = true;
					this.send_message(player,"Cannot interact, you dont own this plot.");
				}
			}
		}		
	}
	
	EventJoin (playerId, playerName) {
		//this event should trigger when a player joins or connects to the server.
		//we store the playername as a dynimc prop on the world object so that the player name can be retreived even when the player is offline
		world.setDynamicProperty(DP_USERNAME + playerId.toString(), playerName);
	}
	
	EventSpawn (event) {
		//this event should trigger when a player spawns. This will be after joining the game or after dieing.
		const player = event.player;
	
		//add the plotclaim item to the players inventory (with this item the plotclaim UI menus can be opened)
		const plotclaimitem = new ItemStack("wipo:plotclaim", 1);
		const player_inventory = player.getComponent(EntityComponentTypes.Inventory);
		if (player_inventory && player_inventory.container) {
			const player_inventory_slot = player_inventory.container.getSlot(8);
			player_inventory_slot.setItem(plotclaimitem);
			player_inventory_slot.keepOnDeath = true;
			player_inventory_slot.lockMode = true;
		}
		 
		//check if player has permits, if not set to 1. first permit is free.
		if (world.getDynamicProperty(DP_PERMIT + player.id.toString()) == null)
		{
			world.setDynamicProperty(DP_PERMIT + player.id.toString(), 1);  
		}
		
		//send the welkom message
		this.send_message(player,this.PLOTCLAIMVERSIONMESSAGE);
	}
}
	


export class ResourceList {
	#TYPEID;    			//minecraft block/item typeid e.g. "mincraft:apples" or "wipo:teleport"
	#AMOUNT;    			//the amount a items/blocks
	#TRANSLATIONKEY;		//the item/block translationkey. this key is used to display the item/block name in messages translation via language files.

	constructor(typeid, amount, tkey) {
		this.#TYPEID = typeid;
		this.#AMOUNT = amount;
		this.#TRANSLATIONKEY = tkey;
	}
	
	// GETTER
	get typeId() { return this.#TYPEID; }
	get amount() { return this.#AMOUNT; }
	get translationKey() { return this.#TRANSLATIONKEY; }
}