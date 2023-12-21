import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { execSync } from "child_process";

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

  return { name, icon };
}

function launchInstance(instance: string) {
  console.log(`Launching ${instance}`);
  execSync("'/Applications/Prism Launcher.app/Contents/MacOS/prismlauncher'" + ` --launch ${instance}`);
}

const instances = getInstances();

export default function Command() {
  return (
    <List>
      {instances.map((instance: { key: string; name: string }) => {
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
