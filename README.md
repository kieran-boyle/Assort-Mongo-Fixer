Set the main folder for your mod in config.json folderPath.
Add any ossort.json files in your mod into the assortPaths array in config.json.
This mod will loop through all assort.json files, scan for any items that have an ID that is not a valid Mongodb ID and will assign a new ID for it.
It will then lop through again and update any non Mongodb parents to their new MongoID.
A backup of your original json's will be saved in backups/assort.
Json files containing the old ID's along with their new MongoID's will be generated in backups/changedItems.
Your mod assort files will then be overwritten with the new data!
Using Lotus as a core to write this.