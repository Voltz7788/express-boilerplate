const inquirer = require("inquirer");
const path = require("path");
const fse = require("fs-extra");
const fs = require("fs/promises");
const { exec } = require("child_process");

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
  ]);

  return answers.projectName;
}

async function cloneTemplate(projectName) {
  const repo = resolve(__dirname, "../template");

  const targetDir = resolve(process.cwd(), projectName);

  await copy(repo, targetDir);

  return targetDir;
}

async function replacePlaceholders(targetDir, projectName) {
  const filesToReplace = [
    join(targetDir, "package.json"),
    join(targetDir, "README.md"),
    join(targetDir, "docker-compose.yaml"),
  ];

  for (const file of filesToReplace) {
    const content = await readFile(file, "utf-8");

    const newContent = content.replace(
      /project-name-placeholder/g,
      projectName
    );

    await writeFile(file, newContent, "utf-8");
  }
}

async function installDependencies(targetDir) {
  console.log(`\nInstalling dependencies in ${targetDir}...`);

  return new Promise((resolve, reject) => {
    // Run 'pnpm install' in the target directory
    exec(`pnpm install`, { cwd: targetDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing dependencies: ${stderr}`);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

async function run() {
  try {
    const projectName = await getProjectName();
    const targetDir = await cloneTemplate(projectName);

    await replacePlaceholders(targetDir, projectName);

    // Automatically run pnpm install
    await installDependencies(targetDir);

    console.log(`\nProject ${projectName} created successfully!`);
  } catch (err) {
    console.error(`Error creating project: ${err}`);
  }
}

run();
