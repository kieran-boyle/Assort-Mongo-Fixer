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

      //Fix item ID's
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

      //Fix parent ID's
      for(let item of importedJson.items)
      {
        if(!this.validateMongo.test(item.parentId))
        {
          //let target = this.findKeyByValue(this.changedAssortIds, item.parentID)
          if(!this.changedAssortIds.get(item.parentId) && item.parentId !== "hideout")
          {
            this.logger.error(`Warning parentID of ${item._id} is not a mongoID but is not in the new list of generated ID's!  Skipping!!`)
            continue
          }
          item.parentId = this.changedAssortIds.get(item.parentId)
        }
      }
      
      this.logger.info(`${count} item ID's changed to MongoID's`)
      this.generateBackups(`changedItems/${fileTarget}`, [...this.changedAssortIds])
      this.writeUpdatedAssort(fullPath, importedJson)
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

    this.fs.appendFile(path.resolve(__dirname, `../backups/${name}/assort.json`), JSON.stringify(target, null, "\t"), (err) =>
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