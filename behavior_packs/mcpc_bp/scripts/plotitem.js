//© 2025 - WIPOSOFTWARE - https://github.com/wiposoftware/plotclaim

import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { PlotSystem, ResourceList } from "./plotsystem.js";
//import { Vector3 } from "./vector3.js";

const plotsystem = new PlotSystem;

const plot_resource_list = [new ResourceList("minecraft:dirt",8,"tile.dirt.name"), new ResourceList("_log",4,"tile.log.name")];
//const permit_resource_list = [new ResourceList("minecraft:copper_ingot",20,"item.copper_ingot.name"), new ResourceList("minecraft:stone",10,"tile.stone.stone.name")];
const permit_resource_list = [new ResourceList("minecraft:redstone",20,"item.redstone.name"), new ResourceList("minecraft:paper",1,"item.paper.name")];

let plotitem_use_zone = -1 ; // this variable will hold the zone (range of blocks) were we can use the plotitem. this works with worldborder. -1 means disabled, can use everywhere.

function UI_MainMenu(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player === undefined)) {
		if(player.dimension.id == "minecraft:overworld") {
			const form = new ActionFormData()
				.title("Plot Manager")
				.body("what do you want to do")
				.button("claim a new plot", "textures/ui/confirm.png") 
				.button("delete a plot", "textures/ui/cancel.png") 
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
								UI_ClaimPlot(player);
							});
							break;
						case 1:
							system.run(() => {
								UI_DeletePlot(player);
							});
							break;
						case 2:
							system.run(() => {
								UI_PlotList(player);
							});
							break;
						case 3:
							system.run(() => {
								UI_Permit(player);
							});
							break;
						case 4:
							system.run(() => {
								UI_PlotFriends(player);
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
		} else {
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_PlotList(player) {
	if (!(player === undefined)){
		if(player.dimension.id == "minecraft:overworld") {
			const myplotlist = plotsystem.get_plot_list(player);
			if (!(myplotlist === undefined)){
				if (myplotlist.length > 0){

					const form = new ActionFormData();
					form.title("Your plots");
					form.body("You have §l§5" + myplotlist.length.toString() + "§r plots");
					for ( let plot of myplotlist ){	
							const plotvolume = plotsystem.plot_to_plotvolume(plotsystem.plot_vector(plot.id));
							let plotteleport = "yes";
							if (plotsystem.get_teleport(plot.id) === undefined) {
								plotteleport ="no";
							}
							form.label("§l§6" + plot.name + "§r");
							form.label(
										"   - "  + plot.id + "\n" +
										"   - from X: " + plotvolume.from.x + ", Z: " + plotvolume.from.z + "\n" +
										"   - to X: " + plotvolume.to.x + ", Z: " + plotvolume.to.z + "\n" + 
										"   - teleport : " + plotteleport + "\n"
									);
							form.divider();
					}
					form.button("close");
		
					form.show(player).then(r => {
						// nothing to do on this window
						return;
					}).catch(e => {
						console.error(e, e.stack);
					});
				}else{
					plotsystem.send_message( player, "You don't have any claims to show.");
				}
			}else{
					plotsystem.send_message( player, "You don't have any claims to show.");
			}
		} else {
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_Permit(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player === undefined)){
		if(player.dimension.id == "minecraft:overworld") {
			const permits = plotsystem.get_permits(player);
			
				// we build up a new resource list based on the default list and cost but now with increased cost based on the amount of permits a player has
				let permitcost = [];
				for (let resource_item of permit_resource_list)
				{
					let newamount = resource_item.amount * permits;
					if(newamount > 64){newamount=64;}
					permitcost.push( new ResourceList(resource_item.typeId, newamount, resource_item.translationKey));
				}
					
				const form = new ActionFormData();
					form.title("Buy a Permit");
					form.body(
						"You currently have §l§6" + permits.toString() + "§r permits." + "\n" + 
						"This means you can claim §l§5" + plotsystem.get_maxclaims(player).toString() + "§r plots.\n\n"
						);
						
					if (permits < plotsystem.max_permits()) {
						form.label("An additional permit grants you 4 extra plot claims.\n\n§nTo buy a permit you need :§r" );
						for (let resource_item of permitcost)
						{
							let color = "§c"; //red color
							if (plotsystem.player_has_resources(player, [resource_item], false) == true){
								//green color
								 color = "§a"; 
							}
							form.label({"rawtext":[{text:"   §o- "},{translate : resource_item.translationKey},{text:" : " + color + resource_item.amount.toString() + "§r"} ]});
						}
						form.label("");
						form.divider();
						form.button("buy permit", "textures/ui/confirm.png");
						form.button("close", "textures/ui/cancel.png");
					} else {
						form.label(
							"you reached the maximum permit limit.\n"+
							"§o§4you can't buy any additional permits.§r\n\n"
							);
					}
					

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
									// check, pay the resources and add a permit
									if (plotsystem.player_has_resources(player, permitcost, true) == true) {
												plotsystem.add_permit(player);
												plotsystem.send_message( player, "New PERMIT added! You can claim 4 new plots.");
									} else {
										plotsystem.send_message( player, "You do not have the required resources to buy a permit");
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
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_ConfirmDeletePlot(player, plotid){
	if ((player !== undefined) && (plotid !== undefined)){
		if(player.dimension.id == "minecraft:overworld") {
			//get all information about this plot
			const plot = plotsystem.plot_vector(plotid); //convert plot string to plot vector
			const plot_owner = plotsystem.get_plot_owner(plot);
			if (plot_owner === undefined){return;} // if we could not retreive the owner, something went wrong -> exit
			if (plot_owner == player.id){ //at this point it should pass, but you never now, check to make sure
				const plotfriendlyname = plotsystem.get_plot_name(plot); //get the plot name from the plot vector
				const plot_coordinates = plotsystem.plot_to_plotvolume(plot); //get the plot coordinates/volume from the plot vector
				let plotteleport = "yes";
				if (plotsystem.get_teleport(plotid) === undefined) {
					plotteleport ="no";
				}
				// we are ready to show all info
				const message = "Do you realy want to delete this plot: \n\n §n§l" + plotfriendlyname + 
								"\n §r" + plotid + 
								"\n -> from("  + plot_coordinates.from.x + "," + plot_coordinates.from.z + 
								")\n -> to(" + plot_coordinates.to.x + "," + plot_coordinates.to.z + ")" +
								"\n -> teleport : " + plotteleport + "\n\n";
				
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
						if (plotsystem.deleteplot(plot) == true){
							plotsystem.send_message(player, "Plot deleted");
						}
					}
				}).catch(e => {
					console.error(e, e.stack);
				});
			}
		} else {
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_DeletePlot(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player === undefined)){
		if(player.dimension.id == "minecraft:overworld") {
			if (plotsystem.plot_count(player) > 0){
				const myplotlist = plotsystem.get_plot_list(player);	
				const dropdownplotlist = [];
				
				for (let myplot of myplotlist){
					dropdownplotlist.push(myplot.name + " | " +  myplot.id);
				}
				
				const form = new ModalFormData().title("Delete a plot");
				form.label ("When you delete a plot, the terrain will become accessible to all other players.");
				form.dropdown("Select a plot", dropdownplotlist);
		
				form.show(player).then(r => {
				// This will stop the code when the player closes the form
					if (r.canceled) {
						//console.warn("form canceled");
						return;
					}else{
						const response = r.formValues[1];
						if (!(response === undefined)){
							system.run(() => {
								UI_ConfirmDeletePlot(player, myplotlist[response].id);
							});
						}
					}
				}).catch(e => {
					console.error(e, e.stack);
				});
			}else{
				plotsystem.send_message( player, "You don't have any claimed plots to delete.");
			}
		} else {
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_ClaimPlot(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player === undefined)) {
		if(player.dimension.id == "minecraft:overworld") {
			if (plotsystem.IsPlayerToCloseToWorldSpawn(player) == false){
				const plot = plotsystem.location_to_plot(player.location); // localize the plot where the player is
				if (plotsystem.get_plot_owner(plot) === undefined){ //check if this plot is not already owned by a player
					if ( plotsystem.PlotHasOtherNeighbours(player, plot) == false){ //check that this plot has no neighbours
						const claimcount = plotsystem.plot_count(player);
						if ( claimcount < plotsystem.get_maxclaims(player)) { // check that we do not have to much plots claimed
							// calculate the COST to claim this plot
							let plotcost = [];
							for (let resource_item of plot_resource_list)
							{
								let newamount = resource_item.amount * (claimcount+1);
								if(newamount > 64){newamount=64;}
								plotcost.push( new ResourceList(resource_item.typeId, newamount, resource_item.translationKey));
							}
		  
							//start building up the form
							const form = new ModalFormData();
							form.title("Claim a plot");
							form.label("you are now at plot_" + plotsystem.plot_string(plot) +
										"\n\n§nYou need these resources to claim this plot:§r");
							
							for (let resource_item of plotcost)
							{
								let color = "§c"; //red color
								if (plotsystem.player_has_resources(player, [resource_item], false) == true){
									//green color
									 color = "§a"; 
								}
								form.label({"rawtext":[{text:"   §o- "},{translate : resource_item.translationKey},{text:" : " + color + resource_item.amount.toString() + "§r"} ]});
							}
							form.label("");
							form.textField("Type a unique name for your new plot:", "");
							form.label("§c(max 20 chars and no special characters)§r\n\n");
							
							form.show(player).then(r => {
							// This will stop the code when the player closes the form
								if (r.canceled) {
									//console.warn("form canceled");
									return;
								}else{
									let response = ""; // -1 means nothing
									for (let value of r.formValues){
										if (value !== undefined)
										{
												response = value;
										}
									}
									
									//remove all special characters from user input
									response = response.replace(/[^a-zA-Z0-9 _-]/g, '');
									//trim front and back spaces
									response = response.trim();
									//cap to 20 chars
									if (response.length > 20){
										response = response.substring(0,20);
									}
									//check if have enough resources to claim a plot, but dont pay them
									if (plotsystem.player_has_resources(player, plotcost, false) == true){
										if (plotsystem.claim_plot(player, plot, response) == true){
											//ok plot claimed, now pay it
											plotsystem.player_has_resources(player, plotcost, true);
											plotsystem.send_message( player, "PLOT CLAIMED!");
										} else {
											plotsystem.send_message( player, "oeps, something went wrong when assigning this plot to you.");
										}
									} else {
										plotsystem.send_message( player, "You do not have the required resources to claim a plot.");
									}
								}
							}).catch(e => {
								console.error(e, e.stack);
							});	
						}else{
							plotsystem.send_message( player, "Cannot claim another plot, max " + plotsystem.get_maxclaims(player).toString() + " plots allowed");
						}
					}else{
						plotsystem.send_message( player,"Cannot claim this plot, to close to another players claim.");
						plotsystem.send_message( player,"Only mutual plot friends can claim a plot next to each other.");
					}
				} else {
					plotsystem.send_message( player, "This plot is already claimed. Find another location to claim a plot.");
				}
			} else {
				plotsystem.send_message( player, "Cannot claim this plot. Too close to worldspawn.");
			}
		} else {
			plotsystem.send_message( player, "Plotclaim is only available in the overworld");
		}
	}
}

function UI_PlotFriends(player) {
	if (!(player=== undefined)) {
		// build up general text to show on window/form
		let message = "You can add friends to your plots. Friends can interact with blocks and items within your plot. They cannot destroy nor place blocks.";
		message = message + "\n\n";
		message = message + "§nYour current friend list:§r";
		message = message + "\n";
		
		//build up the players current friend list also to show on the window/form
		let friendlist=""; 
		const dummy = plotsystem.get_friends(player); // the friendslist is a string with ; seperated userid's
		if (dummy == null){
			friendlist = "    no friends yet\n";
		} else {
			const dummylist = dummy.split(";");
			for (let friend in dummylist) {
				if (friend > 0){ //first item in array is just an empty field, skip it. this is because we work with ; in front of the userid
					const getusername = plotsystem.get_user_name(dummylist[friend].toString());
					//if (getusername == null){
					//	friendlist = friendlist + "    - [" + dummylist[friend] + "]\n";
					//} else {
					friendlist = friendlist + "    - " + getusername + "\n";
					//}
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
							UI_AddPlotFriend(player);
						});
						break;
					case 1:
						system.run(() => {
							UI_DeletePlotFriend(player);
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


function UI_AddPlotFriend(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player===undefined)) {

		let playerlist = [];
		let counter = 0;
		let skip = 0;

		let dummylist = world.getAllPlayers();
		//dummylist.push({name : "test", id : "0123456789"});
		//dummylist.push({name : "test2", id : "-6789"});
		
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
			plotsystem.send_message( player, "There are no players that you can add as plot friend");
			system.run(() => {
				UI_PlotFriends(player);
			});
		} else {
			const form = new ModalFormData().title("Add a friend");
			form.dropdown("Select a new friend", playerlist);

			form.show(player).then(r => {
			// This will stop the code when the player closes the form
				if (r.canceled) {
					//no action needed go back to friend main window
					system.run(() => {
						UI_PlotFriends(player);
					});
				}else{
					// get the id from the forms selection box
					const response = r.formValues[0];
					// filter out the userid from the returned selection box data.
					const userid =  playerlist[response].substring(playerlist[response].indexOf(" [")+2,playerlist[response].length-1);
					plotsystem.add_friend(player, userid)
					
					system.run(() => {
						UI_PlotFriends(player);
					});
				}
			}).catch(e => {
				console.error(e, e.stack);
			});
		}
	}
}

function UI_DeletePlotFriend(player) { //, log: (message: string, status?: number) => void, targetLocation: DimensionLocation) {
	if (!(player === undefined)) {

		const dummy = plotsystem.get_friends(player);  // the friendslist is a string with ; seperated userid's
		let friendlist = [];
		if (dummy === undefined){
			plotsystem.send_message( player,"Cannot delete plot friend, because you do not have plot friends yet.");
			system.run(() => {
				UI_PlotFriends(player);
			});
			return;
		} else {
			const dummylist = dummy.split(";");
			for (let friend in dummylist) {
				if (friend > 0){
					const getusername = plotsystem.get_user_name(dummylist[friend].toString());
					//if (getusername == null){
					//	friendlist[friend-1] = " noname [" + dummylist[friend] + "]";
					//} else {
					friendlist[friend-1] = getusername + " [" + dummylist[friend]+ "]";
					//}
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
					UI_PlotFriends(player);
				});
			}else{
				// get the id from the forms selection box
				const response = r.formValues[0];
				// filter out the friends userid from the returned selection box data.
				const userid =  friendlist[response].substring(friendlist[response].indexOf(" [")+2,friendlist[response].length-1);
				// delete the friend
				plotsystem.delete_friend(player, userid);
				system.run(() => {
					UI_PlotFriends(player);
				});
			}
		}).catch(e => {
			console.error(e, e.stack);
		});
	}
}

export class PlotUI {
	constructor () {
		//when start this we run the underneath code every 3 seconds to get updates on the worldborder
		system.runInterval(() => {
			const dummy = world.getDynamicProperty("WB_LIMIT");
			if (dummy === undefined) {
				plotitem_use_zone=-1
			} else {
				plotitem_use_zone=dummy-32;
			}
		}, 60);
	}
	
	
	onUse(event) {
		//event.itemStack // The item stack when the item was used.
		//event.source // The player who used the item.
		if (event.itemStack.typeId === "wipo:plotclaim" && (!(event.source === undefined))) {
			if (plotitem_use_zone > 0) {
				//plotitem has a limit use zone, check if event was triggered within this zone
				if ((event.source.location.x < plotitem_use_zone) && (event.source.location.x > -plotitem_use_zone) && (event.source.location.z < plotitem_use_zone) && (event.source.location.z > -plotitem_use_zone)){
					// plotitem can be used everywhere
					system.run(() => {
						UI_MainMenu(event.source);
					});		
				} else {
					plotsystem.send_message(event.source,"Cannot manage plots close to the world border.");
				}
			} else {
				// plotitem can be used everywhere
				system.run(() => {
					UI_MainMenu(event.source);
				});
			}
		};
	}
	
	
}