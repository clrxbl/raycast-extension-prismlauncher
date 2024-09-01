import { ActionPanel, List, Action } from "@raycast/api";
import { execSync } from "child_process";
import { useLocalStorage } from "@raycast/utils";
const ini = require("ini");
const path = require("path");
const fs = require("fs");
const homeDir = require("os").homedir();

const prismlauncherDir = `${homeDir}/Library/Application Support/PrismLauncher`;
const prismlauncherConfig = ini.parse(fs.readFileSync(`${prismlauncherDir}/prismlauncher.cfg`, "utf-8"));

const instanceDir = path.isAbsolute(prismlauncherConfig.General.InstanceDir)
  ? prismlauncherConfig.General.InstanceDir
  : `${prismlauncherDir}/${prismlauncherConfig.General.InstanceDir}`;

const iconDir = path.isAbsolute(prismlauncherConfig.General.IconsDir)
  ? prismlauncherConfig.General.IconsDir
  : `${prismlauncherDir}/${prismlauncherConfig.General.IconsDir}`;

function getInstances() {
  return fs
    .readdirSync(instanceDir)
    .filter((file: string) => !file.startsWith(".") && fs.existsSync(`${instanceDir}/${file}/instance.cfg`))
    .map((directory: string) => ({ name: directory, key: directory }));
}

function getInstanceConfig(instance: string) {
  const config = ini.parse(fs.readFileSync(`${instanceDir}/${instance}/instance.cfg`, "utf-8"));

  // Prism/MMC used to store instance configs without a [General] header, so we need to check for that
  if (!config.General) {
    return config;
  } else {
    return config.General;
  }
}

function getInstanceMetadata(instance: string) {
  const config = getInstanceConfig(instance);

  // Get name
  const name = config.name;

  // Get last launched time
  const lastLaunchTime = config.lastLaunchTime;

  // Get icon
  // https://github.com/PrismLauncher/PrismLauncher/blob/e39a03421a6e8cdf58f8b5d98388b9eef55d44b7/launcher/icons/IconUtils.cpp#L42
  const validIconExtensions = [".svg", ".png", ".ico", ".gif", ".jpg", ".jpeg"];
  // We can only display icons that are in the icon directory as Prism doesn't expose the default icons anywhere
  let icon = "minecraft.svg";

  validIconExtensions.find((extension) => {
    const iconPath = path.join(iconDir, `${config.iconKey}${extension}`);
    if (fs.existsSync(iconPath)) {
      console.log(`Found icon for ${instance}: ` + iconPath);
      icon = iconPath;
    }
  });

  return { name, lastLaunchTime, icon };
}

// This really should not be a thing but Prism doesn't allow you to use the CLI to launch more than 1 instance yet
function ensurePrismLauncherIsDead() {
  try {
    execSync("pkill prismlauncher");
  } catch (error) {
    // PrismLauncher is already dead
  }
}

function launchInstance(instance: string) {
  console.log(`Launching ${instance}`);
  ensurePrismLauncherIsDead();
  execSync("'/Applications/Prism Launcher.app/Contents/MacOS/prismlauncher'" + " --launch " + `"${instance}"`);
}

const instances = getInstances();

const sorts = {
  lastLaunched: {
    name: "Last Launched",
    sortFunction: (a: any, b: any) => {
        return getInstanceConfig(b.name).lastLaunchTime - getInstanceConfig(a.name).lastLaunchTime;
    }
  },
  name: {
    name: "A-Z",
    sortFunction: (a: any, b: any) => {
        return a.name.localeCompare(b.name);
    }
  },
  nameReverse: {
    name: "Z-A",
    sortFunction: (a: any, b: any) => {
        return b.name.localeCompare(a.name);
    }
  }
};

type SortValue = keyof typeof sorts;

const DEFAULT_SORT = "lastLaunched"

export default function Command() {
  const { value: sortBy, setValue: setSortBy, isLoading } = useLocalStorage<SortValue>("sort", DEFAULT_SORT)
  const sort = sorts[sortBy || DEFAULT_SORT];

  const sortedInstances = instances.sort(sort.sortFunction);
  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" value={sortBy} onChange={(newValue) => {
          setSortBy(newValue as SortValue)
        }}>
            {Object.entries(sorts).map(([key, { name }]) => (
                <List.Dropdown.Item key={key} title={name} value={key} />
            ))}
        </List.Dropdown>
      }
    >
      {sortedInstances.map((instance: { key: string; name: string }) => {
        const { name, icon } = getInstanceMetadata(instance.name);
        return (
          <List.Item
            key={instance.key}
            icon={icon}
            title={name}
            actions={
              <ActionPanel>
                <Action title="Launch" onAction={() => launchInstance(instance.name)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
