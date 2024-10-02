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
    private changedAssortIds = new Map()
	private changedQuestIds = new Map()

    public postDBLoad(container: DependencyContainer): void
    {
        if (this.config.fixAssorts === true)
        {
            this.fixAssorts(container)
        }

        if (this.config.fixQuests === true)
        {
            this.fixQuests(container)
        }
    }

    private fixAssorts(container: DependencyContainer)
    {
        this.container = container
        this.logger = this.container.resolve<ILogger>('WinstonLogger')
        this.hashUtil = this.container.resolve<HashUtil>("HashUtil")

        for (const file of this.config.assortPaths)
        {
            const fullPath = `../../${this.config.assortsFolderPath}${file}`
            const importedJson = require(fullPath)
            const fileTarget = this.extractName(file)
            let count = 0

            if (!fileTarget)
            {
                this.logger.error(`Error, file not found -- ${file}`)
                return
            }
            this.generateBackups(fileTarget, importedJson)

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
            this.generateBackups(`changedItems`, [...this.changedAssortIds])
            importedJson.barter_scheme = this.setNewAssortIDs(importedJson.barter_scheme)
            importedJson.loyal_level_items = this.setNewAssortIDs(importedJson.loyal_level_items)
            this.writeUpdatedData(fullPath, importedJson)
        }

        // Fix quest assorts.
        if (this.config.questAssortPaths.length > 0)
        {
            for (const file of this.config.questAssortPaths)
            {
                const fileTarget = this.extractName(file)

                if (!fileTarget)
                {
                    this.logger.error(`Error, file not found -- ${file}`)
                    return
                }
                const questPath = `../../${this.config.assortsFolderPath}${file}`
                const questJson = require(questPath)
                this.generateBackups(fileTarget, questJson)
                questJson.started = this.setNewAssortIDs(questJson.started)
                questJson.success = this.setNewAssortIDs(questJson.success)
                questJson.fail = this.setNewAssortIDs(questJson.fail)
                this.writeUpdatedData(questPath, questJson)
            }
        }
    }

    private fixQuests(container: DependencyContainer)
    {
        this.container = container
        this.logger = this.container.resolve<ILogger>('WinstonLogger')
        this.hashUtil = this.container.resolve<HashUtil>("HashUtil")

        const questsPath = "../../Virtual's Custom Quest Loader/database/quests"
        for (const questJson of this.config.questsFolderPaths)
        {
            const fullPath = `${questsPath}/${questJson}`
            const importedJson = require(fullPath)
			const fileTarget = this.extractName(questJson)
			if(!fileTarget)
			{
				this.logger.error(`Error, file not found -- ${questJson}`)
				return
			}
			this.generateBackups(fileTarget, importedJson)

            for (let quest in importedJson)
            {
                let thisQuest = importedJson[quest]
                let newID: string
                if (!this.validateMongo.test(quest))
                {
                    newID = this.hashUtil.generate()
					this.changedQuestIds.set(`${quest}`, newID)
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
			this.generateBackups(`changedQuestIDs`, [...this.changedQuestIds])
			let dataString = JSON.stringify(importedJson)

			for(const [oldID, newID] of this.changedQuestIds.entries())
			{
				dataString.replace(`"${oldID}"`, `"${newID}"`)
			}
            this.writeUpdatedData(fullPath, JSON.parse(dataString))
        }
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
			let newFinishID = this.hashUtil.generate()
			this.changedQuestIds.set(`${finishCondition.id}`, newFinishID)
            finishCondition.id = newFinishID
			if(finishCondition.counter)
			{
				let newCounterID = this.hashUtil.generate()
				this.changedQuestIds.set(`${finishCondition.counter.id}`, newCounterID)
				finishCondition.counter.id = newCounterID
				for (let thisCondition of finishCondition.counter.conditions)
				{
					let newConditionID = this.hashUtil.generate()
					this.changedQuestIds.set(`${thisCondition.id}`, newConditionID)
					thisCondition.id = newConditionID
				}
			}
        }

        for (let startCondition of conditions.AvailableForStart)
        {
			let newStartID = this.hashUtil.generate()
			this.changedQuestIds.set(`${startCondition.id}`, newStartID)
            startCondition.id = newStartID
        }

        for (let failCondition of conditions.Fail)
        {
			let newFailID = this.hashUtil.generate()
			this.changedQuestIds.set(`${failCondition.id}`, newFailID)
            failCondition.id = newFailID
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
			let newRewardID = this.hashUtil.generate()
			this.changedQuestIds.set(`${reward.id}`, newRewardID)
            reward.id = newRewardID
            if (reward.items)
            {
                let itemID = this.hashUtil.generate()
				this.changedQuestIds.set(`${reward.items[0]._id}`, itemID)
                reward.items[0]._id = itemID
                reward.target = itemID
            }
        }
        return rewards
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

	/**
	* Generates a backup of provided .json in /backups.
	* @param name name for folder.
	* @param target target .json.
	*/
    private generateBackups(name: string, target: any): void
    {
        this.logger.info(`Backup generated for ${name} in /backups`)
        this.fs.mkdir(path.resolve(__dirname, `../backups/${name}`), { recursive: true }, (err) =>
        {
            if (err) throw err
        })

        this.fs.writeFile(path.resolve(__dirname, `../backups/${name}/assort.json`), JSON.stringify(target, null, "\t"), (err) =>
        {
            if (err) throw err
        })
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
}

module.exports = { mod: new MongoFixer() }
