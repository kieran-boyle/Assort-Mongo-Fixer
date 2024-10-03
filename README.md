If config.enableFixer is not set to true, this mod will do nothing.

If you have Assirt files to fix, set fixAssorts to true in the config.

Set the main folder for your mod in config.json folderPath.  This should be the name of your mods main folder.

Add the paths for any ossort.json files in your mod into the assortPaths array in config.json.
For example if your assort is in a folder called db in your main mod folder, and is called assort.json you would add "/db/assort.json" to the array.  Multiple assort files can be added, and must be comma seperated.

Add the paths for any questAssort.json files in your mod into the questAssortPaths array in config.json.
For example if your questAssort is in a folder called db in your main mod folder, and is called questAssort.json you would add "/db/questAssort.json" to the array.  Multiple assort files can be added, and must be comma seperated.

This mod will loop through all assort.json files, scan for any items that have an ID that is not a valid Mongodb ID and will assign a new ID for it.
It will then loop through again and update any non Mongodb parents to their new MongoID along with any barter_scheme, loyal_level_items and questAssorts

A backup of your original json's will be saved in backups.

Json files containing the old ID's along with their new MongoID's will be generated in backups/changedItems.

Your mod assort files will then be overwritten with the new data!


If you have a quest database to fix, set fixQuests to true in the config.

Your quests file should be located in Virtual's Custom Quest Loader/database/quests.  Put the names of any jsons that need updating into the questsFolderPaths array.  So for example "/Lotus_quests.json"

This mod will then loop through these files, replacing evrything necessary with their relevent mongo ID's.

Backups of your original files will be generated in /backups.

A list of all changed ID's will be generated in /backups/changedQuestIDs/"quests file name"

Your original quests.json file will then be overwritten with the new data!


When your new files have been written, you should shutdown the server, and set config.enableFixer to false to stop it running again at launch, before testing your new files!


Lotus has been used to develop this, so you can see examples for how to set the config up in the config based on that mod.