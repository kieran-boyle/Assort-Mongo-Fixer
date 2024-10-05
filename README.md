If config.enableFixer is not set to true, this mod will do nothing.


WARNING!! 

The server will crash on using this mod, due to changing the trader name in base.json.  You are required to restart the server for the changes to have taken effect anyway, so a hard crash is a good thing!
You MUST then set config.enableFixer to false before starting the server for your changes to of taken effect.


IMPORTANT.
Writing the json files can take a moment if there are many files to be written.  Please ensure all folders in backups have had their .json file assigned to them before closing the server.

ASSORTS.

If you have Assort files to fix, set fixAssorts to true in the config.

Set the main folder for your mod in config.json folderPath.  This should be the name of your mods main folder.

Add the paths for any base.json files in your mod into the baseJsonPaths array in config.json.  WARNING -> This must be present even if just fixing quests, as the _id may need to be copied / set.
For example if your base.json is in a folder called db in your main mod folder, and is called base.json you would add "db/base.json" to the array.  Multiple base.json files can be added, and must be comma separated. 

Add the paths for any ossort.json files in your mod into the assortPaths array in config.json.
For example if your assort is in a folder called db in your main mod folder, and is called assort.json you would add "db/assort.json" to the array.  Multiple assort files can be added, and must be comma separated. 

Add the paths for any questAssort.json files in your mod into the questAssortPaths array in config.json.
For example if your questAssort is in a folder called db in your main mod folder, and is called questAssort.json you would add "db/questAssort.json" to the array.  Multiple assort files can be added, and must be comma separated. 

This mod will loop through all assort.json files, scan for any items that have an ID that is not a valid Mongodb ID and will assign a new ID for it.
It will then loop through again and update any non Mongodb parents to their new MongoID along with any barter_scheme, loyal_level_items and questAssorts

A backup of your original json's will be saved in backups.

Json files containing the old ID's along with their new MongoID's will be generated in backups/changedItems.

Your mod assort files will then be overwritten with the new data!

Any cloned items MUST have their ID manually set in their respective file.  You can search the generated changedItems/assort.json for the new ID.  This must be replaced in the objects name. 


QUESTS.

If you have a quest database to fix, set fixQuests to true in the config.

See above for info on required base.json file.

Your quests file should be located in Virtual's Custom Quest Loader/database/quests.  Put the names of any jsons that need updating into the questsFolderPaths array.  So for example "Lotus_quests.json"  Multiple quest files can be added, and must be comma separated. 

This mod will then loop through these files, replacing everything necessary with their relevant mongo ID's. 

Backups of your original files will be generated in /backups.

A list of all changed ID's will be generated in /backups/changedQuestIDs/"quests file name"

Your original quests.json file will then be overwritten with the new data!


When your new files have been written, you should shutdown the server, and set config.enableFixer to false to stop it running again at launch, before testing your new files!


CREDITS

Lotus has been used to develop this, so you can see examples for how to set the config up in the config based on that mod.
Thanks Luna for making such a chonky mod to test this with!
Cheers for all the advice on the discord for those who haunt mods-development alongside me.