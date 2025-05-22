// ct:/main.js
import { world, system, BlockPermutation, ItemStack, EntityInventoryComponent, EntityComponentTypes, ItemComponentTypes, BlockVolume, BlockComponentRegistry} from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData, MessageFormData } from "@minecraft/server-ui";
//import { MolangVariableMap } from "@minecraft/server";
import { TelePort } from "./teleport.js";


//import { MinecraftItemTypes } from "@minecraft/vanilla-data";

// Create & run an interval that is called every Minecraft tick
system.runInterval(() => {
  // Spams the chat with "Hello World" with world.sendMessage function from the API
  world.sendMessage("Welcome to PlotClaim! BETA release v1.0.3 - By WIPO");
}, 400);

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent( "wipo:teleport_components", new TelePort());
});

/*
system.run(() => {
	world.setDynamicProperty("plot_-1_2", "0123456789");
	world.setDynamicProperty("plot_-2_2", "0123456789");
    world.setDynamicProperty("teleport_-1_2", "-5_-60_38");
	world.setDynamicProperty("friends_0123456789", ";987654321;3579154862;-8589934591");
});*/

/*
world.afterEvents.playerSpawn.subscribe(event => {
    for (var ev in world.beforeEvents.explosion) {
        console.warn(ev);
    }
    //console.warn("--------------------------------------");
    //for (var ev in world.afterEvents) {
    //    console.warn(ev);
    //}
});
*/

// in minecraft the overworld Y dimensions have been changed multiple times. If in the future minecraft changes again the overworld Y dimensions
// we just need to change the underneath 2 variables and our plotclaim code is fully up to date
const OVERWORLD_Y_MIN = -64;
const OVERWORLD_Y_MAX = 320;


const PLOT_SIZE = 16;
const PLOTS_PER_PERMIT = 4;
const SPAWN_PROTECTION = 45; // players cannot claim a plot that is close to worldspawn. this value is the min players distance in blocks to wordspawn.

const DIRT_COST = 8;
const LOG_COST = 4;
const PC_MSG_PREFIX = "§4§lPLOTCLAIM:§f§r ";

const neighbour_protection = true; //when true players cannot claim plots next to each other unless they are mutual friends.
const explosion_protection = true; //when true a plot is protected against explosion (creepers/tnt) inside the plot.
const worldspawn_protection = true; // when true players can not claim a plot at worldspawn. this is used together with SPAWN_PROTECTION.

function maxclaims(player) {
	const permits = player.getDynamicProperty("plot_permits");
	if (permits > 0) {  
		const playermaxclaims = permits * PLOTS_PER_PERMIT;
		return playermaxclaims;
	} else {
		return 0;
	}
}

function location_to_plot(locationx,locationz){
  // this function converts a world location on X-Z axis to a plot location on X-Z axis.
  const x = Math.floor(locationx / PLOT_SIZE);
  const z = Math.floor(locationz / PLOT_SIZE);
  return { x, z };	
}

function getPlotCorners(PlotX, PlotZ) {
  const Xmin = PlotX*PLOT_SIZE;
  const Zmin = PlotZ*PLOT_SIZE;
  const Xmax = Xmin + PLOT_SIZE-1;
  const Zmax = Zmin + PLOT_SIZE-1;
  return { Xmin, Xmax, Zmin, Zmax };
}

function getPlotCorners_fromposition(PositionX, PositionZ) {
  const plotdata = location_to_plot(PositionX, PositionZ);
  return getPlotCorners(plotdata.x, plotdata.z)
}


//world.getAllPlayers().forEach(function (player) {
//  console.warn(player.name);
//});



world.beforeEvents.explosion.subscribe((event) => {
	if (explosion_protection == true) {
		if(event.dimension.id == "minecraft:overworld") {	
			//console.warn(event.source.id +" - "+ event.source.typeId);	
			const plot = location_to_plot(event.source.location.x, event.source.location.z);
			const plotowner = world.getDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString());
			if (!(plotowner==null)){
				event.cancel = true;
			}
		}
	}
});

world.beforeEvents.playerPlaceBlock.subscribe((event) => {
	const player = event.player;
	const block = event.block;
	const plot = location_to_plot(block.x, block.z);
	let plot_owner;
	let cancel_teleport=false;
	
	///// this is the plot protection part, players cannot place any kind of block in another plot
	if(player.dimension.id == "minecraft:overworld") {
		plot_owner = world.getDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString());
		if (plot_owner == null) {
		//nobody is the owner you can place blocks
		} else {
			if (plot_owner == player.id) {
			// you are to owner you can place blocks
			} else {
				event.cancel = true;
				system.run(() => {
					player.sendMessage(PC_MSG_PREFIX+"Cannot place block, you dont own this plot.");
				});
			}
		}
	}
});


world.beforeEvents.playerBreakBlock.subscribe((event) => {
	const player = event.player;
	const block = event.block;
	const plot = location_to_plot(block.x, block.z);
  
	if(player.dimension.id == "minecraft:overworld") {
		const plot_owner = world.getDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString());
		if (plot_owner == null) {
			//nobody is the owner you can place blocks
		} else {
			if (plot_owner == player.id) {
			  // you are to owner you can place blocks
			} else {
				event.cancel = true;
				system.run(() => {
					player.sendMessage(PC_MSG_PREFIX+"Cannot break block, you dont own this plot.");
				});
			}
		}
	}
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
	//check if a player is not spamming another players plot with water/lava buckets
	const player = event.player;
	const used_item = event.itemStack;
	const block = event.block;
	const plot = location_to_plot(block.x, block.z);

	if(player.dimension.id == "minecraft:overworld") {
		const plot_owner = world.getDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString());

		if (plot_owner == null) {
			//nobody is the owner you can use buckets
		} else {
			if (plot_owner == player.id) {
			  // you are the owner you can use buckets
			} else {
				// now check if the player is a friend of the plot owner
				let friends = world.getDynamicProperty("friends_" + plot_owner);
				if (friends == null){friends="";}
				if (friends.indexOf(";" + player.id.toString()) >= 0) {
					// yep you are a friend you can use buckets
				} else {
					event.cancel = true;
					system.run(() => {
						player.sendMessage(PC_MSG_PREFIX+"Cannot interact, you dont own this plot.");
					});
				}
			}
		}
	}
});

function* block_fillarea(startX, endX, startZ, endZ, startY, endY, blocktype ) {
    const overworld = world.getDimension("overworld"); // gets the dimension of type overworld.
    for (let x = startX; x <= endX; x++) {
		for (let y = startY; y <= endY; y++) {
            for (let z = startZ; z <= endZ; z++) {		
                const block = overworld.getBlock({ x: x, y: y, z: z }); // get the block at the current loop coordinates.
                if (block) block.setType(blocktype); // if the block is loaded, set it to cobblestone.
                // yield back to job coordinator after every block is placed
                yield;
            }
		}
    }
}

function block_set(X, Y, Z, blocktype ) {
    const overworld = world.getDimension("overworld"); // gets the dimension of type overworld.
	
    const block = overworld.getBlock({ x: X, y: Y, z: Z }); // get the block at the current loop coordinates.
    if (block) {
		block.setType(blocktype); // if the block is loaded, set it to cobblestone.
	}
}

function player_can_buy_plot(player) {
  // a player can only claim a plot if certain items are available in his inventory.
  // these items will be substracted from the inventory.
  const inventory = player.getComponent(EntityComponentTypes.Inventory);
  let log_slot = -1;  // -1 equals to no slot, or not having the item.
  let log_item = null;
  let dirt_slot = -1;
  let dirt_item = null;

  let cost_multiplier = count_claims(player)+1;
  if (cost_multiplier < 1){cost_multiplier = 1;}
  
  let needed_dirt_amount = DIRT_COST * cost_multiplier;
  if (needed_dirt_amount > 64){needed_dirt_amount = 64;}
  let needed_log_amount = LOG_COST * cost_multiplier;
  if (needed_log_amount > 64){needed_log_amount = 64;}
  
  
  // first check if the player has an empty slot to receive a gift
  if (inventory.container.emptySlotsCount >= 1) {
	// now loop all slots in the players inventory and check if we have all items we need to claim a plot
	for (let i = 0; i < inventory.container.size ; i++) {
		const item = inventory.container.getItem(i);
		if (item){
			if (item.typeId.includes("_log") && item.amount >= needed_log_amount)
			{
				log_slot = i;
				log_item = item;
			}
			if (item.typeId.includes("dirt") && item.amount >= needed_dirt_amount)
			{
				dirt_slot = i;
				dirt_item = item;
			}		
		}
	}
	// now that we looped through all items, lets check if we got everyting and remove them from the inventory.
	if (log_slot >= 0)
	{
		if (dirt_slot >= 0)
		{
			// remove or decrease the items from the players inventory
			if (needed_log_amount == log_item.amount)
			{
				log_item = null;
			}
			else
			{
				log_item.amount = log_item.amount - needed_log_amount;
			}
			inventory.container.setItem(log_slot, log_item);
			if (needed_dirt_amount == dirt_item.amount)
			{
				dirt_item = null;
			}
			else
			{
				dirt_item.amount = dirt_item.amount - needed_dirt_amount;
			}
			inventory.container.setItem(dirt_slot, dirt_item);
			// exit this function with success and claim plot
			return true;
		}
		else
		{
			player.sendMessage(PC_MSG_PREFIX+"You need at least " + needed_dirt_amount.toString() + " dirt blocks in your inventory to claim a plot.");
		}
	}
	else
	{
		player.sendMessage(PC_MSG_PREFIX+"You need at least " + needed_log_amount.toString() + " logs in your inventory to claim a plot.");
	}
  }
  else {
    player.sendMessage(PC_MSG_PREFIX+"You need 1 empty slot in your inventory before you can claim a plot.");
  }
  return false;
}

function listdynamicprop(player){
	player.sendMessage(world.getDynamicPropertyIds());
	player.sendMessage(player.getDynamicPropertyIds());
}

function count_claims(player){
	let plotcounter = 0; 
	// loop to all claimed plots and count how many plots are claimed by this player
	let world_dynamic_property_list = world.getDynamicPropertyIds();
	for (let world_dynamic_property_id in world_dynamic_property_list) {
		let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
		if (world_dynamic_property_name.indexOf("plot_") >= 0) {
			let plot = world_dynamic_property_name;
			let plotowner = world.getDynamicProperty(plot);
			if (plotowner == player.id){
				plotcounter = plotcounter+1;
			}
		}
	}	
	return plotcounter;
}

function show_all_claims(player){
	// loop to all claimed plots and count how many plots are claimed by this player
	let world_dynamic_property_list = world.getDynamicPropertyIds();
	for (let world_dynamic_property_id in world_dynamic_property_list) {
		let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
		if (world_dynamic_property_name.indexOf("plot_") >= 0) {
			const plot = world_dynamic_property_name;
			const plotowner = world.getDynamicProperty(plot);
			const plotlocation = plot.substring(plot.indexOf("_")+1);
			const plotfriendlyname = world.getDynamicProperty("plotname_" + plotlocation);
			player.sendMessage (plot + " -> " + plotowner + " : " + getPlayerName(plotowner) + " (" + plotfriendlyname +")");
		}
	}	
}

function getPlayerName(playerId){
	let playername = world.getDynamicProperty("user_" + playerId.toString());
	if (playername == null) {
		playername = "N/A";
	}
	return playername;
}

function show_claims(player, return_message) {
	if (return_message != true){
		return_message = false
	}
	let message="";
    // loop to all claimed plots and show the ones that are yours
	let world_dynamic_property_list = world.getDynamicPropertyIds();
	for (let world_dynamic_property_id in world_dynamic_property_list) {
		let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
		if (world_dynamic_property_name.indexOf("plot_") >= 0) {
			let plot = world_dynamic_property_name;
			let plotowner = world.getDynamicProperty(plot);
			if (plotowner == player.id){
				// get the X/Z values from the plotname
				const plotlocation = plot.substring(plot.indexOf("_")+1);
				const X = plotlocation.substring(0,plotlocation.indexOf("_"));
				const Z = plotlocation.substring(plotlocation.indexOf("_")+1);
				// now use these values to get the plot corners (coordinates)
				const plot_coordinates = getPlotCorners(parseInt(X), parseInt(Z));
				let plotfriendlyname = world.getDynamicProperty("plotname_" + plotlocation);
				// we are ready to show all info
				if (return_message == true){
					message = message + "\n" + plot + " --- " + plotfriendlyname +  "\n-> from(" + plot_coordinates.Xmin + "," + plot_coordinates.Zmin + ")\n-> to(" + plot_coordinates.Xmax + "," + plot_coordinates.Zmax + ")\n\n";
				}else{
					player.sendMessage(plotfriendlyname +  " -> from(" + plot_coordinates.Xmin + "," + plot_coordinates.Zmin + ") -> to(" + plot_coordinates.Xmax + "," + plot_coordinates.Zmax + ")");
				}
			}
		}
	}
	if (return_message == true){
		return message;
	}
}

function list_claims(player) {
	let plotcounter=0;
	let plotlist = [];
    // loop to all claimed plots and show the ones that are yours
	let world_dynamic_property_list = world.getDynamicPropertyIds();
	for (let world_dynamic_property_id in world_dynamic_property_list) {
		let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
		if (world_dynamic_property_name.indexOf("plot_") >= 0) {
			let plot = world_dynamic_property_name;
			let plotowner = world.getDynamicProperty(plot);
			if (plotowner == player.id){
				// get the X/Z values from the plotname
				const plotlocation = plot.substring(plot.indexOf("_")+1);
				const X = plotlocation.substring(0,plotlocation.indexOf("_"));
				const Z = plotlocation.substring(plotlocation.indexOf("_")+1);
				// now use these values to get the plot corners (coordinates)
				const plot_coordinates = getPlotCorners(parseInt(X), parseInt(Z));
				let plotfriendlyname = world.getDynamicProperty("plotname_" + plotlocation);
				if (plotfriendlyname == null) {
					plotfriendlyname = "noname";
				}
				// we are ready to show all info
				plotlist[plotcounter] = plot +" --- "+ plotfriendlyname;
				plotcounter = plotcounter + 1;
			}
		}
	}
	return plotlist;
}

function drop_claim(player) {
	if(player.dimension.id == "minecraft:overworld") {
		const player_current_plot_xz = location_to_plot(player.location.x, player.location.z);
		const player_current_plot = "plot_" + player_current_plot_xz.x.toString() + "_"  + player_current_plot_xz.z.toString(); 
		
		// loop to all claimed plots and show the ones that are yours
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_id in world_dynamic_property_list) {
			const world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
			if (world_dynamic_property_name.indexOf("plot_") >= 0) {
				const plot = world_dynamic_property_name;
				const plotowner = world.getDynamicProperty(plot);
				if (player_current_plot == plot){
					if (plotowner == player.id){
						// get the X/Z values from the plotname
						world.setDynamicProperty(plot, null);                           //set owner of plot to null (=delete value)
					    const plotlocation = plot.substring(plot.indexOf("_")+1);
						world.setDynamicProperty("plotname_" + plotlocation, null);		//set friendly name of plot to null (=delete value)
						player.sendMessage(PC_MSG_PREFIX+"Dropping this plot! Now it's available for everyone" );
					}
					else
					{
						player.sendMessage(PC_MSG_PREFIX+"Cannot drop this plot, its not yours");
					}
				}
			}
		}
	}
}

world.afterEvents.chatSend.subscribe((event) => {
  const player = event.sender;
  const msg = event.message;
  //only use this in development/debug
  /*
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
  }*/
});


function generate_plotname(player){
	//generate a unique plotname for a spefic player.
	//plotnames begin with "MY PLOT " followed by a number. this function will check the name is unique
	
	let myplotcounter=0;
	let myplotname= "MY PLOT ";
	let foundhit=true;
	
	while (foundhit==true) {
		// as long as we find a plot with the same name we keep looping and searching until we found somehting free
		foundhit = false;
		myplotcounter = myplotcounter+1;
		let world_dynamic_property_list = world.getDynamicPropertyIds();
		for (let world_dynamic_property_id in world_dynamic_property_list) {
			let world_dynamic_property_name = world_dynamic_property_list[world_dynamic_property_id];
			if (world_dynamic_property_name.indexOf("plot_") >= 0) {
				let plot = world_dynamic_property_name;
				let plotowner = world.getDynamicProperty(plot);
				if (plotowner == player.id){
					// get the X/Z values from the plotname
					const plotlocation = plot.substring(plot.indexOf("_")+1);
					const plotfriendlyname = world.getDynamicProperty("plotname_" + plotlocation);
					if (plotfriendlyname == myplotname+myplotcounter.toString()) {
						foundhit=true;
					}
				}
			}
		}
	}
	myplotname=myplotname+myplotcounter.toString();
	return myplotname;
}

function check_plot_neighbours(playerid, plotx, plotz) {
	let neighbour = false; // ok lets start with saying there are no neighbours.
	
	if (neighbour_protection == true) { // we only need to do this check if protection is enabled.
		//loop trough all neighbouring plots
		for (let x = plotx-2; x <= plotx+2; x++) {
			for (let z = plotz-2; z <= plotz+2; z++) {
				let owner = world.getDynamicProperty("plot_" + x.toString() + "_" + z.toString());
				if (owner != null) { // check if plot is claimed
					if (owner != playerid) { // check that it is owned by another player and not yourself.
						//const my_friendlist = world.getDynamicProperty("friends_" + playerid.toString());
						const owner_friendlist = world.getDynamicProperty("friends_" + owner.toString());
						console.warn(owner_friendlist);
						if (owner_friendlist == null) { // if the owner of the neighbouring plot doesn't have any friends, its a neighbour.
							neighbour = true;
						} else {
							if (owner_friendlist.indexOf(playerid) < 0) { // now check if this player is (not) listed in the owners friend list.
								neighbour = true;
							}
						}
					}
				}
			}			
		}
	}
	
	return neighbour;
}

function claim_plot(player, myplotname){
	if(player.dimension.id == "minecraft:overworld") {
		if (player_distance_to_spawn(player) >= SPAWN_PROTECTION || worldspawn_protection == false){
			// ok player wants to claim a plot, check if this is possible then claim it.
			const plyx = player.location.x;
			const plyz = player.location.z;
			const plyy = player.location.y;
			const plot = location_to_plot(plyx, plyz);
			const current_plot_count = count_claims(player);
			const playermaxclaims = maxclaims(player);
			//console.warn(current_plot_count);
			

			
			if (current_plot_count < playermaxclaims) { // check if player is not claiming to much plots²
				if (world.getDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString()) == null) { //check if this plot is already claimed
					if (check_plot_neighbours(player.id, plot.x, plot.z) == false) { //check if there are neighbours, plots claimed by other players.
						if (player_can_buy_plot(player)){
							//if no plotname is given, generate something
							if (myplotname==null){
								myplotname=generate_plotname(player);
							}					
							
							world.setDynamicProperty("plot_" + plot.x.toString() + "_" + plot.z.toString(), player.id);
							world.setDynamicProperty("plotname_" + plot.x.toString() + "_" + plot.z.toString(), myplotname);
							
							const plotlimits = getPlotCorners(plot.x, plot.z);
							//system.runJob(block_fillarea(plotlimits.Xmin, plotlimits.Xmax, plotlimits.Zmin, plotlimits.Zmax,plyy-1,plyy-1, "minecraft:cobblestone"));
							system.run(() => {
								player.sendMessage(PC_MSG_PREFIX+"Plot claimed!!");
								
								// place a fence on every corner of the plot
								block_set(plotlimits.Xmin,plyy,plotlimits.Zmin, "oak_fence");
								block_set(plotlimits.Xmin,plyy,plotlimits.Zmax, "oak_fence");
								block_set(plotlimits.Xmax,plyy,plotlimits.Zmin, "oak_fence");
								block_set(plotlimits.Xmax,plyy,plotlimits.Zmax, "oak_fence");
								
								//give the player a gift the first time he claims a plot
								//const privatechest = new ItemStack("minecraft:ender_chest", 1);
								if  (!(player.getDynamicProperty("hasreceivedgift")==1)){
									const privatechest = new ItemStack("minecraft:chest", 1);
									const player_inventory = player.getComponent(EntityComponentTypes.Inventory);
									if (player_inventory && player_inventory.container) {
										player_inventory.container.addItem(privatechest);
										player.sendMessage("Check your inventory you have got a little present.");
										player.setDynamicProperty("hasreceivedgift", 1);
									}
								}
							});
						}
					} else {
						player.sendMessage(PC_MSG_PREFIX+"Cannot claim this plot, to close to another players claim.");
						player.sendMessage(PC_MSG_PREFIX+"Only mutual plot friends can claim a plot next to each other.");
					}
				} else {
				  player.sendMessage(PC_MSG_PREFIX+"Plot Already Claimed.");
				}
			} else {
				player.sendMessage(PC_MSG_PREFIX+"Cannot claim another plot, max " + playermaxclaims.toString() + " plots allowed");
			}
		} else {
			player.sendMessage(PC_MSG_PREFIX+"Cannot claim a plot at this location. You are to close to the worldspawn");
		}
	}
	else
	{
		player.sendMessage(PC_MSG_PREFIX+"Plot funtions are only available in the overworld.");
	}
}


world.beforeEvents.itemUse.subscribe(event => {
	if (event.itemStack.typeId === "wipo:plotclaim") {
		system.run(() => {
			showPlotMainWindow(event.source);
		});
	};
});

function player_distance_to_spawn(player) {
	//we only use X and Z, because this funtion if for plot purposes.
	let distance=0;
	if (player){
		const spawnlocation = world.getDefaultSpawnLocation();
		distance = Math.abs(Math.sqrt((spawnlocation.z - player.location.z) * (spawnlocation.z - player.location.z) + (spawnlocation.x - player.location.x) * (spawnlocation.x - player.location.x)));
	}
	return distance;
}

function showPlotConfirmDeleteWindow(player, plot){
	if (player && plot) {
		if(player.dimension.id == "minecraft:overworld") {
			//get all information about this plot
			const plot_owner = world.getDynamicProperty(plot);
			if (plot_owner == player.id){ //at this point it should pass, but you never now, check to make sure
				const plotlocation = plot.substring(plot.indexOf("_")+1);
				const plotfriendlyname = world.getDynamicProperty("plotname_" + plotlocation);
				const X = plotlocation.substring(0,plotlocation.indexOf("_"));
				const Z = plotlocation.substring(plotlocation.indexOf("_")+1);
				// now use these values to get the plot corners (coordinates)
				const plot_coordinates = getPlotCorners(parseInt(X), parseInt(Z));
				// we are ready to show all info
				const message = "Do you realy want to delete \n" + plot + "\n" + plotfriendlyname + "\n -> from("  + plot_coordinates.Xmin + "," + plot_coordinates.Zmin + ")\n -> to(" + plot_coordinates.Xmax + "," + plot_coordinates.Zmax + ")";
				
				let form = new MessageFormData();
				form.title("Delete a plot");
				form.body(message);
				form.button1("No");
				form.button2("Yes");
				
				form.show(player).then(r => {
					if(r.canceled || r.selection == 0){
						// button 0 is "NO", nothing to do
						return;
					}else{
						world.setDynamicProperty(plot, null);
						world.setDynamicProperty("plotname_" + plotlocation, null);
						player.sendMessage(PC_MSG_PREFIX+"Plot deleted");
					}
				}).catch(e => {
					console.error(e, e.stack);
				});
			}
		}
	}
}

function showPlotDeleteWindow(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {
		if(player.dimension.id == "minecraft:overworld") {
			if (count_claims(player) > 0){
				const claimlist =  list_claims(player);  // an element in claimlist has this format "plot_x_z --- friendlyname"
				const form = new ModalFormData().title("Delete a plot");
				form.dropdown("Select a plot", claimlist);

				
				form.show(player).then(r => {
				// This will stop the code when the player closes the form
					if (r.canceled) {
						//console.warn("form canceled");
						return;
					}else{
						const response = r.formValues[0];
						const plot =  claimlist[response].substring(0,claimlist[response].indexOf(" ---"));
						system.run(() => {
							showPlotConfirmDeleteWindow(player, plot);
						});
					}
				}).catch(e => {
					console.error(e, e.stack);
				});
			}else{
				player.sendMessage(PC_MSG_PREFIX+"You don't have any claims to delete.");
			}
		}
	}
}

function showPlotClaimWindow(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {
		if(player.dimension.id == "minecraft:overworld") {
			const claimcount = count_claims(player);
			const playermaxclaims = maxclaims(player);
			if ( claimcount < playermaxclaims){
				const plotlocation = location_to_plot(player.location.x, player.location.z);
				const plot = "plot_" + plotlocation.x.toString() + "_" + plotlocation.z.toString();
				if (world.getDynamicProperty(plot) == null) {
					// calculate the COST to claim this plot
					let cost_multiplier = claimcount+1;
					if (cost_multiplier < 1){cost_multiplier = 1;}
					let needed_dirt_amount = DIRT_COST * cost_multiplier;
					if (needed_dirt_amount > 64){needed_dirt_amount = 64;}
					let needed_log_amount = LOG_COST * cost_multiplier;
					if (needed_log_amount > 64){needed_log_amount = 64;}
  
					const form = new ModalFormData().title("Claim a plot");
					let infotext = "you are now at plot:\n" + plot; 
					infotext = infotext + "\n\nYou need these resources to claim this plot:\n -dirt : " + needed_dirt_amount.toString() + "\n -logs : " + needed_log_amount.toString(); 
					infotext = infotext + "\n\nType a unique name for your new plot:";
					form.textField(infotext, "my plot");

					form.show(player).then(r => {
					// This will stop the code when the player closes the form
						if (r.canceled) {
							//console.warn("form canceled");
							return;
						}else{
							let response = r.formValues[0];
							response = response.trim();
							if (response.length == 0){
								system.run(() => {
									claim_plot(player);
								});
							}else{
								system.run(() => {
									claim_plot(player, response);
								});
							}
						}
					}).catch(e => {
						console.error(e, e.stack);
					});
				}else{
					player.sendMessage(PC_MSG_PREFIX+"This plot is already claimed. Find another location to claim a plot.");
				}
			}else{
				player.sendMessage(PC_MSG_PREFIX+"Cannot claim another plot, max " + playermaxclaims.toString() + " plots allowed");
			}
		}
	}
}

function showPlotShowWindow(player) {
	if (player){
		if(player.dimension.id == "minecraft:overworld") {
			if (count_claims(player) > 0){
				const myplotlist = show_claims(player, true);
				const form = new ActionFormData()
					.title("Your plots")
					.body(myplotlist)
					.button("close");
	
				form.show(player).then(r => {
					// nothing to do on this window
					return;
				}).catch(e => {
					console.error(e, e.stack);
				});
			}else{
				player.sendMessage(PC_MSG_PREFIX+"You don't have any claims to show.");
			}
		}
	}
}

function showPlotPermitWindow(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {
		const permits = player.getDynamicProperty("plot_permits")
		let permitcost = 0;
		if (permits != null) {  // oops something went wrong??? exit 
			if (permits < 4){
				if (permits == 1) {permitcost=16;}
				if (permits == 2) {permitcost=32;}
				if (permits == 3) {permitcost=64;}
				
				const form = new ActionFormData()
					.title("Buy a Permit")
					.body("You currently have §l" + permits.toString() + "§r permits." + "\nThis means you can claim §l" + maxclaims(player).toString() + "§r plots.\n\nAn additional permit grants you 4 extra plot claims.\n\nYou need §n" + permitcost.toString() +" copper ingot§r to buy a new permit.")
					.button("buy permit", "textures/ui/confirm.png") 
					.button("close", "textures/ui/cancel.png");

					
				form.show(player).then(r => {
				// This will stop the code when the player closes the form
					if (r.canceled) {
						//console.warn("form canceled");
						return;
					}else{
						let response = r.selection;
						switch (response) {
							case 0:
								system.run(() => {
									// check if player can buy a permit
									const inventory = player.getComponent(EntityComponentTypes.Inventory);
									let copper_ingot_slot = -1;
									let copper_ingot_item;
									for (let i = 0; i < inventory.container.size ; i++) {
										const item = inventory.container.getItem(i);
										if (item){
											if (item.typeId == "minecraft:copper_ingot" && item.amount >= permitcost)
											{
												copper_ingot_slot = i;
												copper_ingot_item = item;
											}		
										}
									}								
									if (copper_ingot_slot >= 0) {
												// remove or decrease the items from the players inventory
												if (permitcost == copper_ingot_item.amount){
													copper_ingot_item = null;
												} else {
													copper_ingot_item.amount = copper_ingot_item.amount - permitcost;
												}
												inventory.container.setItem(copper_ingot_slot, copper_ingot_item);
					
												// exit this function with success and claim plot
												player.setDynamicProperty("plot_permits", permits+1); 
												player.sendMessage(PC_MSG_PREFIX + "New PERMIT added! You can claim 4 new plots.");
									} else {
										player.sendMessage(PC_MSG_PREFIX+"You need at least " + permitcost.toString() + " copper ingots in your inventory to claim a plot.");
									}										
								});
								break;
							case 1:
								// close window and do nothing
								break;
							default:
								// Use this when your button doesn't have a function yet
								// You don't need to use "break" on default case
								// Remember to place the default on very bottom
						}
					}
				}).catch(e => {
					console.error(e, e.stack);
				});
			} else {
				player.sendMessage(PC_MSG_PREFIX+ "You reached your MAX permit limit.");
				player.sendMessage(PC_MSG_PREFIX+ "You currently have §l" + permits.toString() + "§r permits. This means you can claim §l" + maxclaims(player).toString() + "§r plots.");
			}
		} else {
			player.sendMessage(PC_MSG_PREFIX+"Cannot read your permit status, try to rejoin the game.");
		}
	}
}

function showPlotADDfriends(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {

		let playerlist = [];
		let counter = 0;
		let skip = 0;

		const dummylist = world.getAllPlayers();
		for (let i = 1; i <= dummylist.length; i++)
		{
			if (dummylist[i-1].id != player.id) {
				playerlist[i-1-skip] = dummylist[i-1].name + " [" + dummylist[i-1].id.toString() + "]";
			} else {
				//we don't want to add ourself to the list, skip
				skip++;
			}
		}
		
		if (playerlist.length == 0 || playerlist == null) {
			player.sendMessage(PC_MSG_PREFIX+"There are no players that you can add as plot friend");
			system.run(() => {
				showPlotFriends(player);
			});
		} else {
			const form = new ModalFormData().title("Add a friend");
			form.dropdown("Select a new friend", playerlist);

			form.show(player).then(r => {
			// This will stop the code when the player closes the form
				if (r.canceled) {
					//no action needed go back to friend main window
					system.run(() => {
						showPlotFriends(player);
					});
				}else{
					// get the id from the forms selection box
					const response = r.formValues[0];
					// filter out the userid from the returned selection box data.
					const userid =  playerlist[response].substring(playerlist[response].indexOf(" [")+2,playerlist[response].length-1);
					// get the current friendlist before we make changes to it.
					let friendlist = world.getDynamicProperty("friends_" + player.id.toString());
					let can_add_friend = true;
					if (friendlist == null) {
						// friendslist is null, so just make it an empty string to start with;
						friendlist = "";
					} else {
						// check if this user is already a friend
						if ( friendlist.indexOf(userid) >= 0) {
							// this user is already a friend
							can_add_friend = false;
							player.sendMessage(PC_MSG_PREFIX+"This user is already your plot friend");
						}
					}
					if (can_add_friend) {
						// now add the above userid to the current users friendlist
						friendlist = friendlist + ";" + userid;
						world.setDynamicProperty("friends_" + player.id.toString(),friendlist);
						player.sendMessage(PC_MSG_PREFIX+"Player added to your plot friends list");
					}
					system.run(() => {
						showPlotFriends(player);
					});
				}
			}).catch(e => {
				console.error(e, e.stack);
			});
		}
	}
}

function showPlotDELETEfriends(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {

		const dummy = world.getDynamicProperty("friends_" + player.id.toString()); // the friendslist is a string with ; seperated userid's
		let friendlist = [];
		if (dummy == null){
			player.sendMessage(PC_MSG_PREFIX+"Cannot delete plot friend, because you do not have plot friends yet.");
			system.run(() => {
				showPlotFriends(player);
			});
			return;
		} else {
			const dummylist = dummy.split(";");
			for (let friend in dummylist) {
				if (friend > 0){
					const getusername = world.getDynamicProperty("user_" + dummylist[friend]);
					if (getusername == null){
						friendlist[friend-1] = " noname [" + dummylist[friend] + "]";
					} else {
						friendlist[friend-1] = getusername + " [" + dummylist[friend]+ "]";
					}
				}
			}
		}

		const form = new ModalFormData().title("Delete a friend");
		form.dropdown("Select a friend", friendlist);

		form.show(player).then(r => {
		// This will stop the code when the player closes the form
			if (r.canceled) {
				//no action needed go back to friend main window
				system.run(() => {
					showPlotFriends(player);
				});
			}else{
				// get the id from the forms selection box
				const response = r.formValues[0];
				// filter out the friends userid from the returned selection box data.
				const userid =  friendlist[response].substring(friendlist[response].indexOf(" [")+2,friendlist[response].length-1);
				// get the current friendlist before we make changes to it.
				let flatfriendlist = world.getDynamicProperty("friends_" + player.id.toString());
				if (flatfriendlist == null) {
					// friendslist is null, so just make it an empty string to start with;
					// strange, something went wrong??
					player.sendMessage(PC_MSG_PREFIX+"Cannot delete friend, something went wrong. try again...");
				} else {
					// find the location of this friend in the list.
					const startindex = flatfriendlist.indexOf(";"+userid)
					const endindex = startindex + userid.length + 1;
					// take all the substring (userids) that we still need
					const dummy1 = flatfriendlist.substring(0,startindex);
					const dummy2 = flatfriendlist.substring(endindex);
					// build the new friendslist and push it to the world
					flatfriendlist = dummy1+dummy2;
					if (flatfriendlist.length == 0) {
						world.setDynamicProperty("friends_" + player.id.toString(),null);
					} else {
						world.setDynamicProperty("friends_" + player.id.toString(),flatfriendlist);
					}
					player.sendMessage(PC_MSG_PREFIX+"Player deleted from your plot friends list");
				}
				system.run(() => {
					showPlotFriends(player);
				});
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}
}

function showPlotFriends(player) {
	if (player) {
		// build up general text to show on window/form
		let message = "You can add friends to your plots. Friends can interact with blocks and items within your plot. They cannot destroy nor build.";
		message = message + "\n\n";
		message = message + "§nYour current friend list:§r";
		message = message + "\n";
		
		//build up the players current friend list also to show on the window/form
		let friendlist=""; 
		const dummy = world.getDynamicProperty("friends_" + player.id.toString()); // the friendslist is a string with ; seperated userid's
		if (dummy == null){
			friendlist = "    no friends yet\n";
		} else {
			const dummylist = dummy.split(";");
			for (let friend in dummylist) {
				if (friend > 0){
					const getusername = world.getDynamicProperty("user_"+dummylist[friend]);
					if (getusername == null){
						friendlist = friendlist + "    - [" + dummylist[friend] + "]\n";
					} else {
						friendlist = friendlist + "    - " + getusername + "\n";
					}
				}
			}
		}
		friendlist=friendlist+"\n"; 
		
		const form = new ActionFormData()
			.title("Plot Friends Manager")
			.body(message + friendlist)
			.button("add a friend", "textures/ui/confirm.png") //gear
			.button("delete a friend", "textures/ui/cancel.png"); //crossout
		
		form.show(player).then(r => {
		// This will stop the code when the player closes the form
			if (r.canceled) {
				//console.warn("form canceled");
				return;
			}else{
				let response = r.selection;
				switch (response) {
					case 0:
						system.run(() => {
							showPlotADDfriends(player);
						});
						break;
					case 1:
						system.run(() => {
							showPlotDELETEfriends(player);
						});
						break;				
					default:
						// Use this when your button doesn't have a function yet
						// You don't need to use "break" on default case
						// Remember to place the default on very bottom
				}
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}
}

function showPlotMainWindow(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (player) {
		const form = new ActionFormData()
			.title("Plot Manager")
			.body("what do you want to do")
			.button("claim a new plot", "textures/ui/confirm.png") //gear
			.button("delete a plot", "textures/ui/cancel.png") //crossout
			.button("show my plot info", "textures/items/book_writable.png")
			.button("buy permits", "textures/items/map_filled.png")	
			.button("plot friends", "textures/ui/FriendsIcon.png");
			
		form.show(player).then(r => {
		// This will stop the code when the player closes the form
			if (r.canceled) {
				//console.warn("form canceled");
				return;
			}else{
				let response = r.selection;
				switch (response) {
					case 0:
						system.run(() => {
							showPlotClaimWindow(player);
						});
						break;
					case 1:
						system.run(() => {
							showPlotDeleteWindow(player);
						});
						break;
					case 2:
						system.run(() => {
							showPlotShowWindow(player);
						});
						break;
					case 3:
						system.run(() => {
							showPlotPermitWindow(player);
						});
						break;
					case 4:
						system.run(() => {
							showPlotFriends(player);
						});
						break;						
					default:
						// Use this when your button doesn't have a function yet
						// You don't need to use "break" on default case
						// Remember to place the default on very bottom
				}
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}
}





world.afterEvents.playerJoin.subscribe(({playerId, playerName})=> {
	//we store the playername as a dynimc prop on the world object so that the player name can be retreived even when the player is offline
	world.setDynamicProperty("user_" + playerId.toString(), playerName);
});

world.afterEvents.playerSpawn.subscribe( event => {

	const player = event.player;
	
	const plotclaimitem = new ItemStack("wipo:plotclaim", 1);
	const player_inventory = player.getComponent(EntityComponentTypes.Inventory);
	if (player_inventory && player_inventory.container) {
		const player_inventory_slot = player_inventory.container.getSlot(8);
		player_inventory_slot.setItem(plotclaimitem);
		player_inventory_slot.keepOnDeath = true;
		player_inventory_slot.lockMode = true;
	}
	
	world.setDynamicProperty("plot_permits", null);  
	//check if player has permits, if not set to 1. first permit is free.
	if (player.getDynamicProperty("plot_permits") == null)
	{
		player.setDynamicProperty("plot_permits", 1);  
	}
});

