#!/usr/bin/env node

const inquirer = require("inquirer");
const path = require("path");
const fse = require("fs-extra");
const fs = require("fs/promises");
const { exec } = require("child_process");
const { mkdirSync } = require("fs-extra");
const chalk = require("chalk");

const { resolve, join } = path;
const { copy } = fse;
const { readFile, writeFile } = fs;

async function getProjectName() {
  const args = process.argv.slice(2);
  const fileName = args[0];

  const answers = await inquirer.default.prompt([
    {
      type: "input",
      name: "projectName",
      message: chalk.cyan.bold("Enter your project name: "),
      default: fileName || "my-express-app",
    },
    {
      type: "number",
      name: "desiredPort",
      message: chalk.cyan.bold("Enter your desired port: "),
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

async function replacePlaceholders(targetDir, actualProjectName, desiredPort) {
  const filesToReplace = [
    join(targetDir, "package.json"),
    join(targetDir, "README.md"),
    join(targetDir, "docker-compose.yaml"),
    join(targetDir, "Dockerfile"),
  ];

  for (const file of filesToReplace) {
    const content = await readFile(file, "utf-8");

    const newContent = content
      .replace(/project-name-placeholder/g, actualProjectName)
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

// Helper function to check if pnpm is installed
async function checkPnpmInstalled() {
  return new Promise((resolve) => {
    exec("pnpm --version", (error) => {
      if (error) {
        resolve(false); // pnpm is not installed
      } else {
        resolve(true); // pnpm is installed
      }
    });
  });
}

async function installDependencies(targetDir) {
  console.log(`\nInstalling dependencies in ${targetDir}...`);

  const pnpmInstalled = await checkPnpmInstalled();
  const packageManager = pnpmInstalled ? "pnpm" : "npm";

  console.log(
    chalk.cyan.bold(`\nUsing ${packageManager} to install dependencies.\n`)
  );

  // Wrap each `exec` call in a promise
  const runCommand = (cmd) =>
    new Promise((resolve, reject) => {
      exec(cmd, { cwd: targetDir }, (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red(`Error executing "${cmd}": ${stderr}`));
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });

  // Run all the commands in sequence
  try {
    await runCommand(`${packageManager} install`);
    await runCommand("git init");
    await runCommand("git add . && git commit -m 'Initial commit'");
  } catch (error) {
    console.error(chalk.red("Error during the setup process: ", error));
    throw error;
  }
}

async function run() {
  try {
    const answers = await getProjectName();
    const targetDir = await cloneTemplate(answers.projectName);

    const actualProjectName =
      answers.projectName === "."
        ? path.basename(process.cwd())
        : answers.projectName;

    await replacePlaceholders(
      targetDir,
      actualProjectName,
      answers.desiredPort
    );

    // Automatically run pnpm install
    await installDependencies(targetDir);

    console.log(
      chalk.green.bold(`\nProject ${actualProjectName} created successfully!\n`)
    );
  } catch (err) {
    console.error(chalk.red(`Error creating project: ${err}`));
  }
}

run();
