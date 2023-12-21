import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { execSync } from "child_process";

const fs = require("fs");
const homeDir = require("os").homedir();
const instancesDir = `${homeDir}/Library/Application Support/PrismLauncher/instances`;

function getInstances() {
  return fs
    .readdirSync(instancesDir)
    .filter((file: string) => !file.startsWith(".") && fs.existsSync(`${instancesDir}/${file}/instance.cfg`))
    .map((directory: string) => ({ name: directory, key: directory }));
}

function launchInstance(instance: string) {
  console.log(`Launching ${instance}`)
  execSync("'/Applications/Prism Launcher.app/Contents/MacOS/prismlauncher'" + ` --launch ${instance}`);
}

const instances = getInstances();

export default function Command() {
  return (
    <List>
      {instances.map((instance: {key: string, name: string}) => (
        <List.Item
          key={instance.key}
          icon="minecraft.svg"
          title={instance.name}
          actions={
            <ActionPanel>
              <Action title="Launch" onAction={() => launchInstance(instance.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
