import { DependencyContainer } from "tsyringe"
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod"
import { ILogger } from '@spt/models/spt/utils/ILogger'
import { HashUtil  } from '@spt/models/spt/utils/HashUtil'
import path from "path"

class MongoFixer implements IPostDBLoadMod
{
  private fs = require('fs')
  private config = require("../config/config.json")
  private container: DependencyContainer
  private logger :ILogger
  private hashUtil :HashUtil
  private validateMongo = /^[a-f\d]{24}$/i
  private changedAssortIds = new Map()

  public postDBLoad(container: DependencyContainer):void
  {
    this.container = container
    this.logger = this.container.resolve<ILogger>('WinstonLogger')
    this.hashUtil = this.container.resolve<HashUtil>("HashUtil")

    for(const file of this.config.assortPaths)
    {
      const fullPath = `../../${this.config.folderPath}${file}`
      const importedJson = require(fullPath)
      const fileTarget = this.extractName(file)
      let count = 0

      if(!fileTarget)
      {
        this.logger.error(`Error, file not found -- ${file}`)
        return
      }
      this.generateBackups(fileTarget, importedJson)

      //Fix item ID's.
      for(let item of importedJson.items)
      {
        if(!this.validateMongo.test(item._id))
        {
          let newID = this.hashUtil.generate()
          this.changedAssortIds.set(item._id, newID)
          count++
          item._id = newID
        }
      }

      //Fix parent ID's.
      for(let item of importedJson.items)
      {
        if(!this.validateMongo.test(item.parentId))
        {
          item.parentId = this.changedAssortIds.get(item.parentId)
        }
      }
      this.logger.info(`${count} item ID's changed to MongoID's`)
      this.generateBackups(`changedItems`, [...this.changedAssortIds])
      importedJson.barter_scheme = this.setNewIDs(importedJson.barter_scheme)
      importedJson.loyal_level_items = this.setNewIDs(importedJson.loyal_level_items)
      this.writeUpdatedAssort(fullPath, importedJson)
    }

    //Fix quest assorts.
    if(this.config.questAssortPaths.length > 0)
    {
      for(const file of this.config.questAssortPaths)
      {
        const fileTarget = this.extractName(file)

        if(!fileTarget)
        {
          this.logger.error(`Error, file not found -- ${file}`)
          return
        }
        const questPath = `../../${this.config.folderPath}${file}`
        const questJson = require(questPath)
        this.generateBackups(fileTarget, questJson)
        questJson.started = this.setNewIDs(questJson.started)
        questJson.success = this.setNewIDs(questJson.success)
        questJson.fail = this.setNewIDs(questJson.fail)
        this.writeUpdatedAssort(questPath, questJson)
      }
    }
  }

  /**
   * Pulls the file name from provided string ending in .json.
   * @param url target filename.
   * @returns filename as string || null if not found.
   */
  private extractName(url :string):string | null
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
  private setNewIDs(inputData :any):any
  {
    let modifiedData = {}
    for(let item in inputData)
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
  private generateBackups(name :string, target :any):void
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
  private writeUpdatedAssort(target :string, data :any):void
  {
    this.fs.writeFile(path.resolve(__dirname, target), JSON.stringify(data, null, "\t"), (err) =>
    {
      if (err) throw (err)
    })
    this.logger.info(`New Id's written to ${target}`)
  }

module.exports = {mod: new MongoFixer()}