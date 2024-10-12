import { DependencyContainer } from "tsyringe"
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod"
import { ILogger } from '@spt/models/spt/utils/ILogger'
import { HashUtil } from '@spt/models/spt/utils/HashUtil'
import path from "path"

class MongoFixer implements IPostDBLoadMod
{
    private fs = require('fs')
    private config = require("../config/config.json")
    private container: DependencyContainer
    private logger: ILogger
    private hashUtil: HashUtil
    private validateMongo = /^[a-f\d]{24}$/i
    private timestamp = Date.now()
    private changedAssortIds = new Map()
	private changedQuestIds = new Map()
    private traderIDs = new Map()

    public postDBLoad(container: DependencyContainer): void
    {
        this.container = container
        this.logger = this.container.resolve<ILogger>('WinstonLogger')
        this.hashUtil = this.container.resolve<HashUtil>("HashUtil")

        if (this.config.enableFixer !== true)
        {
            return
        }

        //Fix base trader ID.
        for (const file of this.config.baseJsonPaths)
        {
            const fullPath = `../../${this.config.assortsFolderPath}/${file}`
            const importedJson = require(fullPath)
            let newID = this.hashUtil.generate()
            this.traderIDs.set(importedJson._id, newID)
            const fileTarget = this.extractName(file)
            importedJson._id = newID
            this.writeUpdatedData(fullPath, importedJson)
            this.generateBackups("traderIDs", fileTarget, [...this.traderIDs])
        }

        if (this.config.fixAssorts === true)
        {
            this.fixAssorts()
        }

        if (this.config.fixQuests === true)
        {
            this.fixQuests()
            
            if (this.config.questAssortPaths.length > 0)
            {
                this.fixQuestAssorts(this.config.questAssortPaths)
            }
            if (this.config.questsLocalesPaths.length > 0)
            {
                this.fixLocales(this.config.questsLocalesPaths)
            }
        }
    }

    /**
	* Pulls the file name from provided string ending in .json.
	* @param url target filename.
	* @returns filename as string || null if not found.
	*/
    private extractName(url: string): string | null
    {
        const regex = /\/([^\/]+)\.json$/
        const match = url.match(regex)
        return match ? match[1] : null
    }

	/**
	* Writes the assort file in the target mod.
	* @param target target.
	* @param data updated data to write.
	*/
    private writeUpdatedData(target: string, data: any): void
    {
        this.fs.writeFile(path.resolve(__dirname, target), JSON.stringify(data, null, "\t"), (err) =>
        {
            if (err) throw (err)
        })
        this.logger.info(`New Id's written to ${target}`)
    }

	/**
	* Generates a backup of provided .json in /backups.
	* @param folderName name for folder.
    * @param fileName name for file.
	* @param target target .json.
	*/
    private generateBackups(folderName: string, fileName: string, target: any): void
    {
        this.logger.info(`Backup generated for ${folderName}/${fileName} in /backups`)
        const backupFolderPath = path.resolve(__dirname, `../backups/${this.timestamp}/${folderName}`)

        this.fs.mkdir(backupFolderPath, { recursive: true }, (err) =>
        {
            if (err) throw err

            const backupFilePath = path.resolve(backupFolderPath, `${fileName}.json`)

            this.fs.writeFile(backupFilePath, JSON.stringify(target, null, "\t"), (err) =>
            {
                if (err) throw err
            })
        })
    }

    private fixAssorts():void
    {
        for (const file of this.config.assortPaths)
        {
            const fullPath = `../../${this.config.assortsFolderPath}/${file}`
            const importedJson = require(fullPath)
            const fileTarget = this.extractName(file)
            const backupCopy = JSON.parse(JSON.stringify(importedJson))
            let count = 0

            if (!fileTarget)
            {
                this.logger.error(`Error, file not found -- ${file}`)
                return
            }
            this.generateBackups("assorts", fileTarget, backupCopy)

            // Fix item ID's.
            for (let item of importedJson.items)
            {
                if (!this.validateMongo.test(item._id))
                {
                    let newID = this.hashUtil.generate()
                    this.changedAssortIds.set(item._id, newID)
                    count++
                    item._id = newID
                }
            }

            // Fix parent ID's.
            for (let item of importedJson.items)
            {
                if (!this.validateMongo.test(item.parentId))
                {
                    item.parentId = this.changedAssortIds.get(item.parentId)
                }
            }
            this.logger.info(`${count} item ID's changed to MongoID's`)
            this.generateBackups("changedItems", fileTarget, [...this.changedAssortIds])
            importedJson.barter_scheme = this.setNewAssortIDs(importedJson.barter_scheme)
            importedJson.loyal_level_items = this.setNewAssortIDs(importedJson.loyal_level_items)
            this.writeUpdatedData(fullPath, importedJson)
        }
    }

    /**
	* Sets created MongoID's to target ID's.
	* @param inputData Input data.
	* @returns Modified json containing new MongoID's.
	*/
    private setNewAssortIDs(inputData: any): any
    {
        let modifiedData = {}

        for (let item in inputData)
        {
            let newKey = this.changedAssortIds.get(item) || item
            modifiedData[newKey] = inputData[item]
        }
        return modifiedData
    }

    private fixQuests():void
    {
        const questsPath = "../../Virtual's Custom Quest Loader/database/quests/"

        for (const questJson of this.config.questsFolderPaths)
        {
            const fullPath = `${questsPath}${questJson}`
            const importedJson = require(fullPath)
			const fileTarget = this.extractName(`/${questJson}`)
            const backupCopy = JSON.parse(JSON.stringify(importedJson))

			if(!fileTarget)
			{
				this.logger.error(`Error, file not found -- ${questJson}`)
				return
			}
			this.generateBackups("quests", fileTarget, backupCopy)

            for (let quest in importedJson)
            {
                let thisQuest = importedJson[quest]

                if (!this.validateMongo.test(quest))
                {
                    let newID = this.generateAndSaveID(quest)
                    quest = newID
                    thisQuest._id = newID
                    thisQuest.acceptPlayerMessage = thisQuest.acceptPlayerMessage.replace(/^\S+/, `${newID}`)
                    thisQuest.changeQuestMessageText = thisQuest.changeQuestMessageText.replace(/^\S+/, `${newID}`)
                    thisQuest.completePlayerMessage = thisQuest.completePlayerMessage.replace(/^\S+/, `${newID}`)
                    thisQuest.declinePlayerMessage = thisQuest.declinePlayerMessage.replace(/^\S+/, `${newID}`)
                    thisQuest.description = thisQuest.description.replace(/^\S+/, `${newID}`)
                    thisQuest.failMessageText = thisQuest.failMessageText.replace(/^\S+/, `${newID}`)
                    thisQuest.name = thisQuest.name.replace(/^\S+/, `${newID}`)
                    thisQuest.note = thisQuest.note.replace(/^\S+/, `${newID}`)
                    thisQuest.startedMessageText = thisQuest.startedMessageText.replace(/^\S+/, `${newID}`)
                    thisQuest.successMessageText = thisQuest.successMessageText.replace(/^\S+/, `${newID}`)
                    thisQuest.conditions = this.fixQuestConditions(thisQuest.conditions)
                    thisQuest.rewards = this.fixQuestRewards(thisQuest.rewards)
                }
            }
            this.logger.info(`${[...this.changedQuestIds].length} new Mongo ID's generated for ${fileTarget}!`)
			this.generateBackups("changedQuestIDs", fileTarget, [...this.changedQuestIds])
            let dataString = JSON.stringify(importedJson)

            for(const [oldID, newID] of this.changedQuestIds.entries())
            {
                dataString = dataString.replaceAll(`"${oldID}"`, `"${newID}"`)
            }
            for(const [oldID, newID] of this.traderIDs.entries())
            {
                dataString = dataString.replaceAll(`"${oldID}"`, `"${newID}"`)
            }
            let modifiedData = JSON.parse(dataString)
            this.writeUpdatedData(fullPath, modifiedData)
        }
    }

    /**
     * Generates a new mongoID and saves it to changedQuestIds.
     * @param oldID ID to change.
     * @returns New mongoID.
     */
    private generateAndSaveID(oldID :string):string
    {
        let newID = this.hashUtil.generate()
        this.changedQuestIds.set(`${oldID}`, newID)
        return newID
    }

	/**
	* Sets new Mongdb ID's for required parts of quest.conditions.
	* @param conditions quest.conditions.
	* @returns modified quest.conditions.
	*/
    private fixQuestConditions(conditions: any): any
    {
        for (let finishCondition of conditions.AvailableForFinish)
        {
            finishCondition.id = this.generateAndSaveID(finishCondition.id)

			if(finishCondition.counter)
			{
				finishCondition.counter.id = this.generateAndSaveID(finishCondition.counter.id)

				for (let thisCondition of finishCondition.counter.conditions)
				{
					thisCondition.id = this.generateAndSaveID(thisCondition.id)
				}
			}
            if(finishCondition.visibilityConditions.length > 0)
            {
                for(let visibilityCondition of finishCondition.visibilityConditions)
                {
                    visibilityCondition.id = this.generateAndSaveID(visibilityCondition.id)
                }
            }
        }
        for (let startCondition of conditions.AvailableForStart)
        {
            startCondition.id = this.generateAndSaveID(startCondition.id)

            if(startCondition.visibilityConditions.length > 0)
            {
                for(let visibilityCondition of startCondition.visibilityConditions)
                {
                    visibilityCondition.id = this.generateAndSaveID(visibilityCondition.id)
                }
            }
        }
        for (let failCondition of conditions.Fail)
        {
            failCondition.id = this.generateAndSaveID(failCondition.id)

            if(failCondition.visibilityConditions.length > 0)
            {
                for(let visibilityCondition of failCondition.visibilityConditions)
                {
                    visibilityCondition.id = this.generateAndSaveID(visibilityCondition.id)
                }
            }
        }
        return conditions
    }

	/**
	* Passes each part of each quests rewards object to setRewardIds.
	* @param rewards quest.rewards.
	* @returns modified quest.rewards.
	*/
    private fixQuestRewards(rewards: any): any
    {
        rewards.Fail = this.setRewardIds(rewards.Fail)
        rewards.Started = this.setRewardIds(rewards.Started)
        rewards.Success = this.setRewardIds(rewards.Success)
        return rewards
    }

	/**
	* Sets new mongo ID's to passed in quest.rewards array.
	* @param rewards quest.rewards .Started || .Success || .Fail.
	* @returns Modified quest.rewards array.
	*/
    private setRewardIds(rewards: any): any
    {
        for (let reward of rewards)
        {
            reward.id = this.generateAndSaveID(reward.id)

            if (reward.items)
            {
                reward.target = this.generateAndSaveID(reward.target)
                reward.items[0]._id = reward.target
            }
        }
        return rewards
    }

    private fixQuestAssorts(targets :any):void
    {
        for (const file of targets)
        {
            const fileTarget = this.extractName(file)

            if (!fileTarget)
            {
                this.logger.error(`Error, file not found -- ${file}`)
                return
            }
            const questPath = `../../${this.config.assortsFolderPath}/${file}`
            const questJson = require(questPath)
            const backupCopy = JSON.parse(JSON.stringify(questJson))
            this.generateBackups("quest assorts", fileTarget, backupCopy)
            questJson.started = this.setNewAssortIDs(questJson.started)
            questJson.success = this.setNewAssortIDs(questJson.success)
            questJson.fail = this.setNewAssortIDs(questJson.fail)
            let questAssortDataString = JSON.stringify(questJson)

            for(const [oldID, newID] of this.changedQuestIds.entries())
            {
                questAssortDataString = questAssortDataString.replaceAll(`"${oldID}"`, `"${newID}"`)
            }
            let modifiedQuestAssortData = JSON.parse(questAssortDataString)
            this.writeUpdatedData(questPath, modifiedQuestAssortData)
        }
    }

    private fixLocales(targets :any):void
    {
        const localesPath = "../../Virtual's Custom Quest Loader/database/locales"
        const allowedAfixes = ["name", "description", "successMessagetext", "failMessageText", "startedMessageText"]

        for (const file of targets)
        {
            for (const language of this.config.questsLocalesLanguages)
            {
                let fileTarget = this.extractName(`/${file}`)
                let languagePath = `${localesPath}/${language}/${file}`
                let localesJson = require(languagePath)
                const backupCopy = JSON.parse(JSON.stringify(localesJson))
                let newLocales = {}
                this.generateBackups("quest locales", `${fileTarget}-${language}`, backupCopy)
                
                for(let [key, value] of Object.entries(localesJson))
                {
                    let splitKey = key.split(" ")

                    if (this.validateMongo.test(splitKey[0]))
                    {
                        newLocales[key] = value
                        continue
                    }
                    let newKey :string

                    if (allowedAfixes.includes(splitKey[1]))
                    {
                        let questID = this.changedQuestIds.get(splitKey[0])
                        newKey = key.replace(/^\S+/, questID)
                    }
                    else
                    {
                        newKey = this.changedQuestIds.get(key)
                    }
                    if (newKey == undefined)
                    {
                        this.logger.error(`newKey == undefined.  key = ${key}, value = ${value}`)
                    }
                    newLocales[newKey] = value
                }                
                this.writeUpdatedData(languagePath, newLocales)
            }
        }
    }
}
module.exports = { mod: new MongoFixer() }
