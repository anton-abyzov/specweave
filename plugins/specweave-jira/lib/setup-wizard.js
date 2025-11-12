import inquirer from "inquirer";
import { credentialsManager } from "../../../src/core/credentials-manager.js";
import { JiraCredentials as JiraCredentials2 } from "../../../src/core/credentials-manager.js";
async function detectJiraCredentials() {
  if (credentialsManager.hasJiraCredentials()) {
    try {
      const credentials = credentialsManager.getJiraCredentials();
      console.log("\u2705 Found Jira credentials in .env");
      return {
        found: true,
        credentials,
        source: "env"
      };
    } catch (error) {
      return { found: false };
    }
  }
  return { found: false };
}
async function setupJiraCredentials() {
  console.log("\n\u{1F527} Jira Setup Wizard\n");
  const detected = await detectJiraCredentials();
  if (detected.found) {
    const { useExisting } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useExisting",
        message: `Found credentials in ${detected.source}. Use these credentials?`,
        default: true
      }
    ]);
    if (useExisting) {
      return detected.credentials;
    }
    console.log("\n\u{1F4DD} Enter new credentials:\n");
  } else {
    console.log("\u26A0\uFE0F  No Jira credentials found\n");
    console.log("\u{1F4DD} Let's set up your Jira connection:\n");
  }
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "setupType",
      message: "How would you like to connect to Jira?",
      choices: [
        {
          name: "Cloud (*.atlassian.net)",
          value: "cloud"
        },
        {
          name: "Server/Data Center (self-hosted)",
          value: "server"
        }
      ]
    },
    {
      type: "input",
      name: "domain",
      message: (answers2) => answers2.setupType === "cloud" ? "Jira domain (e.g., mycompany.atlassian.net):" : "Jira server URL (e.g., jira.mycompany.com):",
      validate: (value) => {
        if (!value) return "Domain is required";
        if (answers.setupType === "cloud" && !value.includes(".atlassian.net")) {
          return "Cloud domain must end with .atlassian.net";
        }
        return true;
      }
    },
    {
      type: "input",
      name: "email",
      message: "Email address:",
      validate: (value) => {
        if (!value) return "Email is required";
        if (!value.includes("@")) return "Must be a valid email";
        return true;
      }
    },
    {
      type: "password",
      name: "apiToken",
      message: "API token:",
      mask: "*",
      validate: (value) => {
        if (!value) return "API token is required";
        if (value.length < 10) return "API token seems too short";
        return true;
      }
    }
  ]);
  const credentials = {
    domain: answers.domain,
    email: answers.email,
    apiToken: answers.apiToken
  };
  console.log("\n\u{1F50D} Testing connection...");
  const isValid = await testJiraConnection(credentials);
  if (!isValid) {
    console.log("\u274C Failed to connect to Jira");
    console.log("\u{1F4A1} Please check your credentials and try again\n");
    const { retry } = await inquirer.prompt([
      {
        type: "confirm",
        name: "retry",
        message: "Would you like to try again?",
        default: true
      }
    ]);
    if (retry) {
      return setupJiraCredentials();
    }
    throw new Error("Jira connection failed");
  }
  console.log("\u2705 Connection successful!\n");
  await saveCredentialsToEnv(credentials);
  return credentials;
}
async function testJiraConnection(credentials) {
  try {
    const https = await import("https");
    const auth = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64");
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: credentials.domain,
          path: "/rest/api/3/myself",
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json"
          }
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on("error", () => resolve(false));
      req.setTimeout(5e3, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  } catch (error) {
    return false;
  }
}
async function saveCredentialsToEnv(credentials) {
  console.log("\u{1F4A1} Save credentials to .env for future use\n");
  const { saveToEnv } = await inquirer.prompt([
    {
      type: "confirm",
      name: "saveToEnv",
      message: "Save credentials to .env file?",
      default: true
    }
  ]);
  if (saveToEnv) {
    credentialsManager.saveToEnvFile({ jira: credentials });
    console.log("\u2705 Credentials saved to .env");
    console.log("\u2705 .env added to .gitignore");
  } else {
    console.log("\u26A0\uFE0F  Credentials not saved. You'll need to enter them again next time.");
  }
}
async function getJiraCredentials() {
  const detected = await detectJiraCredentials();
  if (detected.found) {
    return detected.credentials;
  }
  return setupJiraCredentials();
}
export {
  JiraCredentials2 as JiraCredentials,
  detectJiraCredentials,
  getJiraCredentials,
  setupJiraCredentials
};
