# plotclaim
A Minecraft Bedrock 3 in 1 Addon.
featuring:
- plot system
- teleport system
- worldborder system

## Installation
- Download the latest version of the "plotclaim.mcaddon" file. ([releases](https://github.com/wiposoftware/plotclaim/releases))
- Launch your Minecraft Bedrock game.
- While the game is running go back to your "plotclaim.mcaddon" file that you downloaded and launch it.
- Minecraft will now start to import the Plotclaim addon.
- Start a new game or world.
- go to the resource pack option. Select available packages, find the plotclaim package and press enable or activate.
- go to the behaviour pack option. Select available packages, find the plotclaim package and press enable or activate.
- go to the Experimental option. and enable "BETA-API's".

-> you are now ready to start your Mincraft world with the plotclaim addon.

## Features
### plots
- Any player can claim multiple plots.
- Within this claimed plot, only the owner can build and destroy blocks and interact with items/chests/doors/...
- A plot has a 16x16 block dimension.
- The plot has no vertical limits it extends from bedrock to the sky.
- A player can buy permits to extend the number of plots he or she can claim. (1 permit equals 4 plots)
- Add Plot friends. Plot friends can interact with doors/chests/beds/... in your plots.
- The plotclaim GUI can be opened by pressing the use button (right click) on the plotclaim item in slot 9 of your inventory.
- spawn protection : Plots can not be claimed at worldspawn.
- explosion protection : Creepers/TNT/... will not explode inside a plot.
- neighbour protection : players can not claim plots next to each other unless they are friends.
### teleports
- Teleport from a plot to another plot.
- Both source and destination plot must have a teleport block. 
- Telport blocks can be crafted (see recipes).
- Performing a teleport will cost teletoken 
- Teletokens can be crafted (see recipes).
- The destination plot must be one of your own, or your friends plot.
### worldborders
- On small servers with low resources (cpu, ram harddisk) you may want to limit the size of a Mincraft world.
- The minimal size that you can set is 1024 blocks.
- Te maximum size that you can set is 1,000,000 blocks.
- By default this addon takes the overworld to nether ratio (8:1) in to account. This means that if you set your limit on 1024 blocks (overworld). The limit for Nether will be calculated to 128.  
- It is possible to change the overworld to nether ratio (1:1), but you will have to change your Mincraft level.dat file.
- Use the "/plotclaim:disableworldborder" command in game to disable this feature.
- Use the "/plotclaim:setworldborder" command in game to enable and set the worldlimit.
- A player will be alerted when nearing the worldborder.
- A player will receive damange when crossing the worldborder
- A player will be killed when going 32 blocks behind the border.

## Recipes
![plotclaim_recipes_info](https://github.com/user-attachments/assets/a0cc79c1-148f-4eb7-9b69-2edc17414494)


