import { Vector3 } from "./vector3.js";
import { world, system, BlockVolume, EntityComponentTypes } from "@minecraft/server";

const OVERWORLD_Y_MIN = -64;
const OVERWORLD_Y_MAX = 320;

const PLOT_SIZE = 16;
const PLOTS_PER_PERMIT = 4;
const SPAWN_PROTECTION = 45; // players cannot claim a plot that is close to worldspawn. this value is the min players distance in blocks to wordspawn.

const DIRT_COST = 8;
const LOG_COST = 4;
const PC_MSG_PREFIX = "§4§lPLOTCLAIM:§f§r ";

//dynamic properties prefixes.
const DP_PLOT = "plot_";
const DP_PLOTNAME = "plotname_";
const DP_TELEPORT = "teleport_";
const DP_USERNAME = "user_";
const DP_FRIEND = "friends_";

//teleport cost_multiplier


export class PlotSystem {
	
	
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
							if (item.typeId == resource.typeId && item.amount >= resource.amount)
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
		//argument plot is the plot vector3 (so not a world location vector3)
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
	
	
}