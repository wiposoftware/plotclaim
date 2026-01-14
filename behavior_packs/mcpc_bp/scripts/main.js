//© 2025 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

// ct:/main.js

import { world, system } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { TelePort } from "./teleport.js";
import { PlotUI } from "./plotitem.js";
import { PlotSystem } from "./plotsystem.js";
import { WorldBorder } from "./worldborder.js";
import { SkyWorld } from "./skyworld.js";

//import { MinecraftItemTypes } from "@minecraft/vanilla-data";
//import { MolangVariableMap } from "@minecraft/server";

const plotsystem = new PlotSystem;
const skyworld = new SkyWorld;
const worldborder = new WorldBorder;

plotsystem.PLOTCLAIMVERSIONMESSAGE="Welcome to §lPlotClaim§r! v2.0.0 - By WIPO"+"\n"+"§ohttps://github.com/wiposoftware/plotclaim§r"

// Create & run an interval that is called every Minecraft tick
system.runInterval(() => {
  // Spams the chat with "Hello World" with world.sendMessage function from the API
  plotsystem.send_message(world,plotsystem.PLOTCLAIMVERSIONMESSAGE);
}, 2400);

//registering all events needed to run plotclaim
system.beforeEvents.startup.subscribe((init) => {
	//register custom block components/events for the teleport block.
	console.info("registering teleport block components");
    init.blockComponentRegistry.registerCustomComponent( "wipo:teleport_components", new TelePort());
	
	//register custom item components/events for the plotclaim item.
	console.info("registering claimplot item components");
	init.itemComponentRegistry.registerCustomComponent("wipo:plotitem__components", new PlotUI());

	//register custom game commands for setting worldborder.
	const mycommand1 = {
		name: "plotclaim:setworldborder",
		description: "set the worldborder (limit)",
		permissionLevel: 2, //2 = admin
		mandatoryParameters: [{ type: "Integer", name: "limit" }], 
		optionalParameters: [{type: "Integer", name: "netherratio"}] 
	};
	init.customCommandRegistry.registerCommand(mycommand1, worldborder.ChangeWorldBorder);
	const mycommand2 = {
		name: "plotclaim:disableworldborder",
		description: "disable the worldborder (limit)",
		permissionLevel: 2, //2 = admin
	};
	init.customCommandRegistry.registerCommand(mycommand2, worldborder.DisableWorldBorder);
	
	//register custom game commands for skyworld gameplay
	const mycommand3 = {
		name: "plotclaim:setskyworld",
		description: "enable or disable the plotclaim skyworld gameplay mode",
		permissionLevel: 2, //2 = admin
		mandatoryParameters: [{ type: "Boolean", name: "value" }] 
	};
	init.customCommandRegistry.registerCommand(mycommand3, skyworld.SetSkeyWorldMode);
	
});

world.beforeEvents.explosion.subscribe((event) => {
	worldborder.EventExplosion(event);
	if (event.cancel == false) {
		plotsystem.EventExplosion(event);
	}
});

world.beforeEvents.playerPlaceBlock.subscribe((event) => {
	worldborder.EventPlaceBlock(event);
	if (event.cancel == false) {
		plotsystem.EventPlaceBlock(event);
	}
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
	worldborder.EventBreakBlock(event);
	if (event.cancel == false) {
		plotsystem.EventBreakBlock(event);
	}
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
	plotsystem.EventInteract(event);
});

world.afterEvents.playerJoin.subscribe(({playerId, playerName})=> {
	plotsystem.EventJoin(playerId, playerName);
});

world.afterEvents.playerSpawn.subscribe( event => {
	plotsystem.EventSpawn(event);
	skyworld.EventSpawn(event);
});

world.afterEvents.playerDimensionChange.subscribe(event => {
    skyworld.EventDimensionChange(event);
});


worldborder.start();


/*system.run(() => {
	world.setDynamicProperty("plot_-1_2", "0123456789");
	world.setDynamicProperty("plot_-2_2", "0123456789");
	world.setDynamicProperty("user_0123456789", "fakeuser");
    world.setDynamicProperty("teleport_-1_2", "-5_-60_38");
	world.setDynamicProperty("friends_0123456789", ";987654321;3579154862"); //;-8589934591");
});*/


//world.getAllPlayers().forEach(function (player) {
//  console.warn(player.name);
//});

//function listdynamicprop(player){
//	player.sendMessage(world.getDynamicPropertyIds());
//	player.sendMessage(player.getDynamicPropertyIds());
//}

/*world.afterEvents.chatSend.subscribe((event) => {
  const player = event.sender;
  const msg = event.message;
  //only use this in development/debug
  
  if(player.dimension.id == "minecraft:overworld") {
	if (msg == "!claim") {
		claim_plot(player, null);
	}
	if (msg == "!showclaim")
	{
		show_claims(player);
	}
	if (msg == "!drop")
	{
		drop_claim(player);
	}
	if (msg == "!flush")
	{
		world.clearDynamicProperties();
		player.clearDynamicProperties();
	}
	if (msg == "!showallclaims")
	{
		show_all_claims(player);
	}
	if (msg == "!listdynprop")
	{
		listdynamicprop(player);
	}
  }
});*/







