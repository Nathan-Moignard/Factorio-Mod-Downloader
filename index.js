import Axios from 'axios'
import fs from 'fs'
import request from 'request'
import 'dotenv/config'

const FACTORIO_API = 'https://mods.factorio.com/api/mods/'

const userInfo = {
  username: process.env.USERNAME,
  token: process.env.TOKEN
}

async function getDependencies(info_json) {
  if (info_json.length < 3)
    return

  for (const mod of info_json) {
    const modInfo = mod.split(' ');

    if (modInfo[0].includes('?')) {
      modInfo.shift();
      console.log('optional ' + modInfo[0])
      // await getMod(modInfo[0], modInfo[modInfo.length - 1])
    } else if (modInfo[0].includes('~')) {
      modInfo.shift();
      console.log('variable ' + modInfo[0])
      await getMod(modInfo[0], modInfo[modInfo.length - 1])
    } else if (modInfo[0].includes('!')) {
      console.log('conflict ' + modInfo[0]);
    } else {
      console.log('normal ' + modInfo[0])
      await getMod(modInfo[0], modInfo[modInfo.length - 1])
    }
  }
}

async function getMod(modName, modVersion = undefined) {
  let modInfo = undefined;
  let latestRelease = undefined;

  try {
    modInfo = await Axios.get(FACTORIO_API + modName + '/full')
  } catch (error) {
    if (Axios.isAxiosError(error)) {
      console.error(error.response);
      return
    }
  }

  if (modVersion !== undefined) {
    for (const version of modInfo.data.releases) {
      if (version.version === modVersion) {
        latestRelease = version;
        break;
      }
    }
  } else {
    latestRelease = modInfo.data.releases[modInfo.data.releases.length - 1]
  }

  const zipFilePath = `./mods/${latestRelease.file_name}`;

  request(`https://mods.factorio.com${latestRelease.download_url}?username=${userInfo.username}&token=${userInfo.token}`)
    .pipe(fs.createWriteStream(zipFilePath))

  latestRelease.info_json.dependencies = latestRelease.info_json.dependencies.filter(dep => dep.split(' ')?.length >= 3)

  if (latestRelease.info_json.dependencies) {
    latestRelease.info_json.dependencies.shift();
    await getDependencies(latestRelease.info_json.dependencies);
  }
}

getMod('space-exploration');
