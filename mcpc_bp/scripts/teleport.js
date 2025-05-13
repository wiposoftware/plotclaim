//import {world, system, BlockComponentPlayerInteractEvent, BlockComponentTickEvent, BlockComponentOnPlaceEvent } from "@minecraft/server";
/* @type {import("@minecraft/server").BlockCustomComponent} */

export class teleport {

	onPlace(event) {
		console.warn("block placed");
		event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
    }

	onPlayerInteract(event) {
		if (event.player === undefined) {
		  return;
		}
		event.block.setPermutation(event.block.permutation.withState("wipo:teleport_light", "on"));
		event.player.sendMessage ("you would like to use the teleport?");
	}
	
	onStepOff (event) {
		// when a player steps off the teleport block we go back to normal light emit.
		if (event.entity.typeId == "minecraft:player"){
			event.block.setPermutation(event.block.permutation.withState("wipo:teleport_light", "off"));
		}
	}
	
	onStepOn (event) {
		// when a player steps on the teleport block we change the block stat so it will emit more light. we also trow in some extra particles.
		if (event.entity.typeId == "minecraft:player"){
			event.block.setPermutation(event.block.permutation.withState("wipo:teleport_light", "on"));
			event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
			event.dimension.spawnParticle("wipo:teleport2_particle", event.block.center());
		}
	}
	
	onTick(event) {
		// the particles "loop" element in the particles json file does not seem to work with the spawnParticle api function.
		// so this our workarround to make particles loop unlimited, until the block is destroyed
		event.dimension.spawnParticle("wipo:teleport_particle", event.block.center());
		event.dimension.spawnParticle("wipo:teleport2_particle", event.block.center());
	}
}
