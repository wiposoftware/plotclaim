//import {world, system, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockComponentOnPlaceEvent } from "@minecraft/server";
/* @type {import("@minecraft/server").BlockCustomComponent} */
import { world, system } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { PlotSystem } from "./plotsystem.js";
import { Vector3 } from "./vector3.js";

const plotsystem = new PlotSystem;

//resource needed to teleport
const teleport_resource_list = [{typeId : "wipo:teletoken", amount: 1}];

function UI_teleport(event) {
	const player = event.player;
	const block = event.block;
	const teleportlist = plotsystem.get_teleport_list(player.id);
	
	if (!(teleportlist === undefined)) {
		const form = new ModalFormData().title("teleport to another plot");
		form.label("You can teleport to other teleports which are located on your own plots our friends plots.");
		form.label("§nAttention§r, using the teleport will cost you:\n§l 1 teletoken§r\n\n");
		form.dropdown("Select your destination", teleportlist);
		form.label("\n");
				
		form.show(player).then(r => {
		// This will stop the code when the player closes the form
			if (r.canceled) {
				//console.warn("form canceled");
				return;
			}else{
				const response = r.formValues[2];
				if (!(teleportlist[response] === undefined)) {
					// get the chosen plot from the dropdownlist
					const plot =  teleportlist[response].substring(teleportlist[response].indexOf(" | ")+3, teleportlist[response].lastIndexOf(" | "));
					let teleportlocation = plotsystem.get_teleport(plot);
					if (!(teleportlocation === undefined)){
						//teleport
						if (plotsystem.player_has_resources(event.player, teleport_resource_list, true) == true){
							/*system.run(() => {
								block.permutation.withState("wipo:teleport_light", "off");
							});*/
							system.runTimeout(() => {
								//teleport to center on top of the block
								player.teleport( { x : teleportlocation.x+0.5 , y : teleportlocation.y+1 , z : teleportlocation.z+0.5 } );
							},5);
							system.runTimeout(() => {
								//teleport sound must be run some ticks later to work
								player.playSound("mob.endermen.portal", {volume : 1.0, pitch : 1.0});
							},10);
						} else {
							plotsystem.send_message( player, "You need at least 1 teletoken to use the teleport.");
						}
					}
				}
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}else{
		plotsystem.send_message( player, "You do not have any destination teleports.");
	}
}

export class TelePort {
	//let owner_is_on_block = false;

	onPlace(event) {
		// when a this block is placed we trow in some particles
		event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
		plotsystem.set_teleport(event.block.location);
    }
	
	onPlayerDestroy(event) {
		plotsystem.delete_teleport(event.block.location);
	}

	onPlayerInteract(event) {
		// a player wants to use or activate the teleport.
		if (event.player === undefined) {
		  return;
		}
		
		console.warn( );

		//event.player.sendMessage ("you would like to use the teleport?");
		if ( plotsystem.is_owner_or_friend(event.player.id, plotsystem.location_to_plot(event.block.location))) {;
			//check if the player is on the block
			if (event.block.x == Math.floor(event.player.location.x) &&
				event.block.z == Math.floor(event.player.location.z) &&
				event.block.y+1 == Math.floor(event.player.location.y)){
				//ok player or friend is on the block, show the teleport GUI.	
				if (plotsystem.player_has_resources(event.player, teleport_resource_list, false) == true){
					UI_teleport(event);
				} else {
					plotsystem.send_message( event.player, "You need at least 1 teletoken to use the teleport.");
				}
			} else {
				plotsystem.send_message( event.player, "Step on the teleport block to activate the teleportation.");
			}
		} else {
			plotsystem.send_message( event.player, "You are not authorized to use this teleport.");
		}
	}
	
	onStepOff (event) {
		// when a player steps off the teleport block we go back to normal light emit.
		if (!(event.entity === undefined)) { // this onstepoff event also occurs when items stepoff, so we must test the entity object before
			if (!(event.entity.typeId === undefined)){
				if (event.entity.typeId == "minecraft:player"){
					//do some nice stuuf
					try {
						event.block.setPermutation(event.block.permutation.withState("wipo:teleport_light", "off"));
					} catch (error) {
						// we must catch this because when we teleport far away the chunk may already be unloaded
					}
				}
			}
		}
	}
	
	onStepOn (event) {
		// when a player steps on the teleport block we change the block state so it will emit more light. we also trow in some extra particles.
		if (!(event.entity === undefined)) { // this onstepon event also occurs when items stepoff, so we must test the entity object before
			if (!(event.entity.typeId === undefined)){
				if (event.entity.typeId == "minecraft:player"){
					//do some nice stuuf
					event.block.setPermutation(event.block.permutation.withState("wipo:teleport_light", "on"));
					event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
					event.dimension.spawnParticle("wipo:teleport2_particle", event.block.center());
				}
			}
		}
	}
	
	onTick(event) {
		// the particles "loop" element in the particles json file does not seem to work with the spawnParticle api function.
		// so this is my workarround to make particles loop unlimited until the block is destroyed
		// the blocks tick event is set to 3sec (loop) and a particle emitter is timed to last for 3 sec.
		event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
		event.dimension.spawnParticle("wipo:teleport2_particle", event.block.center());
	}
	
	beforeOnPlayerPlace(event) {
		//teleport placing rules. 
		//	- must be in overworld
		//  - must be inside your own plot
		//  - only 1 teleport per plot
		if(event.dimension.id == "minecraft:overworld") {
			if (plotsystem.is_owner(event.player.id, plotsystem.location_to_plot(event.block.location))) {
				// you are the owner, now we must check if you already placed a teleport in this plot. (max 1 teleport per plot allowed)
				const plotvolume = plotsystem.location_to_plotvolume(event.block.location);
				const filter = {includeTypes : ["wipo:teleport"]};
				const teleportblocks = event.dimension.getBlocks(plotvolume,filter);
				if (teleportblocks.getCapacity() == 0) { //check zero teleports are on this plot
					return; //ok we passed all the rules, exit and block will be placed.
				};
			}
		}
		// if we come to this point we did not pass the placing rules. so cancel the block placement
		event.cancel = true;
		plotsystem.send_message( event.player, "A teleport can only be placed inside your own plot. And you can only place 1 teleport per plot.")

	}
}
