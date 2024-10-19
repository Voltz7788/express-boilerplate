#!/usr/bin/env node

const inquirer = require("inquirer");
const path = require("path");
const fse = require("fs-extra");
const fs = require("fs/promises");
const { exec } = require("child_process");
const { mkdirSync } = require("fs-extra");

const { resolve, join } = path;
const { copy } = fse;
const { readFile, writeFile } = fs;

async function getProjectName() {
  const answers = await inquirer.default.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Enter your project name: ",
      default: "my-express-app",
    },
    {
      type: "number",
      name: "desiredPort",
      message: "Enter your desired port: ",
      default: 3010,
    },
  ]);

  return answers;
}

async function cloneTemplate(projectName) {
  const repo = resolve(__dirname, "../template");

  const targetDir = resolve(process.cwd(), projectName);

  await copy(repo, targetDir);

  return targetDir;
}

async function replacePlaceholders(targetDir, projectName, desiredPort) {
  const actualProjectTitle =
    projectName === "." ? path.basename(process.cwd()) : projectName;

  const filesToReplace = [
    join(targetDir, "package.json"),
    join(targetDir, "README.md"),
    join(targetDir, "docker-compose.yaml"),
    join(targetDir, "Dockerfile"),
  ];

  for (const file of filesToReplace) {
    const content = await readFile(file, "utf-8");

    const newContent = content
      .replace(/project-name-placeholder/g, actualProjectTitle)
      .replace(/3010/g, desiredPort);

    await writeFile(file, newContent, "utf-8");
  }

  const gitIgnoreContent = "node_modules\n.env\nlocalhost*.pem";

  const envContent = `PORT=${desiredPort}`;

  // Ensure these files are written inside the target directory
  await writeFile(join(targetDir, ".gitignore"), gitIgnoreContent, "utf-8");
  await writeFile(join(targetDir, ".env"), envContent, "utf-8");

  mkdirSync(join(targetDir, "dist"));
}

async function installDependencies(targetDir) {
  console.log(`\nInstalling dependencies in ${targetDir}...`);

  // Wrap each `exec` call in a promise
  const runCommand = (cmd) =>
    new Promise((resolve, reject) => {
      exec(cmd, { cwd: targetDir }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing "${cmd}": ${stderr}`);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });

  // Run all the commands in sequence
  try {
    await runCommand("pnpm install");
    await runCommand("git init");
    await runCommand("mkcert localhost");
    await runCommand("git add . && git commit -m 'Initial commit'");
  } catch (error) {
    console.error("Error during the setup process: ", error);
    throw error;
  }
}

async function run() {
  try {
    const answers = await getProjectName();
    const targetDir = await cloneTemplate(answers.projectName);

    await replacePlaceholders(
      targetDir,
      answers.projectName,
      answers.desiredPort
    );

    // Automatically run pnpm install
    await installDependencies(targetDir);

    console.log(`\nProject ${answers.projectName} created successfully!`);
  } catch (err) {
    console.error(`Error creating project: ${err}`);
  }
}

run();
